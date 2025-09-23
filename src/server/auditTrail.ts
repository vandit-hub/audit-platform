import { EntityType } from "@prisma/client";
import { prisma } from "./db";

type AuditEventInput = {
  entityType: EntityType | keyof typeof EntityType | string;
  entityId: string;
  action: string;
  diff?: unknown;
  actorId?: string | null;
};

export async function writeAuditEvent(input: AuditEventInput) {
  try {
    await prisma.auditEvent.create({
      data: {
        entityType: input.entityType as any,
        entityId: input.entityId,
        action: input.action,
        diff: input.diff as any,
        actorId: input.actorId ?? null
      }
    });
  } catch (err) {
    // never throw from audit trail in MVP
    console.error("auditTrail error:", err);
  }
}