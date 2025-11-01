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
 * Filters supported for observations (MVP + Phase 2)
 */
export interface ObservationFilters {
  // Existing MVP filters
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;

  // NEW Phase 2 filters
  plantId?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  process?: 'O2C' | 'P2P' | 'R2R' | 'INVENTORY';
  published?: boolean;
  searchQuery?: string;
}

/**
 * Filters supported for audits (Phase 2)
 */
export interface AuditFilters {
  plantId?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF';
  limit?: number;
}

/**
 * Builds a Prisma WHERE clause for audits based on user role and filters.
 *
 * RBAC Logic:
 * - CFO/CXO_TEAM: See all audits
 * - AUDIT_HEAD: See audits where they are audit head OR assigned as auditor
 * - AUDITOR: See audits where assigned via AuditAssignment
 * - AUDITEE/GUEST: No access to audits
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters (plantId, status)
 * @returns Prisma WHERE clause for audits
 */
export function buildAuditWhereClause(
  userId: string,
  role: Role | string,
  filters?: AuditFilters
): Prisma.AuditWhereInput {
  // Start with base filters
  const baseFilters: Prisma.AuditWhereInput[] = [];

  if (filters?.plantId) {
    baseFilters.push({ plantId: filters.plantId });
  }

  if (filters?.status) {
    baseFilters.push({ status: filters.status });
  }

  let where: Prisma.AuditWhereInput =
    baseFilters.length > 0 ? { AND: baseFilters } : {};

  // CFO and CXO_TEAM see ALL audits
  if (isCFO(role) || isCXOTeam(role)) {
    return where;
  }

  // AUDIT_HEAD sees audits where auditHeadId = userId OR assigned as auditor
  if (isAuditHead(role)) {
    const auditHeadFilter: Prisma.AuditWhereInput = {
      OR: [
        { auditHeadId: userId },
        { assignments: { some: { auditorId: userId } } }
      ]
    };
    where = { AND: [where, auditHeadFilter] };
  }

  // AUDITOR sees audits where assigned via AuditAssignment
  else if (isAuditor(role)) {
    const auditorFilter: Prisma.AuditWhereInput = {
      assignments: { some: { auditorId: userId } }
    };
    where = { AND: [where, auditorFilter] };
  }

  // AUDITEE/GUEST: No access
  else {
    return { id: 'no-access' };
  }

  return where;
}

/**
 * Builds a Prisma WHERE clause for observations based on user role and filters.
 * This encapsulates the RBAC logic from src/app/api/v1/observations/route.ts
 *
 * RBAC Logic:
 * - CFO/CXO_TEAM: See all observations
 * - AUDIT_HEAD: See observations from audits where they are audit head OR assigned as auditor
 * - AUDITOR: See observations from audits they're assigned to
 * - AUDITEE: See only observations they're assigned to via ObservationAssignment
 * - GUEST: See only published+approved observations OR scoped observations
 *
 * Filters Supported:
 * - auditId, approvalStatus, riskCategory, currentStatus (MVP)
 * - plantId, process, published, startDate, endDate, searchQuery (Phase 2)
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

  // NEW Phase 2 filters

  // Plant filter
  if (filters?.plantId) {
    baseFilters.push({ plantId: filters.plantId });
  }

  // Process filter
  if (filters?.process) {
    baseFilters.push({ concernedProcess: filters.process });
  }

  // Published filter
  if (filters?.published !== undefined) {
    baseFilters.push({ isPublished: filters.published });
  }

  // Date range filters
  if (filters?.startDate || filters?.endDate) {
    const dateFilter: Prisma.ObservationWhereInput = { audit: {} };

    if (filters.startDate) {
      (dateFilter.audit as any).visitStartDate = {
        gte: new Date(filters.startDate)
      };
    }

    if (filters.endDate) {
      (dateFilter.audit as any).visitEndDate = {
        lte: new Date(filters.endDate)
      };
    }

    baseFilters.push(dateFilter);
  }

  // Full-text search
  if (filters?.searchQuery) {
    baseFilters.push({
      OR: [
        {
          observationText: {
            contains: filters.searchQuery,
            mode: 'insensitive'
          }
        },
        {
          risksInvolved: {
            contains: filters.searchQuery,
            mode: 'insensitive'
          }
        },
        {
          auditeeFeedback: {
            contains: filters.searchQuery,
            mode: 'insensitive'
          }
        }
      ]
    });
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
 * RBAC Logic:
 * - CFO/CXO_TEAM: See all observations
 * - AUDIT_HEAD: See observations from audits where they are audit head OR assigned as auditor
 * - AUDITOR: See observations from audits they're assigned to
 * - AUDITEE: See only observations they're assigned to via ObservationAssignment
 * - GUEST: See only published+approved observations OR scoped observations
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters (auditId, approvalStatus, riskCategory, currentStatus, plantId, process, published, dates, searchQuery)
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
 * @param groupBy - Field to group by ('approvalStatus', 'currentStatus', 'riskCategory', 'concernedProcess', or 'auditId')
 * @param filters - Optional filters
 * @returns Array of grouped statistics with counts
 */
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId',
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

  // Handle groupBy for different fields
  if (groupBy === 'concernedProcess') {
    const stats = await prisma.observation.groupBy({
      by: ['concernedProcess'],
      where,
      _count: {
        _all: true
      }
    });
    return stats;
  }

  if (groupBy === 'auditId') {
    const stats = await prisma.observation.groupBy({
      by: ['auditId'],
      where,
      _count: {
        _all: true
      }
    });
    return stats;
  }

  // Original groupBy options
  const stats = await prisma.observation.groupBy({
    by: [groupBy],
    where,
    _count: {
      _all: true
    }
  });

  return stats;
}

/**
 * Fetches audits for a user with RBAC enforcement
 *
 * RBAC Logic:
 * - CFO/CXO_TEAM: See all audits
 * - AUDIT_HEAD: See audits where they are audit head OR assigned as auditor
 * - AUDITOR: See audits where assigned via AuditAssignment
 * - AUDITEE/GUEST: No access to audits
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters (plantId, status, limit)
 * @param options - Prisma query options (include, orderBy, take, skip)
 * @returns Array of audits the user can access
 */
export async function getAuditsForUser(
  userId: string,
  role: Role | string,
  filters?: AuditFilters,
  options?: {
    include?: Prisma.AuditInclude;
    orderBy?: Prisma.AuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
) {
  const where = buildAuditWhereClause(userId, role, filters);

  // Apply limit from filters if provided
  const take = filters?.limit || options?.take;

  const audits = await prisma.audit.findMany({
    where,
    include: options?.include || {
      plant: true,
      auditHead: { select: { id: true, name: true, email: true } },
      assignments: {
        include: {
          auditor: { select: { id: true, name: true, email: true } },
        }
      }
    },
    orderBy: options?.orderBy || { createdAt: 'desc' },
    take,
    skip: options?.skip
  });

  return audits;
}

/**
 * Checks if a user can access a specific observation
 *
 * RBAC Logic:
 * - CFO: Always has access (short-circuit)
 * - Other roles: Uses buildObservationWhereClause to verify access
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param observationId - Observation ID to check
 * @returns True if user has access, false otherwise
 */
export async function canAccessObservation(
  userId: string,
  role: Role | string,
  observationId: string
): Promise<boolean> {
  // CFO always has access
  if (isCFO(role)) {
    return true;
  }

  // Build where clause with RBAC
  const where = buildObservationWhereClause(userId, role);

  // Check if observation exists AND user has access
  const observation = await prisma.observation.findFirst({
    where: {
      id: observationId,
      AND: [where]
    },
    select: { id: true } // Only need to verify existence
  });

  return observation !== null;
}

/**
 * Checks if a user can access a specific audit
 *
 * RBAC Logic:
 * - CFO: Always has access (short-circuit)
 * - Other roles: Uses buildAuditWhereClause to verify access
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param auditId - Audit ID to check
 * @returns True if user has access, false otherwise
 */
export async function canAccessAudit(
  userId: string,
  role: Role | string,
  auditId: string
): Promise<boolean> {
  // CFO always has access
  if (isCFO(role)) {
    return true;
  }

  // Build where clause with RBAC
  const where = buildAuditWhereClause(userId, role);

  // Check if audit exists AND user has access
  const audit = await prisma.audit.findFirst({
    where: {
      id: auditId,
      AND: [where]
    },
    select: { id: true } // Only need to verify existence
  });

  return audit !== null;
}
