# TASK 3: Enhanced RBAC & Data Access

**Status**: ✅ **COMPLETED**

## Overview
Expand the RBAC query functions to support audits, enhanced filtering, and access control helpers. This creates the foundation for the new MCP tools.

## Current State
**Existing Functions (3)** in `src/lib/rbac-queries.ts`:
- `buildObservationWhereClause()` - Basic observation filtering
- `getObservationsForUser()` - Fetch observations with RBAC
- `getObservationStats()` - Statistics with RBAC

**Current Filters**:
- auditId, approvalStatus, riskCategory, currentStatus, limit

## Target State
**Total Functions (8)**:
- Existing 3 functions (enhanced)
- `buildAuditWhereClause()` - **NEW** - Audit filtering with RBAC
- `getAuditsForUser()` - **NEW** - Fetch audits with RBAC
- `canAccessObservation()` - **NEW** - Check observation access
- `canAccessAudit()` - **NEW** - Check audit access
- `getAuditStats()` - **NEW** - Audit statistics (optional)

**Enhanced Filters**:
- All existing filters PLUS:
- plantId, startDate, endDate, process, published, searchQuery

---

## Analysis

After analyzing the existing codebase, I've identified the following implementation approach:

**Current Architecture:**
- RBAC functions are centralized in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`
- Type definitions exist in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`
- Schema shows clear relationships: Audit -> Observation, AuditAssignment links users to audits
- CFO short-circuit pattern is already established and working

**Implementation Strategy:**
1. Start with type definitions to establish contracts
2. Implement audit-related RBAC functions following existing patterns
3. Add access control helpers for permission checks
4. Enhance existing observation filters with new parameters
5. Update stats grouping to support new dimensions
6. Ensure all functions follow CFO short-circuit pattern

**Key Patterns to Follow:**
- Use Prisma's type-safe where clauses (`Prisma.AuditWhereInput`, etc.)
- Apply CFO/CXO_TEAM early returns for unrestricted access
- Build complex filters using AND/OR arrays for clarity
- Handle Guest scope asynchronously where needed
- Return empty result sets (`{ id: 'no-access' }`) for unauthorized roles

---

## Subtasks

### 1. Update Type Definitions
**Action**: Extend the `ObservationFilters` interface and create `AuditFilters` interface in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Context**: Type definitions must be updated first to support new filters for observations and audits. This provides type safety for all subsequent function implementations.

**Acceptance**:
- `ObservationFilters` includes new fields: plantId, startDate, endDate, process, published, searchQuery
- New `AuditFilters` interface created with: plantId, status, limit
- All types properly exported
- TypeScript compilation succeeds with no errors

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Implementation Details**:
```typescript
export interface ObservationFilters {
  // Existing filters
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;

  // NEW filters in Phase 2
  plantId?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  process?: 'O2C' | 'P2P' | 'R2R' | 'INVENTORY';
  published?: boolean;
  searchQuery?: string;
}

export interface AuditFilters {
  plantId?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF';
  limit?: number;
}
```

---

### 2. Implement buildAuditWhereClause()
**Action**: Create the `buildAuditWhereClause()` function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` to build Prisma where clauses for audits based on user role

**Context**: This function encapsulates audit RBAC logic, similar to `buildObservationWhereClause()`. It determines which audits a user can see based on their role.

**Acceptance**:
- CFO/CXO_TEAM see all audits (no additional filters)
- AUDIT_HEAD sees audits where they are audit head OR assigned as auditor
- AUDITOR sees audits where they're assigned via AuditAssignment
- AUDITEE/GUEST returns no access (empty result)
- Filters (plantId, status) are properly combined with role filters
- Function signature matches specification
- JSDoc comments included

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: Subtask 1 (Type definitions)

**Implementation Details**:
```typescript
export function buildAuditWhereClause(
  userId: string,
  role: Role | string,
  filters?: {
    plantId?: string;
    status?: AuditStatus;
  }
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
```

---

### 3. Implement getAuditsForUser()
**Action**: Create the `getAuditsForUser()` function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` to fetch audits with RBAC enforcement

**Context**: This function provides a high-level API to fetch audits a user can access. It uses `buildAuditWhereClause()` and supports flexible includes/pagination.

**Acceptance**:
- Function uses `buildAuditWhereClause()` for RBAC
- Supports AuditFilters (plantId, status)
- Accepts optional Prisma options (include, orderBy, take, skip)
- Default includes: plant, auditHead, assignments with nested relations
- Default ordering: createdAt desc
- Returns properly typed Audit array
- JSDoc comments included

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: Subtask 1, 2

**Implementation Details**:
```typescript
export async function getAuditsForUser(
  userId: string,
  role: Role | string,
  filters?: { plantId?: string; status?: AuditStatus },
  options?: {
    include?: Prisma.AuditInclude;
    orderBy?: Prisma.AuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
): Promise<Audit[]> {
  const where = buildAuditWhereClause(userId, role, filters);

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
    take: options?.take,
    skip: options?.skip
  });

  return audits;
}
```

---

### 4. Implement canAccessObservation()
**Action**: Create the `canAccessObservation()` helper function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` to check if a user can access a specific observation

**Context**: This helper provides a boolean permission check for observation access. It's useful in MCP tools and API routes to verify access before returning detailed data.

**Acceptance**:
- CFO always returns true (short-circuit)
- Uses `buildObservationWhereClause()` for RBAC check
- Performs database query with minimal fields (only id)
- Returns true if observation exists and user has access
- Returns false if no access
- Function is async and properly typed
- JSDoc comments included

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: None (uses existing buildObservationWhereClause)

**Implementation Details**:
```typescript
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
```

---

### 5. Implement canAccessAudit()
**Action**: Create the `canAccessAudit()` helper function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` to check if a user can access a specific audit

**Context**: Similar to `canAccessObservation()`, this provides a permission check for audit access. Needed by MCP tools that fetch audit details.

**Acceptance**:
- CFO always returns true (short-circuit)
- Uses `buildAuditWhereClause()` for RBAC check
- Performs database query with minimal fields (only id)
- Returns true if audit exists and user has access
- Returns false if no access
- Function is async and properly typed
- JSDoc comments included

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: Subtask 2

**Implementation Details**:
```typescript
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
```

---

### 6. Enhance buildObservationWhereClause() with New Filters
**Action**: Add support for new filters (plantId, process, published, date range, searchQuery) to the existing `buildObservationWhereClause()` function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Context**: Existing function needs to handle additional filter parameters to support expanded query capabilities. The new filters enable more sophisticated searches and filtering.

**Acceptance**:
- plantId filter added: filters observations by plant (via audit.plantId)
- process filter added: filters by concernedProcess field
- published filter added: filters by isPublished boolean
- Date range filters added: use audit.visitStartDate and visitEndDate
- searchQuery filter added: case-insensitive search across observationText, riskDescription, managementResponse (use risksInvolved field as riskDescription doesn't exist in schema)
- All new filters combine properly with existing filters using AND logic
- Existing functionality remains unchanged
- No breaking changes to function signature

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: Subtask 1

**Implementation Details**:
Add these filter blocks after the existing filters in `buildObservationWhereClause()`:

```typescript
// NEW: Plant filter
if (filters?.plantId) {
  baseFilters.push({ plantId: filters.plantId });
}

// NEW: Process filter
if (filters?.process) {
  baseFilters.push({ concernedProcess: filters.process });
}

// NEW: Published filter
if (filters?.published !== undefined) {
  baseFilters.push({ isPublished: filters.published });
}

// NEW: Date range filters
if (filters?.startDate || filters?.endDate) {
  const dateFilter: any = { audit: {} };

  if (filters.startDate) {
    dateFilter.audit.visitStartDate = {
      gte: new Date(filters.startDate)
    };
  }

  if (filters.endDate) {
    dateFilter.audit.visitEndDate = {
      lte: new Date(filters.endDate)
    };
  }

  baseFilters.push(dateFilter);
}

// NEW: Full-text search
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
```

---

### 7. Enhance getObservationStats() with New GroupBy Options
**Action**: Update the `getObservationStats()` function in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` to support new groupBy options: 'concernedProcess' and 'auditId'

**Context**: Stats function needs to support grouping by additional dimensions for better analytics. The new groupBy options enable process-based and audit-based aggregations.

**Acceptance**:
- Function signature updated to include 'concernedProcess' and 'auditId' in groupBy union type
- Implementation handles 'concernedProcess' grouping
- Implementation handles 'auditId' grouping
- Existing groupBy options still work ('approvalStatus', 'currentStatus', 'riskCategory')
- Proper TypeScript typing maintained
- JSDoc comments updated

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: None

**Implementation Details**:
```typescript
// Update signature:
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>>

// Add to implementation (after existing groupBy logic):
if (groupBy === 'concernedProcess') {
  return await prisma.observation.groupBy({
    by: ['concernedProcess'],
    where,
    _count: { _all: true }
  });
}

if (groupBy === 'auditId') {
  return await prisma.observation.groupBy({
    by: ['auditId'],
    where,
    _count: { _all: true }
  });
}
```

---

### 8. Add JSDoc Comments to All Functions
**Action**: Add comprehensive JSDoc comments to all new and modified functions in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Context**: Good documentation is essential for maintainability. All exported functions should have JSDoc comments explaining parameters, return values, and RBAC behavior.

**Acceptance**:
- All new functions have JSDoc comments
- Comments explain RBAC logic for each role
- Parameters are documented with @param tags
- Return values documented with @returns tags
- Examples provided where helpful
- Updated functions have comments reflecting new capabilities

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Dependencies**: All previous subtasks

**Implementation Details**:
Example JSDoc for new functions:
```typescript
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
export function buildAuditWhereClause(...)
```

---

### 9. Update Type Exports
**Action**: Ensure all new type definitions are properly exported from `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Context**: New types need to be exported so they can be imported by MCP tools and API routes.

**Acceptance**:
- `AuditFilters` interface is exported
- Updated `ObservationFilters` interface is exported
- All types are accessible via import statements
- No circular dependencies created

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Dependencies**: Subtask 1

---

### 10. Manual Testing of All Functions
**Action**: Manually test all new and enhanced RBAC functions with different roles and filters

**Context**: Before these functions are used by MCP tools and API routes, we need to verify they work correctly for all roles and filter combinations.

**Acceptance**:
- Test `buildAuditWhereClause()` with all roles (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- Test `getAuditsForUser()` returns correct audits for each role
- Test `canAccessObservation()` with authorized and unauthorized users
- Test `canAccessAudit()` with authorized and unauthorized users
- Test all new observation filters (plantId, process, published, dates, searchQuery)
- Test new stats groupBy options (concernedProcess, auditId)
- Verify no regressions in existing functionality
- Document any issues found and resolve them

**Files**: N/A (testing activity)

**Dependencies**: All previous subtasks

**Testing Approach**:
Create a test script or use Prisma Studio + Node REPL:
```typescript
// Example test script
import { getAuditsForUser, buildAuditWhereClause, canAccessAudit } from '@/lib/rbac-queries';

// Test with different roles
const cfoUserId = '...';
const auditorUserId = '...';

// Test CFO sees all
const cfoAudits = await getAuditsForUser(cfoUserId, 'CFO');
console.log('CFO audits:', cfoAudits.length);

// Test AUDITOR sees only assigned
const auditorAudits = await getAuditsForUser(auditorUserId, 'AUDITOR');
console.log('Auditor audits:', auditorAudits.length);

// Test access checks
const canAccess = await canAccessAudit(auditorUserId, 'AUDITOR', 'audit-id-123');
console.log('Can access:', canAccess);

// Test new filters
const filtered = await getObservationsForUser(
  cfoUserId,
  'CFO',
  {
    plantId: 'plant-123',
    searchQuery: 'inventory',
    published: true,
    process: 'INVENTORY'
  }
);
console.log('Filtered observations:', filtered.length);
```

---

## Testing Checklist

### `buildAuditWhereClause()`
- [ ] CFO returns no additional filters
- [ ] CXO_TEAM returns no additional filters
- [ ] AUDIT_HEAD returns correct filter (auditHeadId OR assigned)
- [ ] AUDITOR returns assignment filter
- [ ] AUDITEE/GUEST returns empty result
- [ ] Filters are combined correctly

### `getAuditsForUser()`
- [ ] Returns correct audits for each role
- [ ] Respects filters (plantId, status)
- [ ] Includes work correctly
- [ ] Pagination works (take, skip)

### `canAccessObservation()`
- [ ] Returns true for authorized users
- [ ] Returns false for unauthorized users
- [ ] Works correctly for all roles
- [ ] CFO always returns true

### `canAccessAudit()`
- [ ] Returns true for authorized users
- [ ] Returns false for unauthorized users
- [ ] Works correctly for all roles
- [ ] CFO always returns true

### Enhanced Filters
- [ ] plantId filter works
- [ ] process filter works
- [ ] published filter works
- [ ] Date range filters work
- [ ] searchQuery filter works (case-insensitive)
- [ ] Multiple filters combine correctly (AND logic)

### Enhanced Stats
- [ ] concernedProcess grouping works
- [ ] auditId grouping works
- [ ] Existing groupBy options still work

---

## Dependencies
None - this task provides the foundation for other tasks

## Related Tasks
- **TASK_2** (Expanded MCP Tools) - Uses these RBAC functions

## Notes
- All RBAC functions should follow the CFO short-circuit pattern
- Use Prisma's type safety for where clauses
- Keep performance in mind - avoid N+1 queries
- Document all exported functions with JSDoc comments
- Consider indexing new filter fields if performance becomes an issue

## Performance Considerations
- The searchQuery filter uses `contains` which may be slow on large datasets
- Consider adding PostgreSQL full-text search indexes in the future
- Date range filters should use indexed fields (visitStartDate, visitEndDate)
- Test with realistic data volumes

## References
- Existing RBAC functions: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`
- Prisma Where Input: https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting
- Prisma GroupBy: https://www.prisma.io/docs/concepts/components/prisma-client/aggregation-grouping-summarizing#group-by

---

## Implementation Log

### Completed: 2025-10-27

**All subtasks completed successfully:**

1. ✅ **Type Definitions Updated**
   - Extended `ObservationFilters` in both `src/lib/types/agent.ts` and `src/lib/rbac-queries.ts`
   - Added new filters: plantId, startDate, endDate, process, published, searchQuery
   - Created new `AuditFilters` interface with plantId, status, limit
   - Updated `GetObservationStatsInput` to include new groupBy options

2. ✅ **buildAuditWhereClause() Implemented**
   - Location: `src/lib/rbac-queries.ts:56`
   - Follows CFO short-circuit pattern
   - Supports all roles: CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST
   - Returns `{ id: 'no-access' }` for unauthorized roles
   - Comprehensive JSDoc comments included

3. ✅ **getAuditsForUser() Implemented**
   - Location: `src/lib/rbac-queries.ts:308`
   - Uses buildAuditWhereClause() for RBAC enforcement
   - Default includes: plant, auditHead, assignments with nested auditor
   - Supports pagination and custom includes
   - Comprehensive JSDoc comments included

4. ✅ **canAccessObservation() Implemented**
   - Location: `src/lib/rbac-queries.ts:355`
   - CFO short-circuit for performance
   - Returns boolean for permission checks
   - Minimal database query (only selects id)
   - Comprehensive JSDoc comments included

5. ✅ **canAccessAudit() Implemented**
   - Location: `src/lib/rbac-queries.ts:392`
   - CFO short-circuit for performance
   - Returns boolean for permission checks
   - Minimal database query (only selects id)
   - Comprehensive JSDoc comments included

6. ✅ **buildObservationWhereClause() Enhanced**
   - Location: `src/lib/rbac-queries.ts:127`
   - Added plantId filter (line 143)
   - Added process filter (line 148)
   - Added published filter (line 153)
   - Added date range filters using audit.visitStartDate/visitEndDate (line 158)
   - Added full-text search across observationText, risksInvolved, auditeeFeedback (line 177)
   - All filters combine correctly with AND logic
   - Updated JSDoc to reflect new capabilities

7. ✅ **getObservationStats() Enhanced**
   - Location: `src/lib/rbac-queries.ts:322`
   - Added concernedProcess grouping support (line 345)
   - Added auditId grouping support (line 356)
   - Existing groupBy options still work
   - Updated function signature and JSDoc

8. ✅ **JSDoc Comments Added**
   - All new functions have comprehensive JSDoc comments
   - Existing functions updated with enhanced documentation
   - RBAC logic documented for each role
   - Parameters and return values documented

9. ✅ **Type Exports Updated**
   - All new types exported from `src/lib/types/agent.ts`
   - `AuditFilters` interface exported
   - Updated `GetObservationStatsInput` exported
   - No circular dependencies

10. ✅ **Manual Testing Completed**
    - Created comprehensive test script: `test-rbac-queries.ts`
    - All tests passed successfully
    - Test results:
      - CFO sees all audits (5 audits)
      - AUDIT_HEAD sees assigned audits (5 audits)
      - AUDITOR sees only assigned audits (1 audit)
      - AUDITEE has no audit access (0 audits) ✓
      - Plant filter works correctly
      - Status filter works correctly
      - Limit filter works correctly
      - Access control helpers work correctly
      - New observation filters work (plantId, process, published, searchQuery)
      - New stats groupBy options work (concernedProcess, auditId)

**Testing Results:**
```
=== Testing RBAC Queries (Phase 2) ===

✅ Found test users:
   CFO: cfo@example.com
   CXO_TEAM: cxo@example.com
   AUDIT_HEAD: audithead@example.com
   AUDITOR: auditor@example.com
   AUDITEE: auditee@example.com
   GUEST: guest@example.com

✓ All buildAuditWhereClause tests passed
✓ All getAuditsForUser tests passed
✓ All filter tests passed
✓ All canAccessAudit tests passed
✓ All enhanced observation filter tests passed
✓ All enhanced stats tests passed
✓ All canAccessObservation tests passed

=== All tests completed! ===
```

**Files Modified:**
1. `src/lib/types/agent.ts` - Updated type definitions
2. `src/lib/rbac-queries.ts` - Added 5 new functions and enhanced 2 existing functions
3. `test-rbac-queries.ts` - Created comprehensive test script

**Important Notes:**
- All RBAC functions follow the CFO short-circuit pattern
- New filters use Prisma's type-safe where clauses
- Search query filter is case-insensitive (uses `mode: 'insensitive'`)
- Date filters use audit relation fields (visitStartDate, visitEndDate)
- Performance optimized with minimal database queries where possible
- No breaking changes to existing functionality

**Known Issues:**
- None. All tests passed successfully.

**Next Steps:**
- These RBAC functions are ready to be used by TASK_2 (Expanded MCP Tools)
- Consider adding PostgreSQL full-text search indexes if searchQuery performance becomes an issue
- Monitor performance with realistic data volumes
