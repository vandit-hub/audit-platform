import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam, isCFO, isCXOTeam, isAuditHead, isAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  visitStartDate: z.string().datetime().nullable().optional(),
  visitEndDate: z.string().datetime().nullable().optional(),
  visitDetails: z.string().nullable().optional(),
  managementResponseDate: z.string().datetime().nullable().optional(),
  finalPresentationDate: z.string().datetime().nullable().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "SUBMITTED", "SIGNED_OFF"]).optional(),
  reportSubmittedAt: z.string().datetime().nullable().optional(),
  signOffAt: z.string().datetime().nullable().optional(),
  auditHeadId: z.string().nullable().optional()
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true, role: true } } } },
      auditHead: { select: { id: true, name: true, email: true, role: true } }
    }
  });

  if (!audit) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Apply role-based access control
  if (isCFO(role) || isCXOTeam(role)) {
    // CFO and CXO_TEAM can view all audits - allow access
  } else if (isAuditHead(role)) {
    // AUDIT_HEAD can view if they lead this audit OR are assigned as auditor
    const isAuditHeadForThisAudit = audit.auditHeadId === userId;
    const hasAssignment = audit.assignments.some(a => a.auditorId === userId);
    if (!isAuditHeadForThisAudit && !hasAssignment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (isAuditor(role) && audit.assignments.some(a => a.auditorId === userId)) {
    // AUDITOR can view if assigned to this audit - allow access
  } else {
    // Otherwise deny access
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [total, done] = await Promise.all([
    prisma.observation.count({ where: { auditId: id } }),
    prisma.observation.count({ where: { auditId: id, currentStatus: "RESOLVED" } })
  ]);

  return NextResponse.json({
    ok: true,
    audit,
    progress: { done, total }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  try {
    assertCFOOrCXOTeam(session?.user?.role);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Forbidden" },
      { status: err.status || 403 }
    );
  }

  // Check if audit is locked
  const existing = await prisma.audit.findUnique({
    where: { id },
    select: { isLocked: true }
  });

  if (!existing) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (existing.isLocked && !isCFO(session?.user?.role)) {
    return NextResponse.json({ error: "Audit is locked" }, { status: 403 });
  }

  const body = await req.json();
  const input = updateSchema.parse(body);

  const updated = await prisma.audit.update({
    where: { id },
    data: {
      title: input.title === undefined ? undefined : input.title,
      purpose: input.purpose === undefined ? undefined : input.purpose,
      visitStartDate: input.visitStartDate === undefined ? undefined : input.visitStartDate ? new Date(input.visitStartDate) : null,
      visitEndDate: input.visitEndDate === undefined ? undefined : input.visitEndDate ? new Date(input.visitEndDate) : null,
      visitDetails: input.visitDetails === undefined ? undefined : input.visitDetails,
      managementResponseDate: input.managementResponseDate === undefined ? undefined : input.managementResponseDate ? new Date(input.managementResponseDate) : null,
      finalPresentationDate: input.finalPresentationDate === undefined ? undefined : input.finalPresentationDate ? new Date(input.finalPresentationDate) : null,
      status: input.status,
      reportSubmittedAt:
        input.reportSubmittedAt === undefined ? undefined : input.reportSubmittedAt ? new Date(input.reportSubmittedAt) : null,
      signOffAt:
        input.signOffAt === undefined ? undefined : input.signOffAt ? new Date(input.signOffAt) : null,
      auditHeadId: input.auditHeadId === undefined ? undefined : input.auditHeadId
    }
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: id,
    action: 'UPDATED',
    actorId: session!.user.id,
    diff: input
  });

  return NextResponse.json({ ok: true, audit: updated });
}