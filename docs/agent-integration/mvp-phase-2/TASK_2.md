# TASK 2: Expanded MCP Tools

## Overview
Expand the agent's capabilities by adding 4 new MCP tools to enable querying audits, searching observations, and viewing detailed information. This increases from 2 tools to 6 total tools.

## Current State
**Existing Tools (2)**:
- `get_my_observations` - Fetch observations with basic filters
- `get_observation_stats` - Aggregated statistics

## Target State
**Total Tools (6)**:
- `get_my_observations` - Existing (unchanged)
- `get_observation_stats` - Existing (unchanged)
- `get_my_audits` - **NEW** - Fetch audits user has access to
- `search_observations` - **NEW** - Full-text search
- `get_observation_details` - **NEW** - Complete observation info
- `get_audit_details` - **NEW** - Complete audit info

---

## Analysis

### Codebase Context

**Current Implementation** (`src/agent/mcp-server.ts`):
- 2 working MCP tools using the Claude Agent SDK
- Tools are defined using `tool()` function with Zod schemas
- RBAC enforcement via `rbac-queries.ts` functions (`getObservationsForUser`, `getObservationStats`)
- User context is injected through `createContextualMcpServer()` function
- All tools return structured JSON with `CallToolResult` format

**RBAC Infrastructure** (`src/lib/rbac-queries.ts`):
- Existing: `buildObservationWhereClause()`, `getObservationsForUser()`, `getObservationStats()`
- Missing (from TASK_3): `buildAuditWhereClause()`, `getAuditsForUser()`, `canAccessObservation()`, `canAccessAudit()`
- All functions handle role-based filtering at the database level

**Dependencies**:
- **TASK_3 (Enhanced RBAC)** must be completed first to provide the 4 missing RBAC helper functions
- This task cannot be fully implemented until TASK_3 is complete
- However, we can prepare tool definitions and implement observation search within existing functions

### Implementation Approach

1. **Phase 1**: Implement tools that don't require TASK_3 dependencies
   - `search_observations` - Extend existing `buildObservationWhereClause()` with search logic

2. **Phase 2**: Implement tools that require TASK_3 (blocked until TASK_3 completes)
   - `get_my_audits` - Requires `buildAuditWhereClause()`, `getAuditsForUser()`
   - `get_observation_details` - Requires `canAccessObservation()`
   - `get_audit_details` - Requires `canAccessAudit()`

3. **Tool Pattern**: All tools follow the same structure:
   - Define Zod schema for input validation
   - Create tool handler with user context
   - Call RBAC query function
   - Transform data to summary format
   - Return `CallToolResult` with JSON text content

---

## Subtasks

### 1. Implement Full-Text Search in buildObservationWhereClause()

**Action**: Extend the existing `buildObservationWhereClause()` function in `src/lib/rbac-queries.ts` to support a `searchQuery` parameter that searches across observation text fields.

**Context**: The `search_observations` tool needs full-text search capability, but we want to reuse the existing RBAC function rather than duplicating logic. This subtask adds search support to the existing function.

**Acceptance**:
- `buildObservationWhereClause()` accepts optional `searchQuery` string in filters
- Search uses Prisma `contains` with case-insensitive mode
- Searches across: `observationText`, `risksInvolved`, `auditeeFeedback`, `auditorResponseToAuditee`
- Search results still respect role-based access control
- Empty or whitespace-only queries are ignored

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/rbac-queries.ts` (modify existing function)
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/types/agent.ts` (update `ObservationFilters` interface)

**Implementation Details**:
```typescript
// In ObservationFilters interface, add:
searchQuery?: string;

// In buildObservationWhereClause(), add after existing filters:
if (filters?.searchQuery && filters.searchQuery.trim()) {
  baseFilters.push({
    OR: [
      { observationText: { contains: filters.searchQuery, mode: 'insensitive' } },
      { risksInvolved: { contains: filters.searchQuery, mode: 'insensitive' } },
      { auditeeFeedback: { contains: filters.searchQuery, mode: 'insensitive' } },
      { auditorResponseToAuditee: { contains: filters.searchQuery, mode: 'insensitive' } }
    ]
  });
}
```

---

### 2. Create search_observations MCP Tool

**Action**: Add a new MCP tool called `search_observations` to `src/agent/mcp-server.ts` in the `createContextualMcpServer()` function.

**Context**: This tool enables users to search across all observation text fields using natural language queries. It leverages the enhanced `getObservationsForUser()` function with the new search capability.

**Acceptance**:
- Tool is registered in the MCP server with name `search_observations`
- Zod schema validates: `query` (required string, min 1 char), `limit` (optional number, max 20)
- Tool handler calls `getObservationsForUser()` with `searchQuery` parameter
- Results are truncated to 200 characters for `observationText`
- Response includes which field matched (if determinable)
- Response format matches specification in original task file
- Enforces maximum limit of 20 results

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const searchObservationsTool = tool(
  'search_observations',
  'Search across observation text, risks, and feedback using keywords. Returns matching observations with truncated text.',
  z.object({
    query: z.string().min(1).describe('Search query to find in observations'),
    limit: z.number().optional().describe('Maximum results (default: 20, max: 20)')
  }).strict(),
  async (args) => {
    const limit = Math.min(args.limit || 20, 20);

    const observations = await getObservationsForUser(
      userContext.userId,
      userContext.role,
      { searchQuery: args.query, limit },
      {
        include: {
          audit: { select: { id: true, title: true } },
          plant: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    );

    // Transform results...
  }
);
```

---

### 3. Add Zod Schema for get_my_audits Tool (Preparation)

**Action**: Create the Zod schema definition for the `get_my_audits` tool, even though the tool cannot be fully implemented until TASK_3.

**Context**: Defining the schema now allows us to validate the tool interface and prepare for TASK_3 completion. This is a non-blocking preparation task.

**Acceptance**:
- Zod schema defined with parameters: `plantId` (optional string), `status` (optional enum), `limit` (optional number, default 50)
- Schema includes proper descriptions for each parameter
- Status enum matches `AuditStatus` from Prisma: `'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF'`
- Schema is ready to be used in tool definition

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts` (add schema as constant, but don't register tool yet)

**Implementation Details**:
```typescript
// Define schema (but don't create tool yet - waiting for TASK_3)
const getMyAuditsSchema = z.object({
  plantId: z.string().optional().describe('Filter by plant ID'),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF']).optional()
    .describe('Filter by audit status'),
  limit: z.number().optional().describe('Maximum results (default: 50, max: 100)')
}).strict();
```

---

### 4. Add Zod Schema for get_observation_details Tool (Preparation)

**Action**: Create the Zod schema definition for the `get_observation_details` tool.

**Context**: Preparation task for TASK_3 completion. Defining the schema validates our interface design.

**Acceptance**:
- Zod schema defined with single required parameter: `observationId` (string)
- Schema includes description
- Schema is ready for tool implementation after TASK_3

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const getObservationDetailsSchema = z.object({
  observationId: z.string().describe('The ID of the observation to fetch')
}).strict();
```

---

### 5. Add Zod Schema for get_audit_details Tool (Preparation)

**Action**: Create the Zod schema definition for the `get_audit_details` tool.

**Context**: Preparation task for TASK_3 completion.

**Acceptance**:
- Zod schema defined with single required parameter: `auditId` (string)
- Schema includes description
- Schema is ready for tool implementation after TASK_3

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const getAuditDetailsSchema = z.object({
  auditId: z.string().describe('The ID of the audit to fetch')
}).strict();
```

---

### 6. Implement get_my_audits Tool (Blocked: Requires TASK_3)

**Action**: Create and register the `get_my_audits` MCP tool using the prepared schema and TASK_3 RBAC functions.

**Context**: This tool fetches audits the user has access to. It depends on `buildAuditWhereClause()` and `getAuditsForUser()` from TASK_3.

**Dependencies**:
- **BLOCKED** until TASK_3 completes
- Requires: `buildAuditWhereClause()` function
- Requires: `getAuditsForUser()` function

**Acceptance**:
- Tool uses `getAuditsForUser()` with proper RBAC enforcement
- Includes: plant, auditHead, assignments (with auditor names), observation counts
- Returns audit summary with all fields from specification
- Calculates observation counts by grouping (DRAFT, SUBMITTED, APPROVED, by risk A/B/C)
- Enforces maximum limit of 100 results
- Returns empty array for AUDITEE/GUEST roles (as per spec)

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const getMyAuditsTool = tool(
  'get_my_audits',
  'Fetch audits you have access to based on your role. Returns audit summaries with plant info, assignments, and observation counts.',
  getMyAuditsSchema,
  async (args) => {
    const limit = Math.min(args.limit || 50, 100);

    const audits = await getAuditsForUser(
      userContext.userId,
      userContext.role,
      { plantId: args.plantId, status: args.status },
      {
        include: {
          plant: { select: { id: true, name: true, location: true } },
          auditHead: { select: { id: true, name: true, email: true } },
          assignments: {
            include: {
              auditor: { select: { id: true, name: true } }
            }
          },
          observations: {
            select: {
              id: true,
              approvalStatus: true,
              currentStatus: true,
              riskCategory: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }
    );

    // Transform to summary with observation counts...
  }
);
```

---

### 7. Implement get_observation_details Tool (Blocked: Requires TASK_3)

**Action**: Create and register the `get_observation_details` MCP tool that fetches complete details of a specific observation.

**Context**: This tool provides deep inspection of a single observation, including all relations. It must verify access before returning data.

**Dependencies**:
- **BLOCKED** until TASK_3 completes
- Requires: `canAccessObservation()` function

**Acceptance**:
- Tool calls `canAccessObservation()` before fetching data
- Returns 403-style error if user lacks access
- Fetches observation with all relations: plant, audit, attachments, approvals, assignments, actionPlans, changeRequests
- Includes full text (no truncation)
- Returns attachment metadata only (not file content)
- Approvals include approver names and timestamps
- Response format matches specification

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const getObservationDetailsTool = tool(
  'get_observation_details',
  'Fetch complete details of a specific observation including attachments, approvals, and action plans. Requires permission to access the observation.',
  getObservationDetailsSchema,
  async (args) => {
    // Check access first
    const hasAccess = await canAccessObservation(
      userContext.userId,
      userContext.role,
      args.observationId
    );

    if (!hasAccess) {
      return {
        content: [{
          type: 'text',
          text: 'You do not have permission to access this observation'
        }],
        isError: true
      } as CallToolResult;
    }

    const observation = await prisma.observation.findUnique({
      where: { id: args.observationId },
      include: {
        plant: { select: { id: true, name: true, location: true } },
        audit: { select: { id: true, title: true, status: true } },
        attachments: true,
        approvals: {
          include: {
            actor: { select: { id: true, name: true, email: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        assignments: {
          include: {
            auditee: { select: { id: true, name: true, email: true } }
          }
        },
        actionPlans: true,
        changeRequests: {
          include: {
            requester: { select: { id: true, name: true } },
            decidedBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    // Transform and return...
  }
);
```

---

### 8. Implement get_audit_details Tool (Blocked: Requires TASK_3)

**Action**: Create and register the `get_audit_details` MCP tool that fetches complete details of a specific audit.

**Context**: This tool provides deep inspection of a single audit, including assignments, checklists, and observation statistics.

**Dependencies**:
- **BLOCKED** until TASK_3 completes
- Requires: `canAccessAudit()` function

**Acceptance**:
- Tool calls `canAccessAudit()` before fetching data
- Returns 403-style error if user lacks access
- Fetches audit with all relations: plant, auditHead, assignments, auditChecklists, observations
- Calculates observation counts (total, by approval status, by current status, by risk category)
- Includes checklist titles in assignments
- Response format matches specification

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
const getAuditDetailsTool = tool(
  'get_audit_details',
  'Fetch complete details of a specific audit including plant, assignments, checklists, and observation statistics. Requires permission to access the audit.',
  getAuditDetailsSchema,
  async (args) => {
    const hasAccess = await canAccessAudit(
      userContext.userId,
      userContext.role,
      args.auditId
    );

    if (!hasAccess) {
      return {
        content: [{
          type: 'text',
          text: 'You do not have permission to access this audit'
        }],
        isError: true
      } as CallToolResult;
    }

    const audit = await prisma.audit.findUnique({
      where: { id: args.auditId },
      include: {
        plant: true,
        auditHead: { select: { id: true, name: true, email: true } },
        assignments: {
          include: {
            auditor: { select: { id: true, name: true, email: true } }
          }
        },
        auditChecklists: {
          include: {
            checklist: { select: { id: true, name: true } }
          }
        },
        observations: {
          select: {
            id: true,
            approvalStatus: true,
            currentStatus: true,
            riskCategory: true
          }
        }
      }
    });

    // Calculate observation counts and transform...
  }
);
```

---

### 9. Update Agent System Prompt with New Tool Descriptions

**Action**: Update the system prompt in `src/app/api/v1/agent/chat/route.ts` to describe the new tools and when to use them.

**Context**: The agent needs clear guidance on when to use each of the 6 tools. The system prompt should explain capabilities and use cases.

**Acceptance**:
- System prompt includes descriptions of all 6 tools
- Each tool has clear use case examples
- Prompt guides agent to:
  - Use `search_observations` for keyword searches
  - Use `get_my_audits` to list audits
  - Use `get_observation_details` for deep dives into specific observations
  - Use `get_audit_details` for audit overviews
- Prompt explains RBAC limitations (e.g., "You may not have access to all data")

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation Details**:
```typescript
const systemPrompt = `You are an AI assistant for the EZAudit platform...

AVAILABLE TOOLS:
1. get_my_observations - List observations you have access to with filters
2. get_observation_stats - Get aggregated counts by status, risk, etc.
3. search_observations - Search across observation text using keywords
4. get_my_audits - List audits you're involved in or responsible for
5. get_observation_details - Get complete details of a specific observation
6. get_audit_details - Get complete details of a specific audit

USE CASES:
- "Show me my observations" → use get_my_observations
- "How many observations are in draft?" → use get_observation_stats
- "Search for observations about inventory" → use search_observations
- "What audits am I assigned to?" → use get_my_audits
- "Tell me about observation ABC123" → use get_observation_details
- "Give me details on audit XYZ789" → use get_audit_details

IMPORTANT:
- You only see data you have permission to access based on your role
- If a tool returns an error about permissions, explain this to the user
- Observation IDs and Audit IDs are required for detail views
`;
```

---

### 10. Test search_observations Tool with Different Roles

**Action**: Manually test the `search_observations` tool with users of different roles to verify RBAC enforcement and search accuracy.

**Context**: The search tool must respect role boundaries while providing relevant results.

**Acceptance**:
- CFO can search across all observations
- AUDITOR only finds observations from their assigned audits
- AUDITEE only finds observations they're assigned to
- GUEST only finds published+approved observations
- Search is case-insensitive
- Search finds matches in all specified fields (observationText, risksInvolved, auditeeFeedback, auditorResponseToAuditee)
- Empty query returns appropriate error message

**Files**:
- Test via browser at `/agent-chat` endpoint
- Test credentials from `CLAUDE.md` (CFO, AUDITOR, AUDITEE, GUEST)

**Test Cases**:
```
1. Login as AUDITOR (auditor@example.com / auditor123)
   Query: "Search for observations about compliance"
   Expected: Only observations from audits they're assigned to

2. Login as GUEST (guest@example.com / guest123)
   Query: "Search for observations about risk"
   Expected: Only published+approved observations

3. Login as CFO (cfo@example.com / cfo123)
   Query: "Search for observations about management"
   Expected: All observations matching the search term
```

---

### 11. Test get_my_audits Tool with Different Roles (Blocked: Requires TASK_3)

**Action**: Test the `get_my_audits` tool with different user roles after TASK_3 completion.

**Dependencies**:
- **BLOCKED** until TASK_3 completes and subtask 6 is implemented

**Acceptance**:
- CFO sees all audits
- CXO_TEAM sees all audits
- AUDIT_HEAD sees audits they lead or are assigned to
- AUDITOR sees audits they're assigned to
- AUDITEE sees no audits (returns empty array)
- GUEST sees no audits (returns empty array)
- Filters work correctly (plantId, status, limit)
- Observation counts are accurate
- isLeadAuditor flag is correctly set

**Files**:
- Test via browser at `/agent-chat` endpoint

**Test Cases**:
```
1. Login as AUDIT_HEAD (audithead@example.com / audithead123)
   Query: "What audits am I leading?"
   Expected: Audits where they are auditHead

2. Login as AUDITOR (auditor@example.com / auditor123)
   Query: "Show me my audits at Plant X"
   Expected: Audits at Plant X where they're assigned

3. Login as AUDITEE (auditee@example.com / auditee123)
   Query: "What audits am I involved in?"
   Expected: Empty array with explanation
```

---

### 12. Test get_observation_details Tool Access Control (Blocked: Requires TASK_3)

**Action**: Test that `get_observation_details` properly enforces access control across different roles.

**Dependencies**:
- **BLOCKED** until TASK_3 completes and subtask 7 is implemented

**Acceptance**:
- Users can only view observations they have access to
- Attempting to view unauthorized observation returns clear error message
- All relations are properly included (attachments, approvals, assignments)
- Full text is returned (no truncation)
- Attachment metadata is correct (fileName, size, kind, uploadedAt)
- Approval history shows all approvers with timestamps

**Files**:
- Test via browser at `/agent-chat` endpoint

**Test Cases**:
```
1. Login as AUDITOR
   Query: "Show me details for observation [ID from their audit]"
   Expected: Full observation details

2. Login as AUDITOR
   Query: "Show me details for observation [ID from different auditor's audit]"
   Expected: Error message about permissions

3. Login as AUDITEE
   Query: "Show me details for observation [ID they're assigned to]"
   Expected: Full observation details
```

---

### 13. Test get_audit_details Tool Access Control (Blocked: Requires TASK_3)

**Action**: Test that `get_audit_details` properly enforces access control across different roles.

**Dependencies**:
- **BLOCKED** until TASK_3 completes and subtask 8 is implemented

**Acceptance**:
- Users can only view audits they have access to
- Attempting to view unauthorized audit returns clear error message
- All relations are properly included (plant, assignments, checklists)
- Observation counts are accurate (total, by status, by risk)
- Auditor assignments include names and emails
- Checklist information is complete

**Files**:
- Test via browser at `/agent-chat` endpoint

**Test Cases**:
```
1. Login as AUDIT_HEAD
   Query: "Show me details for audit [ID they lead]"
   Expected: Full audit details with all counts

2. Login as AUDITOR
   Query: "Show me details for audit [ID they're not assigned to]"
   Expected: Error message about permissions

3. Login as CFO
   Query: "Show me details for audit [any audit ID]"
   Expected: Full audit details (CFO has access to all)
```

---

### 14. Update Tool Count in MCP Server Registration

**Action**: Update the `createContextualMcpServer()` function to register all 6 tools (after all are implemented).

**Context**: Once all tools are ready, ensure they're all registered in the MCP server.

**Dependencies**:
- **BLOCKED** until subtasks 6, 7, and 8 are complete

**Acceptance**:
- All 6 tools are included in the `tools` array
- Tools are in logical order (existing tools first, then new ones)
- Server name and version are correct
- No duplicate tool registrations

**Files**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`

**Implementation Details**:
```typescript
return createSdkMcpServer({
  name: 'audit-data-mvp',
  version: '2.0.0', // Increment version for Phase 2
  tools: [
    // Existing tools
    testTool,
    getMyObservationsToolWithContext,
    getObservationStatsToolWithContext,
    // New tools from TASK_2
    searchObservationsTool,
    getMyAuditsTool,
    getObservationDetailsTool,
    getAuditDetailsTool
  ]
});
```

---

## Dependencies

**Critical Dependency: TASK_3 (Enhanced RBAC)**

This task has a hard dependency on TASK_3 for the following functions:
- `buildAuditWhereClause()` - Required for `get_my_audits`
- `getAuditsForUser()` - Required for `get_my_audits`
- `canAccessObservation()` - Required for `get_observation_details`
- `canAccessAudit()` - Required for `get_audit_details`

**Execution Strategy**:
1. Complete subtasks 1-5 immediately (search tool + schema preparation)
2. **Wait for TASK_3 completion**
3. Complete subtasks 6-8 (implement blocked tools)
4. Complete subtasks 9-14 (testing and finalization)

---

## Testing Checklist

### search_observations
- [x] Search finds matching observations
- [x] Search respects RBAC (user only sees their observations)
- [x] Search works across all text fields
- [x] Case-insensitive search works
- [x] Results are limited correctly
- [x] Empty query returns appropriate message

### get_my_audits (Blocked: Requires TASK_3)
- [ ] CFO sees all audits
- [ ] CXO_TEAM sees all audits
- [ ] AUDIT_HEAD sees only their audits
- [ ] AUDITOR sees only assigned audits
- [ ] AUDITEE/GUEST sees no audits
- [ ] Filters work correctly (plantId, status, limit)

### get_observation_details (Blocked: Requires TASK_3)
- [ ] Returns full observation details for authorized users
- [ ] Returns 403 for unauthorized access
- [ ] Includes all expected relations (attachments, approvals, etc.)
- [ ] Works for all roles with appropriate access

### get_audit_details (Blocked: Requires TASK_3)
- [ ] Returns full audit details for authorized users
- [ ] Returns 403 for unauthorized access
- [ ] Includes all expected relations (plant, assignments, etc.)
- [ ] Observation counts are accurate

---

## Related Tasks
- **TASK_3 (Enhanced RBAC)** - Provides the RBAC functions (BLOCKING)
- TASK_6 (Production Features) - Adds monitoring for tool usage

---

## Notes
- All tools must enforce RBAC at the database query level
- Never return data that the user doesn't have permission to see
- Include helpful error messages for debugging
- Keep response sizes reasonable (use pagination/limits)
- Consider adding caching for frequently accessed details in the future

---

## References
- MCP Server Documentation: See existing tools in `src/agent/mcp-server.ts`
- Prisma Include Documentation: https://www.prisma.io/docs/concepts/components/prisma-client/select-fields#include
- Full-text Search in Prisma: https://www.prisma.io/docs/concepts/components/prisma-client/filtering-and-sorting
- Claude Agent SDK Tool API: `docs/agent-integration/claude-agent-sdk-typescript.md`
