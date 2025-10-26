/**
 * RBAC Query Functions for Agent MVP
 *
 * These functions encapsulate role-based access control logic for observations.
 * They ensure that users only see data they're authorized to access.
 */

import { prisma } from "@/server/db";
import { Prisma, Role } from "@prisma/client";
import { isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, buildScopeWhere } from "@/lib/scope";

/**
 * Basic filters supported in MVP
 */
export interface ObservationFilters {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
}

/**
 * Builds a Prisma WHERE clause for observations based on user role and filters.
 * This encapsulates the RBAC logic from src/app/api/v1/observations/route.ts
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters to apply
 * @returns Prisma WHERE clause
 */
export function buildObservationWhereClause(
  userId: string,
  role: Role | string,
  filters?: ObservationFilters
): Prisma.ObservationWhereInput {
  // Start with base filters
  const baseFilters: Prisma.ObservationWhereInput[] = [];

  if (filters?.auditId) {
    baseFilters.push({ auditId: filters.auditId });
  }

  if (filters?.approvalStatus) {
    baseFilters.push({ approvalStatus: filters.approvalStatus });
  }

  if (filters?.riskCategory) {
    baseFilters.push({ riskCategory: filters.riskCategory });
  }

  if (filters?.currentStatus) {
    baseFilters.push({ currentStatus: filters.currentStatus });
  }

  let where: Prisma.ObservationWhereInput =
    baseFilters.length > 0 ? { AND: baseFilters } : {};

  // Apply role-based filtering
  // CFO and CXO_TEAM see ALL observations
  if (isCFO(role) || isCXOTeam(role)) {
    // No additional filter - they have unrestricted access
    return where;
  }

  // AUDIT_HEAD sees observations from audits where they are the audit head OR assigned as auditor
  else if (isAuditHead(role)) {
    const auditHeadFilter: Prisma.ObservationWhereInput = {
      audit: {
        OR: [
          { auditHeadId: userId }, // Audits where they are the audit head
          { assignments: { some: { auditorId: userId } } } // Audits where they're assigned as auditor
        ]
      }
    };
    where = { AND: [where, auditHeadFilter] };
  }

  // AUDITOR sees observations from audits they're assigned to
  else if (isAuditor(role)) {
    const auditorFilter: Prisma.ObservationWhereInput = {
      audit: {
        assignments: {
          some: {
            auditorId: userId
          }
        }
      }
    };
    where = { AND: [where, auditorFilter] };
  }

  // AUDITEE sees only observations they're assigned to via ObservationAssignment
  else if (isAuditee(role)) {
    const auditeeFilter: Prisma.ObservationWhereInput = {
      assignments: {
        some: {
          auditeeId: userId
        }
      }
    };
    where = { AND: [where, auditeeFilter] };
  }

  // GUEST sees only published+approved OR scoped observations
  else if (isGuest(role)) {
    // Note: This is async in the original, but we'll handle it in the calling function
    // For now, just return the basic filter and handle guest scope in getObservationsForUser
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    where = { AND: [where, allowPublished] };
  }

  return where;
}

/**
 * Fetches observations for a user with RBAC enforcement
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters
 * @param options - Prisma query options (include, orderBy, take, skip)
 * @returns Array of observations the user can access
 */
export async function getObservationsForUser(
  userId: string,
  role: Role | string,
  filters?: ObservationFilters,
  options?: {
    include?: Prisma.ObservationInclude;
    orderBy?: Prisma.ObservationOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
) {
  let where = buildObservationWhereClause(userId, role, filters);

  // Handle GUEST scope (async operation)
  if (isGuest(role)) {
    const scope = await getUserScope(userId);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    where = { AND: [where, { OR: or }] };
  }

  // Apply limit from filters if provided
  const take = filters?.limit || options?.take;

  const observations = await prisma.observation.findMany({
    where,
    include: options?.include,
    orderBy: options?.orderBy || { createdAt: 'desc' },
    take,
    skip: options?.skip
  });

  return observations;
}

/**
 * Gets aggregated observation statistics for a user
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param groupBy - Field to group by ('approvalStatus', 'currentStatus', or 'riskCategory')
 * @param filters - Optional filters
 * @returns Array of grouped statistics with counts
 */
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>> {
  let where = buildObservationWhereClause(userId, role, filters);

  // Handle GUEST scope
  if (isGuest(role)) {
    const scope = await getUserScope(userId);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    // FIX: Proper reassignment instead of mutation
    where = { AND: [where, { OR: or }] };
  }

  const stats = await prisma.observation.groupBy({
    by: [groupBy],
    where,
    _count: {
      _all: true
    }
  });

  return stats;
}
