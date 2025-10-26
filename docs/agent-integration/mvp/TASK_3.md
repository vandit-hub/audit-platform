# Task 3: Create RBAC Query Functions

**Duration:** 2-3 hours

## File to Create

`src/lib/rbac-queries.ts`

## Implementation

This file contains all RBAC filtering logic, extracted from existing API routes.

### Full Code

See the complete implementation in the MVP_PLAN.md file, Step 2 (lines ~120-340).

The file should include:

1. **ObservationFilters interface** - Defines supported filters
2. **buildObservationWhereClause()** - Builds Prisma WHERE clause based on user role
3. **getObservationsForUser()** - Fetches observations with RBAC enforcement
4. **getObservationStats()** - Gets aggregated statistics with RBAC enforcement

### Key Implementation Notes

**Role-Based Filtering Logic:**

- **CFO / CXO_TEAM**: No additional filter (see all observations)
- **AUDIT_HEAD**: See observations from audits where they are audit head OR assigned as auditor
- **AUDITOR**: See observations from audits they're assigned to
- **AUDITEE**: See only observations they're assigned to via ObservationAssignment
- **GUEST**: See only published+approved observations (with optional scope)

### Code Structure

```typescript
import { prisma } from "@/server/db";
import { Prisma, Role } from "@prisma/client";
import { isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, buildScopeWhere } from "@/lib/scope";

export interface ObservationFilters {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
}

export function buildObservationWhereClause(
  userId: string,
  role: Role | string,
  filters?: ObservationFilters
): Prisma.ObservationWhereInput {
  // Implementation here (see MVP_PLAN.md)
}

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
  // Implementation here (see MVP_PLAN.md)
}

export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>> {
  // Implementation here (see MVP_PLAN.md)
}
```

**Copy the full implementation from MVP_PLAN.md Step 2 (starting at line ~120)**

## Testing

After creating the file, test manually:

```typescript
// Test in a Node.js REPL or temporary test file
import { buildObservationWhereClause } from './src/lib/rbac-queries';

// Test CFO (should have no restrictions)
const cfoWhere = buildObservationWhereClause('user123', 'CFO', {});
console.log('CFO filter:', cfoWhere);

// Test AUDITOR (should filter by assignments)
const auditorWhere = buildObservationWhereClause('user456', 'AUDITOR', {});
console.log('AUDITOR filter:', auditorWhere);
```

## Verification

After completing this task:
- [ ] File `src/lib/rbac-queries.ts` exists
- [ ] All three functions are exported
- [ ] No TypeScript errors
- [ ] Manual testing shows correct WHERE clauses for each role
- [ ] Estimated ~180 lines of code

## Next Task

Proceed to **TASK_4.md** - Create MCP Server with Tools
