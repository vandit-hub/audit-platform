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
  finalPresentationDate: z.string().datetime().optional(),
  auditHeadId: z.string().min(1).optional(),
  auditorIds: z.array(z.string().min(1)).optional()
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  // Only CFO, CXO_TEAM, AUDIT_HEAD, and AUDITOR may access audit listing
  // Treat any unknown/undefined role as forbidden (defensive default)
  if (!isCFO(role) && !isCXOTeam(role) && !isAuditHead(role) && !isAuditor(role)) {
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
    // AUDIT_HEAD sees audits they lead OR are assigned to OR audits visible per visibility rules
    where.OR = [
      { auditHeadId: userId },
      { assignments: { some: { auditorId: userId } } },
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
      auditHead: { select: { id: true, name: true, email: true } },
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Apply visibility rules for AUDIT_HEAD and AUDITOR
  let filteredAudits = audits;
  if (isAuditHead(role) || isAuditor(role)) {
    filteredAudits = audits.filter((audit) => {
      // If user is assigned to this audit, always show it
      if (isAuditHead(role) && (audit.auditHeadId === userId || audit.assignments.some(a => a.auditorId === userId))) return true;
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
    purpose: a.purpose,
    visitStartDate: a.visitStartDate,
    visitEndDate: a.visitEndDate,
    status: a.status,
    isLocked: a.isLocked,
    completedAt: a.completedAt,
    createdAt: a.createdAt,
    assignments: a.assignments.map((as) => as.auditor),
    auditHead: a.auditHead ? { id: a.auditHead.id, name: a.auditHead.name, email: a.auditHead.email } : null,
    progress: { done: resolved.get(a.id) ?? 0, total: totals.get(a.id) ?? 0 }
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

  const auditorIds = Array.from(new Set(input.auditorIds ?? [])).filter(Boolean);

  if (input.auditHeadId) {
    const auditHead = await prisma.user.findUnique({
      where: { id: input.auditHeadId },
      select: { id: true, role: true }
    });
    if (!auditHead || auditHead.role !== "AUDIT_HEAD") {
      return NextResponse.json(
        { error: "auditHeadId must reference a user with role AUDIT_HEAD" },
        { status: 400 }
      );
    }
  }

  if (auditorIds.length > 0) {
    const auditors = await prisma.user.findMany({
      where: { id: { in: auditorIds } },
      select: { id: true, role: true }
    });
    const invalid = auditorIds.filter(
      (id) => !auditors.some((auditor) => auditor.id === id && auditor.role === "AUDITOR")
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "auditorIds must reference users with role AUDITOR" },
        { status: 400 }
      );
    }
  }

  const createdAudit = await prisma.$transaction(async (tx) => {
    const audit = await tx.audit.create({
    data: {
      plantId: input.plantId,
      title: input.title ?? null,
      purpose: input.purpose ?? null,
      visitStartDate: input.visitStartDate ? new Date(input.visitStartDate) : null,
      visitEndDate: input.visitEndDate ? new Date(input.visitEndDate) : null,
      visitDetails: input.visitDetails ?? null,
      managementResponseDate: input.managementResponseDate ? new Date(input.managementResponseDate) : null,
      finalPresentationDate: input.finalPresentationDate ? new Date(input.finalPresentationDate) : null,
        auditHeadId: input.auditHeadId ?? null,
      createdById: session!.user.id
      }
    });

    if (auditorIds.length > 0) {
      await tx.auditAssignment.createMany({
        data: auditorIds.map((auditorId) => ({
          auditId: audit.id,
          auditorId
        })),
        skipDuplicates: true
      });
    }

    return tx.audit.findUniqueOrThrow({
      where: { id: audit.id },
      include: {
        plant: true,
        auditHead: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            auditor: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: createdAudit.id,
    action: 'CREATED',
    actorId: session!.user.id,
    diff: {
      plantId: input.plantId,
      title: input.title,
      auditHeadId: input.auditHeadId,
      auditorIds
    }
  });

  return NextResponse.json({
    ok: true,
    audit: createdAudit,
    progress: { done: 0, total: 0 }
  });
}