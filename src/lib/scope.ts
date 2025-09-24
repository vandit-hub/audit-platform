import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export type ObservationScope = {
  observationIds?: string[];
  auditIds?: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isObservationScopeJson(value: Prisma.JsonValue | null | undefined): value is ObservationScope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.observationIds !== undefined && !isStringArray(candidate.observationIds)) return false;
  if (candidate.auditIds !== undefined && !isStringArray(candidate.auditIds)) return false;
  return true;
}

/** Read the most recently redeemed invite's scope for a user (if any). */
export async function getUserScope(userId: string): Promise<ObservationScope | null> {
  const invite = await prisma.guestInvite.findFirst({
    where: { redeemedById: userId },
    orderBy: { redeemedAt: "desc" }
  });
  if (isObservationScopeJson(invite?.scope)) {
    return invite.scope;
  }
  return null;
}

/** Build a Prisma where clause (OR) for observation scope. */
export function buildScopeWhere(scope: ObservationScope | null | undefined): Prisma.ObservationWhereInput | null {
  if (!scope) return null;
  const or: Prisma.ObservationWhereInput[] = [];
  if (scope.observationIds && scope.observationIds.length > 0) {
    or.push({ id: { in: scope.observationIds } });
  }
  if (scope.auditIds && scope.auditIds.length > 0) {
    or.push({ auditId: { in: scope.auditIds } });
  }
  return or.length ? { OR: or } : null;
}

/** Check if a given observation is inside the provided scope. */
export function isObservationInScope(
  obs: { id: string; auditId: string },
  scope: ObservationScope | null | undefined
) {
  if (!scope) return false;
  const obsIds = scope.observationIds ?? [];
  const auditIds = scope.auditIds ?? [];
  return obsIds.includes(obs.id) || auditIds.includes(obs.auditId);
}
