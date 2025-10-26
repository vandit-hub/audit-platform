# Task 2: Create Type Definitions

**Duration:** 30 minutes

## File to Create

`src/lib/types/agent.ts`

## Implementation

Create the file with the following content:

```typescript
/**
 * Type definitions for AI Agent MVP
 */

// User context passed to MCP tools
export interface AgentUserContext {
  userId: string;
  role: string;
  email: string;
  name: string;
}

// Input types for MCP tools
export interface GetObservationsInput {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
}

export interface GetObservationStatsInput {
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory';
  auditId?: string;
}

// Response types
export interface ObservationSummary {
  id: string;
  observationText: string;
  riskCategory: string | null;
  concernedProcess: string | null;
  currentStatus: string;
  approvalStatus: string;
  isPublished: boolean;
  createdAt: string;
  audit: {
    id: string;
    title: string | null;
  };
  plant: {
    id: string;
    name: string;
  };
}

export interface StatResult {
  [key: string]: any;
  count: number;
}
```

## Verification

After completing this task:
- [ ] File `src/lib/types/agent.ts` exists
- [ ] All interfaces are properly exported
- [ ] No TypeScript errors when importing these types

## Next Task

Proceed to **TASK_3.md** - Create RBAC Query Functions
