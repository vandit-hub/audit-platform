import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isCFO, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { getUserScope, isObservationInScope } from "@/lib/scope";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const updateSchema = z.object({
  // Auditor-editable
  observationText: z.string().optional(),
  risksInvolved: z.string().nullable().optional(),
  riskCategory: z.enum(["A", "B", "C"]).nullable().optional(),
  likelyImpact: z.enum(["LOCAL", "ORG_WIDE"]).nullable().optional(),
  concernedProcess: z.enum(["O2C", "P2P", "R2R", "INVENTORY"]).nullable().optional(),
  auditorPerson: z.string().nullable().optional(),

  // Auditee-editable
  auditeePersonTier1: z.string().nullable().optional(),
  auditeePersonTier2: z.string().nullable().optional(),
  auditeeFeedback: z.string().nullable().optional(),
  auditorResponseToAuditee: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  personResponsibleToImplement: z.string().nullable().optional(),
  currentStatus: z.enum(["PENDING_MR", "MR_UNDER_REVIEW", "REFERRED_BACK", "OBSERVATION_FINALISED", "RESOLVED"]).optional()
});

// RBAC v2 field-level permissions
const AUDITOR_FIELDS = new Set([
  "observationText",
  "risksInvolved",
  "riskCategory",
  "likelyImpact",
  "concernedProcess",
  "auditorPerson"
]);

const AUDITEE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "targetDate",
  "personResponsibleToImplement",
  "currentStatus"
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;

  const noteWhere =
    isAuditee(role) || isGuest(role) ? { visibility: "ALL" as const } : undefined;

  const o = await prisma.observation.findUnique({
    where: { id },
    include: {
      plant: true,
      audit: {
        select: {
          id: true,
          visitStartDate: true,
          visitEndDate: true,
          auditHeadId: true,
          isLocked: true
        }
      },
      attachments: true,
      approvals: {
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "desc" }
      },
      notes: {
        where: noteWhere as any,
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" }
      },
      actionPlans: {
        orderBy: { createdAt: "asc" }
      },
      assignments: {
        include: { auditee: { select: { id: true, email: true, name: true } } }
      }
    }
  });

  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // RBAC v2: Check permissions based on role
  // CFO and CXO_TEAM can access all observations
  if (isCFO(role) || role === "CXO_TEAM") {
    return NextResponse.json({ ok: true, observation: o });
  }
  // AUDIT_HEAD can access if they are the audit head OR have an assignment
  else if (isAuditHead(role)) {
    const isAuditHeadForThisAudit = o.audit.auditHeadId === session.user.id;
    const hasAssignment = await prisma.auditAssignment.findFirst({
      where: { auditId: o.auditId, auditorId: session.user.id }
    });
    if (!isAuditHeadForThisAudit && !hasAssignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }
  // AUDITOR can only access observations from audits they're assigned to
  else if (isAuditor(role)) {
    const assignment = await prisma.auditAssignment.findFirst({
      where: { auditId: o.auditId, auditorId: session.user.id }
    });
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }
  // AUDITEE can access if they have an ObservationAssignment
  else if (isAuditee(role)) {
    const assignment = o.assignments.find(a => a.auditeeId === session.user.id);
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }
  // GUEST uses scope-based filtering
  else if (isGuest(role)) {
    const scope = await getUserScope(session.user.id);
    const allowed = isObservationInScope({ id: o.id, auditId: o.audit.id }, scope) ||
      (o.approvalStatus === "APPROVED" && o.isPublished);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true, observation: o });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const input = updateSchema.parse(body);

  const orig = await prisma.observation.findUnique({
    where: { id },
    include: {
      audit: {
        select: {
          id: true,
          isLocked: true,
          auditHeadId: true
        }
      },
      assignments: {
        select: { auditeeId: true }
      }
    }
  });

  if (!orig) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const role = session.user.role;

  // RBAC v2: Audit lock check - CFO can override, all others blocked
  if (orig.audit.isLocked && !isCFO(role)) {
    return NextResponse.json({
      ok: false,
      error: "Audit is locked. No modifications allowed."
    }, { status: 403 });
  }

  // RBAC v2: Determine allowed fields based on role and approval status
  let allowedFields: Set<string>;

  // CFO can edit all fields (short-circuit)
  if (isCFO(role)) {
    allowedFields = new Set([...AUDITOR_FIELDS, ...AUDITEE_FIELDS]);
  }
  // AUDIT_HEAD: Check they are the audit head OR have an assignment
  else if (isAuditHead(role)) {
    const isAuditHeadForThisAudit = orig.audit.auditHeadId === session.user.id;
    const hasAssignment = await prisma.auditAssignment.findFirst({
      where: { auditId: orig.auditId, auditorId: session.user.id }
    });

    if (!isAuditHeadForThisAudit && !hasAssignment) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Audit heads can edit auditor fields only when DRAFT or REJECTED
    if (orig.approvalStatus === "DRAFT" || orig.approvalStatus === "REJECTED") {
      allowedFields = AUDITOR_FIELDS;
    } else {
      return NextResponse.json({
        ok: false,
        error: "Can only edit auditor fields when observation is DRAFT or REJECTED"
      }, { status: 403 });
    }
  }
  // AUDITOR: Check they have an assignment to the audit
  else if (isAuditor(role)) {
    const assignment = await prisma.auditAssignment.findFirst({
      where: { auditId: orig.auditId, auditorId: session.user.id }
    });

    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Auditors can edit auditor fields only when DRAFT or REJECTED
    if (orig.approvalStatus === "DRAFT" || orig.approvalStatus === "REJECTED") {
      allowedFields = AUDITOR_FIELDS;
    } else {
      return NextResponse.json({
        ok: false,
        error: "Can only edit auditor fields when observation is DRAFT or REJECTED"
      }, { status: 403 });
    }
  }
  // AUDITEE: Check they have an ObservationAssignment
  else if (isAuditee(role)) {
    const hasAssignment = orig.assignments.some(a => a.auditeeId === session.user.id);

    if (!hasAssignment) {
      return NextResponse.json({
        ok: false,
        error: "You are not assigned to this observation"
      }, { status: 403 });
    }

    // Auditees can edit auditee fields even when APPROVED (as long as audit not locked)
    allowedFields = AUDITEE_FIELDS;
  }
  // Other roles (CXO_TEAM, GUEST) cannot edit observations
  else {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Check field-level locks (applies to all except CFO)
  const locked = new Set<string>(Array.isArray((orig.lockedFields as any) ?? []) ? ((orig.lockedFields as any) as string[]) : []);

  // Build update data with allowed fields only
  const data: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (allowedFields.has(k)) {
      // Check if field is locked (CFO bypasses this check)
      if (!isCFO(role) && locked.has(k)) {
        return NextResponse.json({ ok: false, error: `Field "${k}" is locked` }, { status: 403 });
      }

      // Handle targetDate conversion
      if (k === "targetDate") {
        data[k] = v === null ? null : v ? new Date(v as string) : undefined;
      } else {
        data[k] = v;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No permitted fields to update" }, { status: 400 });
  }

  // Auto-transition: When auditee provides feedback and status is PENDING_MR, change to MR_UNDER_REVIEW
  if (isAuditee(role) && data.auditeeFeedback && orig.currentStatus === "PENDING_MR") {
    data.currentStatus = "MR_UNDER_REVIEW";
  }

  const updated = await prisma.observation.update({
    where: { id },
    data
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "UPDATE",
    actorId: session.user.id,
    diff: { before: orig, after: updated, fields: Object.keys(data) }
  });

  // Broadcast WebSocket update
  notifyObservationUpdate(id, { fields: Object.keys(data), updatedBy: session.user.email });

  return NextResponse.json({ ok: true, observation: updated });
}

/**
 * RBAC v2: Delete Observation
 *
 * Deletes an observation from the database.
 * Cascade deletes will automatically remove related records (attachments, approvals, assignments, notes, action plans).
 *
 * Authorization:
 * - CFO: Always allowed regardless of audit lock status
 * - AUDIT_HEAD: Only if audit.auditHeadId = user.id AND audit is NOT locked
 * - All others: 403 Forbidden
 *
 * Blocked by:
 * - Audit lock (unless CFO)
 * - User is not CFO or the designated audit head
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  // Load observation with parent audit (need data before deletion for audit trail)
  const obs = await prisma.observation.findUnique({
    where: { id },
    include: {
      audit: {
        select: {
          id: true,
          isLocked: true,
          auditHeadId: true,
          title: true
        }
      },
      plant: {
        select: { id: true, name: true }
      }
    }
  });

  if (!obs) return NextResponse.json({ ok: false, error: "Observation not found" }, { status: 404 });

  // RBAC v2: Authorization check
  // CFO can always delete (short-circuit)
  if (!isCFO(role)) {
    // Only AUDIT_HEAD can delete (in addition to CFO)
    if (!isAuditHead(role)) {
      return NextResponse.json({
        ok: false,
        error: "Only CFO or Audit Head can delete observations"
      }, { status: 403 });
    }

    // Must be the audit head for this specific audit
    if (obs.audit.auditHeadId !== session.user.id) {
      return NextResponse.json({
        ok: false,
        error: "Only the audit head for this audit can delete observations"
      }, { status: 403 });
    }

    // Audit must not be locked (CFO already bypassed above)
    if (obs.audit.isLocked) {
      return NextResponse.json({
        ok: false,
        error: "Audit is locked. Cannot delete observation."
      }, { status: 403 });
    }
  }

  // Delete the observation (cascade deletes will handle related records)
  await prisma.observation.delete({
    where: { id }
  });

  // Log audit event with observation data before deletion
  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "DELETE",
    actorId: session.user.id,
    diff: {
      observation: {
        id: obs.id,
        auditId: obs.auditId,
        auditTitle: obs.audit.title,
        plantId: obs.plantId,
        plantName: obs.plant.name,
        observationText: obs.observationText,
        approvalStatus: obs.approvalStatus,
        riskCategory: obs.riskCategory
      }
    }
  });

  // Note: WebSocket notification for deletion could be added here if needed
  // notifyObservationUpdate(id, { deleted: true, updatedBy: session.user.email });

  return NextResponse.json({
    ok: true,
    message: "Observation deleted successfully"
  });
}