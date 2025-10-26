# Task 4: Create MCP Server with 2 Tools

**Duration:** 3-4 hours

## File to Create

`src/agent/mcp-server.ts`

## Implementation

This file creates an MCP server with 2 tools for the Claude agent:
1. `get_my_observations` - Fetch observations with filters
2. `get_observation_stats` - Get aggregated counts

### Full Code

See the complete implementation in the MVP_PLAN.md file, Step 4 (lines ~380-570).

### Code Structure

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getObservationsForUser, getObservationStats } from '@/lib/rbac-queries';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * Tool 1: get_my_observations
 */
const getMyObservationsTool = tool(
  'get_my_observations',
  'Description...',
  {
    // Zod schema for inputs
  },
  async (args, extra) => {
    // Implementation
  }
);

/**
 * Tool 2: get_observation_stats
 */
const getObservationStatsTool = tool(
  'get_observation_stats',
  'Description...',
  {
    // Zod schema for inputs
  },
  async (args, extra) => {
    // Implementation
  }
);

/**
 * Export MCP server instance
 */
export const auditDataMcpServer = createSdkMcpServer({
  name: 'audit-data-mvp',
  version: '1.0.0',
  tools: [
    getMyObservationsTool,
    getObservationStatsTool
  ]
});
```

**Copy the full implementation from MVP_PLAN.md Step 4 (starting at line ~380)**

## Key Points

### Tool 1: get_my_observations

**Input Parameters:**
- `auditId` (optional string)
- `approvalStatus` (optional enum)
- `riskCategory` (optional enum)
- `currentStatus` (optional enum)
- `limit` (optional number, default: 20, max: 50)

**Returns:**
- Array of observation summaries
- Count and pagination info
- Observation text truncated to 150 chars

### Tool 2: get_observation_stats

**Input Parameters:**
- `groupBy` (required: 'approvalStatus' | 'currentStatus' | 'riskCategory')
- `auditId` (optional string)

**Returns:**
- Aggregated counts grouped by the specified field
- Total count
- Filter info

## Testing

Test each tool manually by calling them with mock context:

```typescript
// Test get_my_observations
const mockContext: AgentUserContext = {
  userId: 'test-user-id',
  role: 'AUDITOR',
  email: 'test@example.com',
  name: 'Test User'
};

const result = await getMyObservationsTool.handler(
  { limit: 10 },
  mockContext
);
console.log(result);
```

## Verification

After completing this task:
- [ ] File `src/agent/mcp-server.ts` exists
- [ ] Both tools are defined and exported
- [ ] `auditDataMcpServer` is exported
- [ ] No TypeScript errors
- [ ] Manual testing shows tools return correct data
- [ ] Estimated ~200 lines of code

## Next Task

Proceed to **TASK_5.md** - Create Agent API Endpoint
