# Task 2: Create Type Definitions

**Duration:** 30 minutes

## Analysis

This task establishes the foundational TypeScript types for the AI Agent MVP. These types serve three critical purposes:

1. **MCP Tool Inputs**: Define the parameters that Claude Agent will use when calling our custom tools
2. **User Context**: Capture the authenticated user's information for RBAC enforcement within tools
3. **Response Shapes**: Ensure type-safe data returned from our tools to the agent

The types align with the existing Prisma schema (specifically the `Observation`, `Audit`, and `Plant` models) and leverage Prisma-generated enums for `ApprovalStatus`, `ObservationStatus`, and `RiskCategory`.

**Key Design Decisions:**
- Use literal union types for enums to match Prisma schema exactly
- Keep response types simple and focused (no deep nesting)
- All filter parameters are optional to support flexible queries
- The `StatResult` type uses an index signature for flexibility in grouping operations

**Codebase Context:**
- The project uses TypeScript with strict mode enabled
- Existing type definitions are found in individual module directories (e.g., `src/lib/websocket/types.ts`)
- Path alias `@/*` maps to `./src/*`
- The `src/lib/types/` directory does not yet exist and needs to be created

## Subtasks

### 1. Create the Types Directory Structure
**Action**: Create the `src/lib/types/` directory to house agent-related type definitions

**Context**: The project doesn't have a centralized types directory yet. This establishes a pattern for future shared type definitions.

**Acceptance**:
- Directory `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/` exists
- Directory has correct permissions (readable/writable)

**Files**:
- Directory to create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/`

**Command**:
```bash
mkdir -p /Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types
```

**Estimated Time**: 1 minute

---

### 2. Create the Agent Types File with User Context Interface
**Action**: Create `agent.ts` with the file header, JSDoc comment, and `AgentUserContext` interface

**Context**: The `AgentUserContext` will be passed to every MCP tool to identify the authenticated user. This is critical for RBAC enforcement - tools must know who is making the request to filter data appropriately.

**Acceptance**:
- File `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts` exists
- Contains proper JSDoc header comment
- `AgentUserContext` interface is exported with all 4 required fields:
  - `userId: string` - Maps to Prisma `User.id` (cuid)
  - `role: string` - Maps to Prisma `User.role` enum (will be validated against Role enum)
  - `email: string` - Maps to Prisma `User.email`
  - `name: string` - Maps to Prisma `User.name`

**Files**:
- Create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Code Snippet**:
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
```

**Estimated Time**: 3 minutes

---

### 3. Add MCP Tool Input Types
**Action**: Add `GetObservationsInput` and `GetObservationStatsInput` interfaces to define tool parameters

**Context**: These interfaces define the shape of arguments that Claude will pass when invoking our custom MCP tools. The literal union types must exactly match the Prisma schema enums:
- `ApprovalStatus`: DRAFT, SUBMITTED, APPROVED, REJECTED
- `RiskCategory`: A, B, C
- `ObservationStatus`: PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED

All filter parameters are optional to allow flexible queries like "show all observations" or "show only approved observations in audit X".

**Acceptance**:
- `GetObservationsInput` interface exported with:
  - `auditId?: string` - Optional filter by audit ID
  - `approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'` - Matches Prisma `ApprovalStatus` enum
  - `riskCategory?: 'A' | 'B' | 'C'` - Matches Prisma `RiskCategory` enum
  - `currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED'` - Matches Prisma `ObservationStatus` enum
  - `limit?: number` - Optional result limit for performance
- `GetObservationStatsInput` interface exported with:
  - `groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory'` - Required field determines grouping
  - `auditId?: string` - Optional filter to stats for specific audit

**Files**:
- Modify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Code Snippet**:
```typescript
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
```

**Estimated Time**: 5 minutes

**Edge Cases**:
- Ensure literal types match Prisma schema exactly (case-sensitive)
- `groupBy` is required in `GetObservationStatsInput` since stats without grouping aren't meaningful

---

### 4. Add Observation Response Type
**Action**: Add `ObservationSummary` interface to define the shape of observation data returned to the agent

**Context**: This interface represents the condensed observation data that will be returned to Claude. It's a carefully curated subset of the full Prisma `Observation` model, excluding sensitive/internal fields and including only what's needed for the MVP. Nested objects (`audit`, `plant`) provide minimal context.

**Acceptance**:
- `ObservationSummary` interface exported with all fields:
  - `id: string` - Observation ID (cuid from Prisma)
  - `observationText: string` - Main finding text
  - `riskCategory: string | null` - Risk level (nullable in DB)
  - `concernedProcess: string | null` - Process involved (nullable)
  - `currentStatus: string` - Current workflow status
  - `approvalStatus: string` - Approval workflow status
  - `isPublished: boolean` - Publication flag
  - `createdAt: string` - ISO 8601 timestamp (serialized from DateTime)
  - `audit: { id: string; title: string | null }` - Nested audit info
  - `plant: { id: string; name: string }` - Nested plant info
- Types align with Prisma model fields (`Observation`, `Audit`, `Plant`)
- String types used instead of enum types to keep it simple for serialization

**Files**:
- Modify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Code Snippet**:
```typescript
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
```

**Estimated Time**: 7 minutes

**TypeScript Considerations**:
- Use `string | null` for nullable fields (not `string?` or `string | undefined`)
- `createdAt` is `string` not `Date` because we'll serialize it for JSON responses
- Nested objects use inline type definitions rather than separate interfaces for simplicity

---

### 5. Add Statistics Response Type
**Action**: Add `StatResult` interface for aggregated statistics responses

**Context**: This flexible interface allows our `get_observation_stats` tool to return grouped counts (e.g., "3 DRAFT, 5 SUBMITTED, 2 APPROVED"). The index signature `[key: string]: any` allows for dynamic grouping keys while ensuring every result has a `count` field.

**Acceptance**:
- `StatResult` interface exported with:
  - Index signature: `[key: string]: any` - Allows dynamic keys for grouping
  - Required field: `count: number` - Count of observations in this group
- Interface allows flexible usage:
  ```typescript
  // Example results:
  { approvalStatus: 'DRAFT', count: 3 }
  { riskCategory: 'A', count: 5 }
  { currentStatus: 'PENDING_MR', count: 2 }
  ```

**Files**:
- Modify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Code Snippet**:
```typescript
export interface StatResult {
  [key: string]: any;
  count: number;
}
```

**Estimated Time**: 3 minutes

**TypeScript Considerations**:
- The index signature allows any additional properties beyond `count`
- This pattern enables grouping by any field without creating separate types
- `count` is always `number` (TypeScript will enforce this)

---

### 6. Verify TypeScript Compilation
**Action**: Run TypeScript compiler to verify there are no errors in the new types file

**Context**: Before moving to the next task, ensure the types compile correctly and can be imported elsewhere in the codebase. This validates syntax, export statements, and TypeScript configuration.

**Acceptance**:
- Run `npm run typecheck` successfully with no errors related to `agent.ts`
- Or run `npx tsc --noEmit src/lib/types/agent.ts` for isolated verification
- No TypeScript errors in the output
- File is importable using the path alias: `import { AgentUserContext } from '@/lib/types/agent'`

**Files**:
- Verify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

**Command**:
```bash
cd /Users/vandit/Desktop/Projects/EZAudit/audit-platform
npm run typecheck
```

**Estimated Time**: 3 minutes

**Troubleshooting**:
- If `npm run typecheck` fails, check `tsconfig.json` for proper path mapping
- Ensure all interfaces are exported (missing `export` is a common error)
- Verify literal types match Prisma enums exactly (case-sensitive)

---

### 7. Create a Simple Test Import (Optional but Recommended)
**Action**: Create a minimal test file to verify the types are importable and usable

**Context**: This validates that the path alias works and the types can be consumed by other modules. It's a quick sanity check before building the MCP tools.

**Acceptance**:
- Create temporary test file `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/test-agent-types.ts`
- Successfully imports all types from `@/lib/types/agent`
- File compiles without errors
- Can delete this test file after verification

**Files**:
- Create (temporary): `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/test-agent-types.ts`

**Code Snippet**:
```typescript
// Temporary test file - can delete after verification
import {
  AgentUserContext,
  GetObservationsInput,
  GetObservationStatsInput,
  ObservationSummary,
  StatResult,
} from '@/lib/types/agent';

// Test type usage
const userContext: AgentUserContext = {
  userId: 'test',
  role: 'AUDITOR',
  email: 'test@example.com',
  name: 'Test User',
};

const input: GetObservationsInput = {
  approvalStatus: 'DRAFT',
  limit: 10,
};

console.log('Types imported successfully!', userContext, input);
```

**Command to Test**:
```bash
cd /Users/vandit/Desktop/Projects/EZAudit/audit-platform
npx tsx test-agent-types.ts
```

**Expected Output**:
```
Types imported successfully! { userId: 'test', ... }
```

**Cleanup**:
```bash
rm test-agent-types.ts
```

**Estimated Time**: 5 minutes

---

### 8. Update TASK_2.md Verification Checklist
**Action**: Mark the verification checklist items as complete in TASK_2.md

**Context**: Document completion of this task to track progress through the MVP implementation plan.

**Acceptance**:
- File `docs/agent-integration/mvp/TASK_2.md` updated
- All checklist items marked with `[x]`:
  - `[x] File src/lib/types/agent.ts exists`
  - `[x] All interfaces are properly exported`
  - `[x] No TypeScript errors when importing these types`
- Optionally add completion timestamp and any notes

**Files**:
- Modify: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/docs/agent-integration/mvp/TASK_2.md`

**Estimated Time**: 2 minutes

---

## Dependencies

**Prerequisites (from Task 1):**
- `@anthropic-ai/claude-agent-sdk` installed in `package.json`
- TypeScript configuration in `tsconfig.json` with path aliases
- Node.js and npm environment set up

**No blocking dependencies on other tasks** - Task 2 can be completed independently.

**Required for Task 3:**
- These type definitions will be imported in `src/lib/rbac-queries.ts` (Task 3)
- Specifically, `AgentUserContext` will be used in RBAC query functions

## Total Estimated Time

**30 minutes** (as originally estimated)

Breakdown:
- Subtask 1: 1 min
- Subtask 2: 3 min
- Subtask 3: 5 min
- Subtask 4: 7 min
- Subtask 5: 3 min
- Subtask 6: 3 min
- Subtask 7: 5 min (optional)
- Subtask 8: 2 min
- Buffer: 1 min

## Complete File Reference

For reference, here is the complete file that should be created:

**File**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts`

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

**Total Lines**: ~50 (as expected in README.md)

## Verification Checklist

After completing all subtasks:

- [x] Directory `src/lib/types/` exists
- [x] File `src/lib/types/agent.ts` exists with exactly 5 exported interfaces
- [x] All literal union types match Prisma schema enums exactly
- [x] TypeScript compilation succeeds: `npm run typecheck`
- [x] Types are importable via path alias: `import { AgentUserContext } from '@/lib/types/agent'`
- [x] No TypeScript errors or warnings
- [x] File has ~50 lines of code (including comments and whitespace)

**✅ TASK 2 COMPLETED** on 2025-10-26 at 20:24

**Implementation Notes:**
- All 5 interfaces created and exported successfully
- Verified enum values match Prisma schema exactly (ApprovalStatus, RiskCategory, ObservationStatus)
- TypeScript compilation passes (agent.ts has no errors)
- Path alias import tested and working with tsx
- File contains exactly 50 lines as specified
- Pre-existing TypeScript errors in other files (admin/users/page.tsx, audits/[auditId]/page.tsx) are unrelated to this task

## Common Pitfalls to Avoid

1. **Enum Case Sensitivity**: Ensure `'DRAFT'` not `'Draft'` - Prisma enums are uppercase with underscores
2. **Nullable vs Optional**: Use `string | null` for database-nullable fields, not `string?`
3. **Date Serialization**: Use `string` for `createdAt`, not `Date` (JSON serialization)
4. **Missing Exports**: All interfaces must be exported or they can't be imported
5. **Path Alias**: Use `@/lib/types/agent` not relative paths when importing
6. **Index Signature Syntax**: `[key: string]: any` requires square brackets

## Next Task

Proceed to **TASK_3.md** - Create RBAC Query Functions

**What TASK_3 will use from this task:**
- `AgentUserContext` - to identify the user making requests
- Type definitions will guide the shape of data returned by RBAC queries
