import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isCFO, assertAuditHead } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const rejectSchema = z.object({
  comment: z.string().optional()
});

/**
 * RBAC v2: Reject Observation
 *
 * Transitions an observation from SUBMITTED to REJECTED state.
 * Rejection keeps the observation in REJECTED until the auditor edits and resubmits it.
 * Only AUDIT_HEAD for the specific audit can reject (CFO can override).
 *
 * Authorization:
 * - CFO: Always allowed (short-circuit)
 * - AUDIT_HEAD: Only if audit.auditHeadId = user.id
 * - All others: 403 Forbidden
 *
 * Blocked by:
 * - Audit lock (unless CFO)
 * - Observation not in SUBMITTED status
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Parse optional comment from request body
  const body = await req.json().catch(() => ({}));
  const input = rejectSchema.parse(body);

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

  // RBAC v2: Authorization check
  // CFO can always reject (short-circuit)
  if (!isCFO(role)) {
    // Must be AUDIT_HEAD role
    assertAuditHead(role);

    // Must be the audit head for this specific audit
    if (obs.audit.auditHeadId !== session.user.id) {
      return NextResponse.json({
        ok: false,
        error: "Only the audit head for this audit can reject observations"
      }, { status: 403 });
    }

    // Audit lock check (CFO already bypassed above)
    if (obs.audit.isLocked) {
      return NextResponse.json({
        ok: false,
        error: "Audit is locked. Cannot reject observation."
      }, { status: 403 });
    }
  }

  // Check current approval status - can only reject if SUBMITTED
  if (obs.approvalStatus === "DRAFT") {
    return NextResponse.json({
      ok: false,
      error: "Cannot reject a draft observation. It has not been submitted yet."
    }, { status: 400 });
  }

  if (obs.approvalStatus === "REJECTED") {
    return NextResponse.json({
      ok: false,
      error: "Observation is already rejected"
    }, { status: 400 });
  }

  if (obs.approvalStatus === "APPROVED") {
    return NextResponse.json({
      ok: false,
      error: "Cannot reject an approved observation. Use change request workflow if needed."
    }, { status: 400 });
  }

  // Update observation to REJECTED status
  const updated = await prisma.observation.update({
    where: { id },
    data: {
      approvalStatus: "REJECTED"
    }
  });

  // Create Approval record with rejection comment
  await prisma.approval.create({
    data: {
      observationId: id,
      status: "REJECTED",
      actorId: session.user.id,
      comment: input.comment || null
    }
  });

  // Log audit event with rejection reason
  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "REJECT",
    actorId: session.user.id,
    diff: {
      approvalStatus: {
        from: "SUBMITTED",
        to: "REJECTED"
      },
      comment: input.comment
    }
  });

  // Broadcast WebSocket notification
  notifyObservationUpdate(id, {
    approvalStatus: "REJECTED",
    updatedBy: session.user.email
  });

  return NextResponse.json({
    ok: true,
    observation: updated
  });
}
