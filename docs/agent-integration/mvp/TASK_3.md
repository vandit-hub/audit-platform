# Task 3: Create RBAC Query Functions

**Duration:** 2-3 hours
**Status:** ✅ COMPLETED

---

## Analysis

This task creates a new file `src/lib/rbac-queries.ts` that extracts and consolidates the role-based access control (RBAC) filtering logic currently embedded in the observations API route (`src/app/api/v1/observations/route.ts` lines 87-147).

### Context from Codebase

**Existing RBAC Infrastructure:**
- `src/lib/rbac.ts` - Provides role predicates: `isCFO()`, `isCXOTeam()`, `isAuditHead()`, `isAuditor()`, `isAuditee()`, `isGuest()`
- `src/lib/scope.ts` - Provides guest scope functions: `getUserScope()`, `buildScopeWhere()`
- `src/server/db.ts` - Exports the shared Prisma client instance
- Prisma schema defines the `Observation` model with relations to `Audit`, `Plant`, `User`, and `ObservationAssignment`

**RBAC Logic to Extract (from route.ts):**
The observations GET endpoint implements different filtering strategies for each role:
- **CFO / CXO_TEAM**: No restrictions, see all observations
- **AUDIT_HEAD**: See observations from audits where they are the audit head OR assigned as an auditor
- **AUDITOR**: See observations from audits they're assigned to via `audit.assignments`
- **AUDITEE**: See only observations they're assigned to via `ObservationAssignment` table
- **GUEST**: See only published + approved observations, with optional scope restrictions

### Approach

This task creates three core functions that will be reused by the MCP tools (Task 4):

1. **`buildObservationWhereClause()`** - Constructs a Prisma WHERE clause based on user role and filters (synchronous, except guest scope is handled separately)
2. **`getObservationsForUser()`** - Fetches observations with RBAC + guest scope handling (async)
3. **`getObservationStats()`** - Aggregates observation counts with RBAC filtering (async)

**Key Implementation Notes:**
- MVP version supports only basic filters: `auditId`, `approvalStatus`, `riskCategory`, `currentStatus`, `limit`
- Guest role requires async scope fetching, so guest handling is split between `buildObservationWhereClause()` and the calling functions
- The complete implementation code is provided in `docs/agent-integration/MVP_PLAN.md` Step 2 (lines 121-329)

---

## Subtasks

### 1. Create File Structure and Imports

**Action**: Create the new file `src/lib/rbac-queries.ts` with TypeScript documentation header and import all required dependencies.

**Context**: This file will house all RBAC query logic and needs imports from Prisma, existing RBAC helpers, and scope utilities.

**Acceptance**:
- File exists at `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`
- Contains JSDoc header explaining the purpose
- Imports:
  - `prisma` from `@/server/db`
  - `Prisma, Role` from `@prisma/client`
  - Role predicates from `@/lib/rbac`: `isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest`
  - Scope functions from `@/lib/scope`: `getUserScope, buildScopeWhere`
- No TypeScript import errors

**Files**:
- Create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 122-132):
```typescript
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
```

**Estimated Time**: 5 minutes

---

### 2. Define ObservationFilters Interface

**Action**: Define the `ObservationFilters` TypeScript interface that specifies the filter parameters supported in the MVP version.

**Context**: The MVP supports only 5 basic filters (as defined in Task 2 type definitions). This interface ensures type safety and documents the supported filter options.

**Acceptance**:
- `ObservationFilters` interface exported
- Contains 5 optional properties:
  - `auditId?: string` - Filter by specific audit
  - `approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'` - Filter by approval status
  - `riskCategory?: 'A' | 'B' | 'C'` - Filter by risk level
  - `currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED'` - Filter by workflow status
  - `limit?: number` - Maximum number of results
- No TypeScript errors

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 134-143):
```typescript
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
```

**Estimated Time**: 5 minutes

---

### 3. Implement buildObservationWhereClause() - Base Filters

**Action**: Create the `buildObservationWhereClause()` function skeleton and implement the base filter logic that applies before role-based filtering.

**Context**: This function builds the Prisma WHERE clause incrementally. First, it applies any provided filters (auditId, approvalStatus, etc.), then adds role-specific restrictions. The base filters are role-agnostic.

**Acceptance**:
- Function signature matches:
  ```typescript
  export function buildObservationWhereClause(
    userId: string,
    role: Role | string,
    filters?: ObservationFilters
  ): Prisma.ObservationWhereInput
  ```
- Function creates a `baseFilters` array and pushes conditions for each provided filter
- Returns a combined WHERE clause: `{ AND: baseFilters }` if filters exist, otherwise empty object `{}`
- Handles all 4 filter types: `auditId`, `approvalStatus`, `riskCategory`, `currentStatus` (limit is handled later)
- No TypeScript errors

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 145-179):
```typescript
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

  // Role-based filtering will be added below...
```

**Estimated Time**: 15 minutes

---

### 4. Implement buildObservationWhereClause() - CFO/CXO_TEAM Logic

**Action**: Add the first role-based filtering branch for CFO and CXO_TEAM roles, which have unrestricted access to all observations.

**Context**: CFO is the organization superuser and CXO_TEAM manages all audits and plants. Neither role has access restrictions - they can see all observations regardless of assignment or audit relationships.

**RBAC Logic**:
- **CFO**: Organization-level superuser, short-circuits all permission checks
- **CXO_TEAM**: Manages plants, audits, assigns users - has full visibility

**Acceptance**:
- Adds conditional check: `if (isCFO(role) || isCXOTeam(role))`
- Returns the base `where` clause immediately (no additional filters)
- Comment explains: "No additional filter - they have unrestricted access"

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 181-186):
```typescript
  // Apply role-based filtering
  // CFO and CXO_TEAM see ALL observations
  if (isCFO(role) || isCXOTeam(role)) {
    // No additional filter - they have unrestricted access
    return where;
  }
```

**Estimated Time**: 5 minutes

---

### 5. Implement buildObservationWhereClause() - AUDIT_HEAD Logic

**Action**: Add the AUDIT_HEAD role filtering logic using nested Prisma relation queries.

**Context**: Audit Heads can see observations from two sources:
1. Audits where they are designated as the audit head (`audit.auditHeadId` matches their userId)
2. Audits where they are assigned as an auditor (`audit.assignments` includes their userId)

**RBAC Logic**:
- **AUDIT_HEAD**: Leads assigned audits, approves/rejects observations, can create observations like auditors
- Uses `OR` clause to combine both access paths
- Filters via the `audit` relation in the Observation model

**Acceptance**:
- Adds `else if (isAuditHead(role))` branch
- Creates `auditHeadFilter` with nested relation query:
  ```typescript
  audit: {
    OR: [
      { auditHeadId: userId },
      { assignments: { some: { auditorId: userId } } }
    ]
  }
  ```
- Combines with base filters using `AND`: `where = { AND: [where, auditHeadFilter] }`
- Includes explanatory comments

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 188-199):
```typescript
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
```

**Estimated Time**: 10 minutes

---

### 6. Implement buildObservationWhereClause() - AUDITOR Logic

**Action**: Add the AUDITOR role filtering logic to restrict observations to assigned audits only.

**Context**: Auditors can only see observations from audits where they are explicitly assigned via the `AuditorAssignment` relationship. This is checked through the `audit.assignments` relation.

**RBAC Logic**:
- **AUDITOR**: Creates and edits draft observations, submits for approval
- Access is limited to audits they're assigned to
- Uses `audit.assignments.some()` to check membership

**Acceptance**:
- Adds `else if (isAuditor(role))` branch
- Creates `auditorFilter` with nested relation query:
  ```typescript
  audit: {
    assignments: {
      some: {
        auditorId: userId
      }
    }
  }
  ```
- Combines with base filters using `AND`
- Includes explanatory comment

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 201-213):
```typescript
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
```

**Estimated Time**: 10 minutes

---

### 7. Implement buildObservationWhereClause() - AUDITEE Logic

**Action**: Add the AUDITEE role filtering logic using the `ObservationAssignment` relation.

**Context**: Auditees have the most restrictive access - they can only see observations they are explicitly assigned to. This uses the `ObservationAssignment` junction table, not the audit-level assignments.

**RBAC Logic**:
- **AUDITEE**: Assigned to specific observations, can edit only designated auditee fields
- Access is limited to observations with a matching `ObservationAssignment` record
- Uses the `assignments` relation on the Observation model (different from audit assignments)

**Acceptance**:
- Adds `else if (isAuditee(role))` branch
- Creates `auditeeFilter` with direct relation query:
  ```typescript
  assignments: {
    some: {
      auditeeId: userId
    }
  }
  ```
- Combines with base filters using `AND`
- Includes explanatory comment

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 215-225):
```typescript
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
```

**Estimated Time**: 10 minutes

---

### 8. Implement buildObservationWhereClause() - GUEST Logic

**Action**: Add the GUEST role filtering logic for published and approved observations.

**Context**: Guests have read-only access and can only see observations that are both published and approved. They may also have additional scope restrictions, but that's handled asynchronously in the calling function (guest scope requires database lookup via `getUserScope()`).

**RBAC Logic**:
- **GUEST**: Read-only access with scope restrictions (optional role)
- Base filter: Only `APPROVED` + `isPublished: true` observations
- Scope restrictions (observationIds, auditIds) are handled in `getObservationsForUser()` and `getObservationStats()`

**Acceptance**:
- Adds `else if (isGuest(role))` branch
- Creates `allowPublished` filter:
  ```typescript
  AND: [
    { approvalStatus: "APPROVED" },
    { isPublished: true }
  ]
  ```
- Combines with base filters using `AND`
- Includes comment explaining that scope is handled in calling function

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 227-235):
```typescript
  // GUEST sees only published+approved OR scoped observations
  else if (isGuest(role)) {
    // Note: This is async in the original, but we'll handle it in the calling function
    // For now, just return the basic filter and handle guest scope in getObservationsForUser
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    where = { AND: [where, allowPublished] };
  }
```

**Estimated Time**: 10 minutes

---

### 9. Complete buildObservationWhereClause() Function

**Action**: Add the final return statement and verify the complete function compiles without TypeScript errors.

**Context**: The function is now complete with all role-based filtering logic. It should return the fully constructed WHERE clause.

**Acceptance**:
- Function ends with `return where;`
- No TypeScript errors in the file
- All role cases are handled (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- Function signature matches the exported declaration

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 237-238):
```typescript
  return where;
}
```

**Estimated Time**: 5 minutes

---

### 10. Implement getObservationsForUser() Function

**Action**: Create the async function `getObservationsForUser()` that fetches observations with full RBAC enforcement including guest scope handling.

**Context**: This function wraps `buildObservationWhereClause()` and adds:
1. Async guest scope handling (fetch scope from database)
2. Prisma query execution with configurable options (include, orderBy, take, skip)
3. Limit handling from filters

**Acceptance**:
- Function signature matches:
  ```typescript
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
  )
  ```
- Calls `buildObservationWhereClause()` to get base WHERE clause
- Adds guest scope handling: fetches scope via `getUserScope()`, builds scope WHERE via `buildScopeWhere()`, combines with `OR` logic
- Executes `prisma.observation.findMany()` with:
  - Constructed WHERE clause
  - Optional `include` from options
  - Default `orderBy: { createdAt: 'desc' }` (can be overridden)
  - `take` from filters.limit or options.take
  - Optional `skip` from options
- Returns observation array
- No TypeScript errors

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 240-287):
```typescript
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
```

**Estimated Time**: 20 minutes

---

### 11. Implement getObservationStats() Function

**Action**: Create the async function `getObservationStats()` that aggregates observation counts with RBAC filtering.

**Context**: This function provides grouped statistics (counts by approvalStatus, currentStatus, or riskCategory) while respecting RBAC rules. It's similar to `getObservationsForUser()` but uses `prisma.observation.groupBy()` instead of `findMany()`.

**Acceptance**:
- Function signature matches:
  ```typescript
  export async function getObservationStats(
    userId: string,
    role: Role | string,
    groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory',
    filters?: ObservationFilters
  ): Promise<Array<{ [key: string]: any; _count: { _all: number } }>>
  ```
- Gets WHERE clause from `buildObservationWhereClause()`
- Handles guest scope similarly to `getObservationsForUser()`
- **Note**: Guest scope handling has a bug in MVP_PLAN.md line 316 - it mutates `where.AND` directly instead of reassigning. Use proper reassignment: `where = { AND: [where, { OR: or }] };`
- Executes `prisma.observation.groupBy()` with:
  - `by: [groupBy]` parameter
  - Constructed WHERE clause
  - `_count: { _all: true }` for counts
- Returns stats array
- No TypeScript errors

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Code Reference** (from MVP_PLAN.md lines 289-328, with bug fix):
```typescript
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
```

**Estimated Time**: 15 minutes

---

### 12. Run TypeScript Type Check

**Action**: Run `npm run typecheck` to verify the entire file compiles without TypeScript errors.

**Context**: This ensures all types are correct, imports are valid, and the functions integrate properly with existing code.

**Acceptance**:
- Execute: `npm run typecheck` in `/Users/vandit/Desktop/Projects/EZAudit/audit-platform`
- Command completes with zero TypeScript errors related to `src/lib/rbac-queries.ts`
- All function signatures are type-safe
- Prisma types are correctly used

**Files**:
- Verify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`

**Command**:
```bash
cd /Users/vandit/Desktop/Projects/EZAudit/audit-platform
npm run typecheck
```

**Estimated Time**: 5 minutes

---

### 13. Manual Testing - Test WHERE Clause Construction

**Action**: Create a temporary test script to manually verify that `buildObservationWhereClause()` generates correct WHERE clauses for different roles.

**Context**: While we don't have automated tests, we should manually verify the RBAC logic produces expected Prisma WHERE clauses.

**Acceptance**:
- Create a temporary file (e.g., `test-rbac-queries.ts`) that imports and calls `buildObservationWhereClause()`
- Test each role:
  - **CFO**: Should return base filters only (no role restrictions)
  - **CXO_TEAM**: Should return base filters only
  - **AUDIT_HEAD**: Should include `audit.OR` with `auditHeadId` and `assignments.some.auditorId`
  - **AUDITOR**: Should include `audit.assignments.some.auditorId`
  - **AUDITEE**: Should include `assignments.some.auditeeId`
  - **GUEST**: Should include `approvalStatus: "APPROVED"` and `isPublished: true`
- Verify filters are combined correctly with `AND`
- Console.log output shows expected structure

**Files**:
- Create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/test-rbac-queries.ts` (temporary)

**Test Script Example**:
```typescript
import { buildObservationWhereClause } from './src/lib/rbac-queries';

const testUserId = 'user-123';

console.log('CFO filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'CFO', {}), null, 2));
console.log('CXO_TEAM filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'CXO_TEAM', {}), null, 2));
console.log('AUDIT_HEAD filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'AUDIT_HEAD', {}), null, 2));
console.log('AUDITOR filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'AUDITOR', {}), null, 2));
console.log('AUDITEE filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'AUDITEE', {}), null, 2));
console.log('GUEST filter:', JSON.stringify(buildObservationWhereClause(testUserId, 'GUEST', {}), null, 2));

console.log('\nWith filters (auditId, approvalStatus):');
console.log('AUDITOR with filters:', JSON.stringify(buildObservationWhereClause(testUserId, 'AUDITOR', {
  auditId: 'audit-456',
  approvalStatus: 'APPROVED'
}), null, 2));
```

**Command**:
```bash
npx tsx test-rbac-queries.ts
```

**Estimated Time**: 10 minutes

---

### 14. Documentation and Cleanup

**Action**: Add final JSDoc comments to all exported functions and verify the file is production-ready.

**Context**: The functions should have clear documentation for future developers and AI tools. All comments should explain role-specific logic clearly.

**Acceptance**:
- All three exported functions have JSDoc comments with:
  - Description of what the function does
  - `@param` tags for all parameters
  - `@returns` tag explaining return value
  - Any important notes about async behavior or RBAC logic
- Inline comments explain each role's filtering logic
- No TODO or FIXME comments remain
- File is properly formatted and readable
- Remove temporary test file if created

**Files**:
- Edit: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts`
- Delete: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/test-rbac-queries.ts` (if created)

**Estimated Time**: 10 minutes

---

## Dependencies

**Prerequisites:**
- Task 2 must be completed: Type definitions exist in `src/lib/types/agent.ts`
- Existing RBAC infrastructure: `src/lib/rbac.ts`, `src/lib/scope.ts`
- Prisma schema with `Observation`, `Audit`, `ObservationAssignment` models
- Shared Prisma client: `src/server/db.ts`

**Blocked By:**
- None (all dependencies exist in codebase)

**Blocks:**
- Task 4: Create MCP Server with Tools (depends on these query functions)

---

## Verification Checklist

After completing all subtasks:

- [x] File `src/lib/rbac-queries.ts` exists
- [x] `ObservationFilters` interface exported with 5 properties
- [x] `buildObservationWhereClause()` function exported and implements all 6 role cases
- [x] `getObservationsForUser()` function exported and handles async guest scope
- [x] `getObservationStats()` function exported with groupBy support
- [x] `npm run typecheck` passes with zero errors related to rbac-queries.ts
- [x] Manual testing confirms correct WHERE clause construction for each role
- [x] All functions have JSDoc documentation
- [x] Code follows existing codebase patterns and conventions

**✅ TASK 3 COMPLETED** on 2025-10-26

**Implementation Notes:**
- Created `src/lib/rbac-queries.ts` with exactly 209 lines (slightly more than estimated 180 due to comprehensive JSDoc)
- Implemented all 3 core functions:
  - `buildObservationWhereClause()` - Synchronous WHERE clause builder for all 6 roles
  - `getObservationsForUser()` - Async function with full RBAC + guest scope handling
  - `getObservationStats()` - Async aggregation with proper guest scope bug fix
- **Bug Fix Applied**: Line 196 in getObservationStats() uses proper reassignment `where = { AND: [where, { OR: or }] }` instead of mutation (as identified in MVP_PLAN.md line 316)
- All 6 role cases implemented correctly:
  - **CFO/CXO_TEAM**: Unrestricted access (returns base filters only)
  - **AUDIT_HEAD**: OR clause with auditHeadId and assignments
  - **AUDITOR**: Filter by audit assignments
  - **AUDITEE**: Filter by observation assignments
  - **GUEST**: Enforces APPROVED + isPublished, with async scope handling
- TypeScript compilation successful (no errors in rbac-queries.ts)
- Pre-existing TypeScript errors in admin/users/page.tsx and audits/[auditId]/page.tsx are unrelated
- Manual testing verified all role filters generate correct Prisma WHERE clauses
- All functions have comprehensive JSDoc with @param and @returns tags
- File follows existing patterns: uses path alias `@/*`, imports from `@/server/db`, `@/lib/rbac`, `@/lib/scope`

**Key Technical Decisions:**
- Guest scope handling is split: basic filter in `buildObservationWhereClause()`, async scope in calling functions
- Used proper TypeScript types: `Prisma.ObservationWhereInput`, `Role | string`
- Applied bug fix from task analysis (proper reassignment vs mutation)
- Maintained consistency with existing RBAC patterns from `src/app/api/v1/observations/route.ts`

---

## Next Task

Proceed to **TASK_4.md** - Create MCP Server with Tools

This task will use the RBAC query functions to implement the MCP tools (`get_observations` and `get_observation_stats`) that the AI agent can call.
