import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam, isCFO, isCXOTeam, isAuditHead, isAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  plantId: z.string().min(1),
  title: z.string().optional(),
  purpose: z.string().optional(),
  visitStartDate: z.string().datetime().optional(),
  visitEndDate: z.string().datetime().optional(),
  visitDetails: z.string().optional(),
  managementResponseDate: z.string().datetime().optional(),
  finalPresentationDate: z.string().datetime().optional()
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  // AUDITEE and GUEST have no access to audit listing
  if (role === "AUDITEE" || role === "GUEST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const status = searchParams.get("status") || undefined;

  // Build base where clause
  const where: any = {
    plantId,
    status: status ? (status as any) : undefined
  };

  // Apply role-based filtering
  if (isCFO(role) || isCXOTeam(role)) {
    // CFO and CXO_TEAM see all audits - no additional filters
  } else if (isAuditHead(role)) {
    // AUDIT_HEAD sees audits they lead OR audits visible per visibility rules
    where.OR = [
      { auditHeadId: userId },
      // Historical audits will be filtered below based on visibilityRules
    ];
  } else if (isAuditor(role)) {
    // AUDITOR sees assigned audits OR audits visible per visibility rules
    where.OR = [
      { assignments: { some: { auditorId: userId } } },
      // Historical audits will be filtered below based on visibilityRules
    ];
  }

  const audits = await prisma.audit.findMany({
    where,
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Apply visibility rules for AUDIT_HEAD and AUDITOR
  let filteredAudits = audits;
  if (isAuditHead(role) || isAuditor(role)) {
    filteredAudits = audits.filter((audit) => {
      // If user is assigned to this audit, always show it
      if (isAuditHead(role) && audit.auditHeadId === userId) return true;
      if (isAuditor(role) && audit.assignments.some(a => a.auditorId === userId)) return true;

      // Otherwise, check visibility rules
      const rules = audit.visibilityRules;
      if (!rules) return false; // No rules = hide by default

      if (rules === "show_all") return true;
      if (rules === "hide_all") return false;
      if (rules === "last_12m") {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        return audit.createdAt >= twelveMonthsAgo;
      }
      if (typeof rules === "object" && "explicit" in rules) {
        const explicit = rules as { explicit: { auditIds: string[] } };
        return explicit.explicit.auditIds.includes(audit.id);
      }

      return false; // Unknown rule format = hide
    });
  }

  // Progress from observations: group counts by auditId and status
  const auditIds = filteredAudits.map(a => a.id);
  const grouped = auditIds.length
    ? await prisma.observation.groupBy({
        by: ["auditId", "currentStatus"],
        where: { auditId: { in: auditIds } },
        _count: { _all: true }
      })
    : [];

  const totals = new Map<string, number>();
  const resolved = new Map<string, number>();
  for (const g of grouped) {
    totals.set(g.auditId, (totals.get(g.auditId) ?? 0) + g._count._all);
    if (g.currentStatus === "RESOLVED") {
      resolved.set(g.auditId, (resolved.get(g.auditId) ?? 0) + g._count._all);
    }
  }

  const shaped = filteredAudits.map((a) => ({
    id: a.id,
    plant: a.plant,
    title: a.title,
    visitStartDate: a.visitStartDate,
    visitEndDate: a.visitEndDate,
    status: a.status,
    createdAt: a.createdAt,
    assignments: a.assignments.map((as) => as.auditor),
    progress: { done: resolved.get(a.id) ?? 0, total: totals.get(a.id) ?? 0 },
    isLocked: a.isLocked,
    completedAt: a.completedAt
  }));

  return NextResponse.json({ ok: true, audits: shaped });
}

export async function POST(req: NextRequest) {
  const session = await auth();

  try {
    assertCFOOrCXOTeam(session?.user?.role);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Forbidden" },
      { status: err.status || 403 }
    );
  }

  const body = await req.json();
  const input = createSchema.parse(body);

  const audit = await prisma.audit.create({
    data: {
      plantId: input.plantId,
      title: input.title ?? null,
      purpose: input.purpose ?? null,
      visitStartDate: input.visitStartDate ? new Date(input.visitStartDate) : null,
      visitEndDate: input.visitEndDate ? new Date(input.visitEndDate) : null,
      visitDetails: input.visitDetails ?? null,
      managementResponseDate: input.managementResponseDate ? new Date(input.managementResponseDate) : null,
      finalPresentationDate: input.finalPresentationDate ? new Date(input.finalPresentationDate) : null,
      createdById: session!.user.id
    },
    include: { plant: true }
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: audit.id,
    action: 'CREATED',
    actorId: session!.user.id,
    diff: { plantId: input.plantId, title: input.title }
  });

  return NextResponse.json({ ok: true, audit });
}