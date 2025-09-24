import { EntityType, Prisma } from "@prisma/client";
import { prisma } from "./db";

type AuditEventInput = {
  entityType: EntityType | keyof typeof EntityType | string;
  entityId: string;
  action: string;
  diff?: unknown;
  actorId?: string | null;
};

function normalizeEntityType(value: AuditEventInput["entityType"]): EntityType {
  if (typeof value === "string") {
    const match = (Object.values(EntityType) as string[]).find((entry) => entry === value);
    if (match) return match as EntityType;
  }
  return value as EntityType;
}

function serializeDiff(diff: unknown): Prisma.InputJsonValue | undefined {
  if (diff === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(diff)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

export async function writeAuditEvent(input: AuditEventInput) {
  try {
    const entityType = normalizeEntityType(input.entityType);
    const diff = serializeDiff(input.diff);
    await prisma.auditEvent.create({
      data: {
        entityType,
        entityId: input.entityId,
        action: input.action,
        diff,
        actorId: input.actorId ?? null
      }
    });
  } catch (err) {
    // never throw from audit trail in MVP
    console.error("auditTrail error:", err);
  }
}
