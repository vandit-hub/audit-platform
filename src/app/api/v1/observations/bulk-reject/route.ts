import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isCFO, assertAuditHead } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const bulkRejectSchema = z.object({
  observationIds: z.array(z.string()).min(1, "At least one observation ID is required"),
  comment: z.string().optional()
});

interface ValidationError {
  observationId: string;
  error: string;
}

/**
 * RBAC v2: Bulk Reject Observations
 *
 * Rejects multiple observations in a single transaction (all-or-nothing).
 * Rejection sends observations back to DRAFT so auditors can make changes and resubmit.
 * Only AUDIT_HEAD for the specific audits can reject (CFO can override).
 *
 * Authorization:
 * - CFO: Always allowed for all observations
 * - AUDIT_HEAD: Only for observations in audits they lead
 * - All others: 403 Forbidden
 *
 * Transaction behavior:
 * - Validates ALL observations before making any changes
 * - If ANY validation fails, entire operation is cancelled
 * - If all validations pass, all observations are updated in a transaction
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const input = bulkRejectSchema.parse(body);

  const role = session.user.role;
  const userId = session.user.id;
  const isCFOUser = isCFO(role);

  // If not CFO, must be AUDIT_HEAD
  if (!isCFOUser) {
    assertAuditHead(role);
  }

  // Load all observations with their parent audits
  const observations = await prisma.observation.findMany({
    where: {
      id: { in: input.observationIds }
    },
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

  // Check if all observations were found
  if (observations.length !== input.observationIds.length) {
    const foundIds = observations.map(o => o.id);
    const missingIds = input.observationIds.filter(id => !foundIds.includes(id));
    return NextResponse.json({
      ok: false,
      error: `Observations not found: ${missingIds.join(", ")}`
    }, { status: 404 });
  }

  // Validate all observations before making any changes (all-or-nothing)
  const validationErrors: ValidationError[] = [];

  for (const obs of observations) {
    // RBAC check: CFO can reject any observation
    if (!isCFOUser) {
      // Must be the audit head for this specific audit
      if (obs.audit.auditHeadId !== userId) {
        validationErrors.push({
          observationId: obs.id,
          error: "Only the audit head for this audit can reject this observation"
        });
        continue;
      }

      // Audit lock check (CFO already bypassed)
      if (obs.audit.isLocked) {
        validationErrors.push({
          observationId: obs.id,
          error: "Audit is locked. Cannot reject observation."
        });
        continue;
      }
    }

    // Check approval status - can only reject if SUBMITTED
    if (obs.approvalStatus === "DRAFT") {
      validationErrors.push({
        observationId: obs.id,
        error: "Cannot reject a draft observation. It has not been submitted yet."
      });
      continue;
    }

    if (obs.approvalStatus === "REJECTED") {
      validationErrors.push({
        observationId: obs.id,
        error: "Observation is already rejected"
      });
      continue;
    }

    if (obs.approvalStatus === "APPROVED") {
      validationErrors.push({
        observationId: obs.id,
        error: "Cannot reject an approved observation. Use change request workflow if needed."
      });
      continue;
    }
  }

  // If any validation failed, return all errors and don't proceed
  if (validationErrors.length > 0) {
    return NextResponse.json({
      ok: false,
      error: "Validation failed for one or more observations",
      validationErrors
    }, { status: 400 });
  }

  // All validations passed - perform bulk update in transaction
  try {
    await prisma.$transaction(async (tx) => {
      // Update all observations to REJECTED
      await tx.observation.updateMany({
        where: {
          id: { in: input.observationIds }
        },
        data: {
          approvalStatus: "REJECTED"
        }
      });

      // Create approval records for each observation with rejection comment
      const approvalRecords = input.observationIds.map(obsId => ({
        observationId: obsId,
        status: "REJECTED" as const,
        actorId: userId,
        comment: input.comment || null
      }));

      await tx.approval.createMany({
        data: approvalRecords
      });
    });

    // After successful transaction, log audit events and send notifications
    // These are done outside the transaction as they should not cause rollback
    for (const obsId of input.observationIds) {
      // Log audit event (never throws)
      await writeAuditEvent({
        entityType: "OBSERVATION",
        entityId: obsId,
        action: "REJECT",
        actorId: userId,
        diff: {
          approvalStatus: {
            from: "SUBMITTED",
            to: "REJECTED"
          },
          comment: input.comment,
          bulkOperation: true
        }
      });

      // Broadcast WebSocket notification
      notifyObservationUpdate(obsId, {
        approvalStatus: "REJECTED",
        updatedBy: session.user.email
      });
    }

    return NextResponse.json({
      ok: true,
      rejected: input.observationIds.length,
      message: `Successfully rejected ${input.observationIds.length} observation(s)`
    });

  } catch (error) {
    console.error("Bulk reject transaction failed:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to reject observations. No changes were made."
    }, { status: 500 });
  }
}
