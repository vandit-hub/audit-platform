# TASK 3: Enhanced RBAC & Data Access

## Overview
Expand the RBAC query functions to support audits, enhanced filtering, and access control helpers. This creates the foundation for the new MCP tools and API refactoring.

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

## Acceptance Criteria
- [ ] `buildAuditWhereClause()` function created with role-based filtering
- [ ] `getAuditsForUser()` function created
- [ ] `canAccessObservation()` helper function created
- [ ] `canAccessAudit()` helper function created
- [ ] `ObservationFilters` interface updated with new filters
- [ ] `buildObservationWhereClause()` enhanced to handle new filters
- [ ] `getObservationStats()` enhanced to support new groupBy options
- [ ] All functions properly enforce RBAC rules
- [ ] Type definitions exported correctly

## Implementation Details

### 3.1 Audit-Related RBAC Functions

**File**: `src/lib/rbac-queries.ts`

#### Function: `buildAuditWhereClause()`

**Purpose**: Build Prisma where clause for audits based on user role and filters

**Signature**:
```typescript
export function buildAuditWhereClause(
  userId: string,
  role: Role | string,
  filters?: {
    plantId?: string;
    status?: AuditStatus;
  }
): Prisma.AuditWhereInput
```

**RBAC Logic by Role**:

```typescript
// CFO/CXO_TEAM: All audits
if (isCFO(role) || isCXOTeam(role)) {
  return { ...filters };
}

// AUDIT_HEAD: Audits where auditHeadId = userId OR assigned as auditor
if (isAuditHead(role)) {
  return {
    OR: [
      { auditHeadId: userId },
      { assignments: { some: { auditorId: userId } } }
    ],
    ...filters
  };
}

// AUDITOR: Audits where assigned via AuditAssignment
if (isAuditor(role)) {
  return {
    assignments: { some: { auditorId: userId } },
    ...filters
  };
}

// AUDITEE/GUEST: No access
return { id: 'no-access' }; // Returns empty result set
```

#### Function: `getAuditsForUser()`

**Purpose**: Fetch audits user has access to with optional includes and pagination

**Signature**:
```typescript
export async function getAuditsForUser(
  userId: string,
  role: Role | string,
  filters?: {
    plantId?: string;
    status?: AuditStatus;
  },
  options?: {
    include?: Prisma.AuditInclude;
    orderBy?: Prisma.AuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
): Promise<Audit[]>
```

**Implementation**:
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
          checklist: { select: { id: true, title: true } }
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

### 3.2 Access Control Helpers

#### Function: `canAccessObservation()`

**Purpose**: Check if user has permission to access a specific observation

**Signature**:
```typescript
export async function canAccessObservation(
  userId: string,
  role: Role | string,
  observationId: string
): Promise<boolean>
```

**Implementation**:
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

#### Function: `canAccessAudit()`

**Purpose**: Check if user has permission to access a specific audit

**Signature**:
```typescript
export async function canAccessAudit(
  userId: string,
  role: Role | string,
  auditId: string
): Promise<boolean>
```

**Implementation**:
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

### 3.3 Enhanced Filtering for Observations

#### Update `ObservationFilters` Interface

**File**: `src/lib/types/agent.ts` (or create if doesn't exist)

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
```

#### Enhance `buildObservationWhereClause()`

**File**: `src/lib/rbac-queries.ts`

Add support for new filters:

```typescript
// Inside buildObservationWhereClause(), add after existing filters:

// NEW: Plant filter
if (filters?.plantId) {
  baseFilters.push({ audit: { plantId: filters.plantId } });
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
        riskDescription: {
          contains: filters.searchQuery,
          mode: 'insensitive'
        }
      },
      {
        managementResponse: {
          contains: filters.searchQuery,
          mode: 'insensitive'
        }
      }
    ]
  });
}
```

### 3.4 Enhanced Stats Grouping

#### Update `getObservationStats()`

**File**: `src/lib/rbac-queries.ts`

**Current Signature**:
```typescript
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>>
```

**New Signature**:
```typescript
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>>
```

**Implementation Update**:
```typescript
// Add to existing switch statement or if/else chain:

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

## Type Definitions

### Export Types

**File**: `src/lib/types/agent.ts`

```typescript
export interface ObservationFilters {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
  plantId?: string;
  startDate?: string;
  endDate?: string;
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

## Dependencies
None - this task provides the foundation for other tasks

## Related Tasks
- **TASK_2** (Expanded MCP Tools) - Uses these RBAC functions
- **TASK_4** (API Refactoring) - Uses these functions to simplify API routes

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
- Existing RBAC functions: `src/lib/rbac-queries.ts`
- Prisma Where Input: https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting
- Prisma GroupBy: https://www.prisma.io/docs/concepts/components/prisma-client/aggregation-grouping-summarizing#group-by
