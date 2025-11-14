import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const bulkPublishSchema = z.object({
  observationIds: z.array(z.string()).min(1, "At least one observation ID is required")
});

interface ValidationError {
  observationId: string;
  error: string;
}

/**
 * RBAC v2: Bulk Publish Observations
 *
 * Publishes multiple approved observations in a single transaction (all-or-nothing).
 * Only CFO or CXO_TEAM can publish observations.
 *
 * Authorization:
 * - CFO or CXO_TEAM: Can publish any approved observation
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

  // RBAC check: Must be CFO or CXO_TEAM
  assertCFOOrCXOTeam(session.user.role);

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const input = bulkPublishSchema.parse(body);

  const userId = session.user.id;

  // Load all observations
  const observations = await prisma.observation.findMany({
    where: {
      id: { in: input.observationIds }
    },
    select: {
      id: true,
      approvalStatus: true,
      isPublished: true
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
    // Can only publish if APPROVED
    if (obs.approvalStatus !== "APPROVED") {
      validationErrors.push({
        observationId: obs.id,
        error: `Observation is not approved (status: ${obs.approvalStatus}). Only approved observations can be published.`
      });
      continue;
    }

    // Check if already published
    if (obs.isPublished) {
      validationErrors.push({
        observationId: obs.id,
        error: "Observation is already published"
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
      // Update all observations to published
      await tx.observation.updateMany({
        where: {
          id: { in: input.observationIds }
        },
        data: {
          isPublished: true
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
        action: "PUBLISH",
        actorId: userId,
        diff: {
          isPublished: {
            from: false,
            to: true
          },
          bulkOperation: true
        }
      });

      // Broadcast WebSocket notification
      notifyObservationUpdate(obsId, {
        isPublished: true,
        updatedBy: session.user.email
      });
    }

    return NextResponse.json({
      ok: true,
      published: input.observationIds.length,
      message: `Successfully published ${input.observationIds.length} observation(s)`
    });

  } catch (error) {
    console.error("Bulk publish transaction failed:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to publish observations. No changes were made."
    }, { status: 500 });
  }
}
