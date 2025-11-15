import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAuditHead, isCFO } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const bulkUnpublishSchema = z.object({
  observationIds: z.array(z.string()).min(1, "At least one observation ID is required")
});

interface ValidationError {
  observationId: string;
  error: string;
}

/**
 * RBAC v2: Bulk Unpublish Observations
 *
 * Unpublishes multiple observations in a single transaction (all-or-nothing).
 * Only CFO or the Audit Head for the observation's audit can unpublish.
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

  const role = session.user.role;
  const isCfoUser = isCFO(role);
  if (!isCfoUser) {
    assertAuditHead(role);
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const input = bulkUnpublishSchema.parse(body);

  const userId = session.user.id;

  // Load all observations
  const observations = await prisma.observation.findMany({
    where: {
      id: { in: input.observationIds }
    },
    select: {
      id: true,
      isPublished: true,
      audit: {
        select: {
          auditHeadId: true,
          isLocked: true
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
    if (!isCfoUser) {
      if (obs.audit?.auditHeadId !== userId) {
        validationErrors.push({
          observationId: obs.id,
          error: "Only the audit head for this audit can unpublish this observation"
        });
        continue;
      }

      if (obs.audit?.isLocked) {
        validationErrors.push({
          observationId: obs.id,
          error: "Audit is locked. Cannot unpublish observation."
        });
        continue;
      }
    }

    // Check if already unpublished
    if (!obs.isPublished) {
      validationErrors.push({
        observationId: obs.id,
        error: "Observation is already unpublished"
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
      // Update all observations to unpublished
      await tx.observation.updateMany({
        where: {
          id: { in: input.observationIds }
        },
        data: {
          isPublished: false
        }
      });
    });

    // After successful transaction, log audit events and send notifications
    // These are done outside the transaction as they should not cause rollback
    for (const obsId of input.observationIds) {
      // Log audit event (never throws)
      await writeAuditEvent({
        entityType: "OBSERVATION",
        entityId: obsId,
        action: "UNPUBLISH",
        actorId: userId,
        diff: {
          isPublished: {
            from: true,
            to: false
          },
          bulkOperation: true
        }
      });

      // Broadcast WebSocket notification
      notifyObservationUpdate(obsId, {
        isPublished: false,
        updatedBy: session.user.email
      });
    }

    return NextResponse.json({
      ok: true,
      unpublished: input.observationIds.length,
      message: `Successfully unpublished ${input.observationIds.length} observation(s)`
    });

  } catch (error) {
    console.error("Bulk unpublish transaction failed:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to unpublish observations. No changes were made."
    }, { status: 500 });
  }
}
