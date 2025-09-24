import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

/** Read the most recently redeemed invite's scope for a user (if any). */
export async function getUserScope(userId: string) {
  const invite = await prisma.guestInvite.findFirst({
    where: { redeemedById: userId },
    orderBy: { redeemedAt: "desc" }
  });
  return (invite?.scope as any) ?? null;
}

/** Build a Prisma where clause (OR) for observation scope. */
export function buildScopeWhere(
  scope: any
): Prisma.ObservationWhereInput | null {
  const or: Prisma.ObservationWhereInput[] = [];
  if (scope?.observationIds?.length) {
    or.push({ id: { in: scope.observationIds as string[] } });
  }
  if (scope?.auditIds?.length) {
    or.push({ auditId: { in: scope.auditIds as string[] } });
  }
  return or.length ? { OR: or } : null;
}

/** Check if a given observation is inside the provided scope. */
export function isObservationInScope(
  obs: { id: string; auditId: string },
  scope: any
) {
  if (!scope) return false;
  const obsIds: string[] = Array.isArray(scope.observationIds)
    ? scope.observationIds
    : [];
  const audIds: string[] = Array.isArray(scope.auditIds) ? scope.auditIds : [];
  return obsIds.includes(obs.id) || audIds.includes(obs.auditId);
}