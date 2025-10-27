# TASK 4: API Refactoring

## Overview
Refactor existing API routes to use the shared RBAC query functions from TASK_3. This eliminates code duplication, ensures consistency, and reduces maintenance burden.

## Current State
**Observations API** (`src/app/api/v1/observations/route.ts`):
- ~65 lines of inline RBAC filtering logic (lines 88-148)
- Manual role-based filtering in GET handler
- Duplicates logic from `src/lib/rbac-queries.ts`

**Audits API** (`src/app/api/v1/audits/route.ts`):
- ~60 lines of inline RBAC filtering + post-query filtering (lines 36-93)
- Manual role-based filtering in GET handler
- Post-query filtering for AUDIT_HEAD/AUDITOR (inefficient)

## Target State
Both API routes use shared RBAC functions:
- `buildObservationWhereClause()` for observations
- `getAuditsForUser()` for audits
- Reduced to ~10-15 lines per route
- Consistent RBAC enforcement
- Better performance (database-level filtering)

## Acceptance Criteria
- [ ] `GET /api/v1/observations` refactored to use `buildObservationWhereClause()`
- [ ] `GET /api/v1/audits` refactored to use `getAuditsForUser()`
- [ ] All existing functionality preserved (no breaking changes)
- [ ] No regressions in RBAC enforcement
- [ ] Performance maintained or improved
- [ ] Code reduced by at least 100 lines total

## Implementation Details

### 4.1 Refactor Observations API

**File**: `src/app/api/v1/observations/route.ts`

**Current Code** (lines 88-148 approximately):
```typescript
// Long switch/if-else chain for role-based filtering
let where: Prisma.ObservationWhereInput = ...;
if (isCFO(session.user.role) || isCXOTeam(session.user.role)) {
  // ... 60+ lines of role-specific logic
}
// ... more role checks
```

**Refactored Code**:
```typescript
import { buildObservationWhereClause } from '@/lib/rbac-queries';

// In GET handler
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract query parameters
  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get('plantId') || undefined;
  const auditId = searchParams.get('auditId') || undefined;
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const risk = searchParams.get('risk') as 'A' | 'B' | 'C' | undefined;
  const process = searchParams.get('process') as 'O2C' | 'P2P' | 'R2R' | 'INVENTORY' | undefined;
  const status = searchParams.get('status') || undefined;
  const published = searchParams.get('published');
  const q = searchParams.get('q') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  // Build where clause using shared RBAC function
  const where = buildObservationWhereClause(
    session.user.id,
    session.user.role,
    {
      plantId,
      auditId,
      startDate,
      endDate,
      riskCategory: risk,
      process,
      currentStatus: status as any,
      published: published === "1" ? true : published === "0" ? false : undefined,
      searchQuery: q,
      limit
    }
  );

  // Fetch observations
  const observations = await prisma.observation.findMany({
    where,
    include: {
      audit: {
        include: {
          plant: true,
          auditHead: { select: { id: true, name: true, email: true } }
        }
      },
      attachments: true,
      assignments: {
        include: {
          auditee: { select: { id: true, name: true, email: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit
  });

  // Get total count for pagination
  const total = await prisma.observation.count({ where });

  return NextResponse.json({
    observations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
```

**Benefits**:
- Reduces ~65 lines to ~15 lines
- Single source of truth for RBAC logic
- Automatically inherits new filters from TASK_3
- Easier to maintain and test

### 4.2 Refactor Audits API

**File**: `src/app/api/v1/audits/route.ts`

**Current Code** (lines 36-93 approximately):
```typescript
// Manual where clause construction
const where: any = { plantId, status };
if (isCFO(role) || isCXOTeam(role)) {
  // ... role-specific logic
}
const audits = await prisma.audit.findMany({ where });

// POST-QUERY filtering (inefficient)
if (isAuditHead(role) && !isCFO(role)) {
  // Filter audits array after fetching from database
}
```

**Refactored Code**:
```typescript
import { getAuditsForUser } from '@/lib/rbac-queries';

// In GET handler
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extract query parameters
  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get('plantId') || undefined;
  const status = searchParams.get('status') as AuditStatus | undefined;

  // Use shared RBAC function
  const audits = await getAuditsForUser(
    session.user.id,
    session.user.role,
    { plantId, status },
    {
      include: {
        plant: true,
        auditHead: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            auditor: { select: { id: true, name: true, email: true } },
            checklist: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }
  );

  // Visibility rules handled inside getAuditsForUser()
  // No need for post-query filtering

  return NextResponse.json({ audits });
}
```

**Benefits**:
- Simplifies API route code (~60 lines to ~20 lines)
- Eliminates inefficient post-query filtering
- Database-level filtering improves performance
- Consistency with agent RBAC
- Easier to add new filters in the future

### 4.3 Update Imports

Both files need to import the RBAC functions:

```typescript
// Add to imports
import { buildObservationWhereClause, getAuditsForUser } from '@/lib/rbac-queries';
```

### 4.4 Remove Duplicate Logic

After refactoring, remove the old inline RBAC code:

**In `src/app/api/v1/observations/route.ts`**:
- Remove the large if/else or switch statement for role-based filtering
- Keep only the buildObservationWhereClause() call

**In `src/app/api/v1/audits/route.ts`**:
- Remove manual where clause construction
- Remove post-query filtering logic for AUDIT_HEAD/AUDITOR
- Keep only the getAuditsForUser() call

## Testing Strategy

### Manual Testing

Test each API endpoint with different roles and parameters:

**Observations API**:
```bash
# Test as CFO (should see all observations)
curl -X GET "http://localhost:3005/api/v1/observations?limit=10" \
  -H "Cookie: session=<cfo-session>"

# Test as AUDITOR (should see only assigned observations)
curl -X GET "http://localhost:3005/api/v1/observations?auditId=<audit-id>" \
  -H "Cookie: session=<auditor-session>"

# Test with filters
curl -X GET "http://localhost:3005/api/v1/observations?plantId=<plant-id>&risk=A" \
  -H "Cookie: session=<session>"

# Test search
curl -X GET "http://localhost:3005/api/v1/observations?q=inventory" \
  -H "Cookie: session=<session>"
```

**Audits API**:
```bash
# Test as CFO (should see all audits)
curl -X GET "http://localhost:3005/api/v1/audits" \
  -H "Cookie: session=<cfo-session>"

# Test as AUDIT_HEAD (should see only their audits)
curl -X GET "http://localhost:3005/api/v1/audits" \
  -H "Cookie: session=<audit-head-session>"

# Test with filters
curl -X GET "http://localhost:3005/api/v1/audits?plantId=<plant-id>&status=IN_PROGRESS" \
  -H "Cookie: session=<session>"
```

### Regression Testing

**Before Refactoring**:
1. Record responses from both endpoints for all roles
2. Save response payloads for comparison
3. Note response times

**After Refactoring**:
1. Run same queries again
2. Compare responses (should be identical)
3. Check response times (should be same or better)
4. Verify no errors in logs

### RBAC Verification

Test matrix for all roles:

| Role | Observations API | Audits API |
|------|------------------|------------|
| CFO | See all | See all |
| CXO_TEAM | See all | See all |
| AUDIT_HEAD | See assigned audits only | See led/assigned audits only |
| AUDITOR | See assigned audits only | See assigned audits only |
| AUDITEE | See assigned observations only | No access |
| GUEST | See published+approved only | No access |

## Testing Checklist

### Observations API
- [ ] CFO sees all observations
- [ ] CXO_TEAM sees all observations
- [ ] AUDIT_HEAD sees only their audit observations
- [ ] AUDITOR sees only assigned audit observations
- [ ] AUDITEE sees only assigned observations
- [ ] GUEST sees only published+approved observations
- [ ] plantId filter works
- [ ] auditId filter works
- [ ] Date range filters work
- [ ] Risk filter works
- [ ] Process filter works
- [ ] Published filter works
- [ ] Search (q) works
- [ ] Pagination works
- [ ] Response format unchanged

### Audits API
- [ ] CFO sees all audits
- [ ] CXO_TEAM sees all audits
- [ ] AUDIT_HEAD sees only led/assigned audits
- [ ] AUDITOR sees only assigned audits
- [ ] AUDITEE sees no audits
- [ ] GUEST sees no audits
- [ ] plantId filter works
- [ ] status filter works
- [ ] Includes (plant, auditHead, assignments) work
- [ ] Response format unchanged

### Performance
- [ ] Observations query time ≤ previous implementation
- [ ] Audits query time ≤ previous implementation
- [ ] No N+1 query issues
- [ ] Database query count not increased

### Code Quality
- [ ] Removed at least 100 lines of duplicate code
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Imports are correct

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert the API route files to previous version
   ```bash
   git checkout HEAD~1 src/app/api/v1/observations/route.ts
   git checkout HEAD~1 src/app/api/v1/audits/route.ts
   ```

2. **Investigate**: Check logs for errors
   - Database query errors
   - RBAC violations
   - Performance issues

3. **Fix**: Address issues in RBAC functions
   - Update `buildObservationWhereClause()`
   - Update `getAuditsForUser()`
   - Re-deploy after testing

## Dependencies
- **TASK_3** (Enhanced RBAC) - MUST be completed first
  - Requires `buildObservationWhereClause()` with enhanced filters
  - Requires `getAuditsForUser()` function

## Related Tasks
- TASK_3 (Enhanced RBAC) - Provides the functions used here
- TASK_2 (Expanded MCP Tools) - Uses same RBAC functions

## Notes
- This refactoring has NO breaking changes
- API response format remains the same
- All existing clients continue to work
- Code is DRYer and easier to maintain
- Future filter additions only need to update RBAC functions once

## Performance Considerations
- Database-level filtering is more efficient than post-query filtering
- Ensure proper indexes exist on filtered fields:
  - `plantId`, `auditId`, `riskCategory`, `currentStatus`, `concernedProcess`
  - Audit: `plantId`, `status`, `auditHeadId`
  - AuditAssignment: `auditorId`, `auditId`

## References
- Existing API routes: `src/app/api/v1/observations/route.ts`, `src/app/api/v1/audits/route.ts`
- RBAC functions: `src/lib/rbac-queries.ts`
- Prisma Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance
