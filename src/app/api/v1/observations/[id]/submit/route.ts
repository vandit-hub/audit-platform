import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAuditorOrAuditHead, isCFO, isAuditHead } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

/**
 * RBAC v2: Submit Observation for Approval
 *
 * Transitions an observation from DRAFT/REJECTED to SUBMITTED state.
 * Only AUDITOR and AUDIT_HEAD can submit (CFO can override).
 *
 * Authorization:
 * - AUDITOR: Must have AuditAssignment to parent audit
 * - AUDIT_HEAD: Must be audit.auditHeadId OR have AuditAssignment
 * - CFO: Always allowed (short-circuit)
 *
 * Blocked by:
 * - Audit lock (unless CFO)
 * - Already SUBMITTED or APPROVED status
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Assert role is AUDITOR, AUDIT_HEAD, or CFO
  assertAuditorOrAuditHead(session.user.role);

  const role = session.user.role;

  // Load observation with parent audit
  const obs = await prisma.observation.findUnique({
    where: { id },
    include: {
      audit: {
        select: {
          id: true,
          isLocked: true,
          auditHeadId: true
        }
      }
    }
  });

  if (!obs) return NextResponse.json({ ok: false, error: "Observation not found" }, { status: 404 });

  // RBAC v2: Audit lock check - CFO can override
  if (obs.audit.isLocked && !isCFO(role)) {
    return NextResponse.json({
      ok: false,
      error: "Audit is locked. Cannot submit observation."
    }, { status: 403 });
  }

  // RBAC v2: Verify user has permission to submit this observation
  if (!isCFO(role)) {
    if (isAuditHead(role)) {
      // Audit Head: Must be the audit head OR have an assignment
      const isAuditHeadForThisAudit = obs.audit.auditHeadId === session.user.id;
      const hasAssignment = await prisma.auditAssignment.findFirst({
        where: { auditId: obs.auditId, auditorId: session.user.id }
      });

      if (!isAuditHeadForThisAudit && !hasAssignment) {
        return NextResponse.json({
          ok: false,
          error: "You are not assigned to this audit"
        }, { status: 403 });
      }
    } else {
      // Auditor: Must have AuditAssignment
      const assignment = await prisma.auditAssignment.findFirst({
        where: { auditId: obs.auditId, auditorId: session.user.id }
      });

      if (!assignment) {
        return NextResponse.json({
          ok: false,
          error: "You are not assigned to this audit"
        }, { status: 403 });
      }
    }
  }

  // Check current approval status - can only submit if DRAFT or REJECTED
  if (obs.approvalStatus === "SUBMITTED") {
    return NextResponse.json({
      ok: false,
      error: "Observation is already submitted"
    }, { status: 400 });
  }

  if (obs.approvalStatus === "APPROVED") {
    return NextResponse.json({
      ok: false,
      error: "Observation is already approved. Use change request workflow if needed."
    }, { status: 400 });
  }

  // Update observation to SUBMITTED status
  const updated = await prisma.observation.update({
    where: { id },
    data: {
      approvalStatus: "SUBMITTED"
    }
  });

  // Create Approval record
  await prisma.approval.create({
    data: {
      observationId: id,
      status: "SUBMITTED",
      actorId: session.user.id,
      comment: null
    }
  });

  // Log audit event
  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "SUBMIT",
    actorId: session.user.id,
    diff: {
      approvalStatus: {
        from: obs.approvalStatus,
        to: "SUBMITTED"
      }
    }
  });

  // Broadcast WebSocket notification
  notifyObservationUpdate(id, {
    approvalStatus: "SUBMITTED",
    updatedBy: session.user.email
  });

  return NextResponse.json({
    ok: true,
    observation: updated
  });
}
