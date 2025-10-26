# Task 5: Create Agent API Endpoint

**Duration:** 2-3 hours

## File to Create

`src/app/api/v1/agent/chat/route.ts`

## Implementation

This API endpoint handles chat requests from users. It's a simple request/response model (no streaming in MVP).

### Full Code

See the complete implementation in the MVP_PLAN.md file, Step 5 (lines ~580-730).

### Code Structure

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { auth } from '@/lib/auth';
import { auditDataMcpServer } from '@/agent/mcp-server';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * POST /api/v1/agent/chat
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await req.json();
    const { message } = body;

    // 3. Create user context for MCP tools
    const userContext: AgentUserContext = {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name || session.user.email
    };

    // 4. Call Claude Agent SDK
    const agentQuery = query({
      prompt: message,
      options: {
        mcpServers: { /* ... */ },
        systemPrompt: { /* ... */ },
        allowedTools: ['get_my_observations', 'get_observation_stats'],
        permissionMode: 'bypassPermissions',
        model: 'claude-sonnet-4-5'
      }
    });

    // 5. Collect complete response (no streaming)
    let responseText = '';
    for await (const msg of agentQuery) {
      // Extract text from assistant messages
    }

    // 6. Return JSON response
    return NextResponse.json({
      success: true,
      response: responseText,
      metadata: { usage, cost }
    });

  } catch (error) {
    // Error handling
  }
}

/**
 * GET /api/v1/agent/chat
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/v1/agent/chat',
    method: 'POST'
  });
}
```

**Copy the full implementation from MVP_PLAN.md Step 5 (starting at line ~580)**

## Key Implementation Details

### System Prompt

The system prompt includes:
- User context (name, role)
- Role capabilities explanation
- Tool descriptions
- Guidelines for the agent

### Response Flow

1. User authentication via NextAuth session
2. Parse incoming message
3. Create user context object
4. Initialize Claude Agent SDK with MCP server
5. Wait for complete response (no streaming)
6. Return JSON with response text and metadata

## Testing

Test the endpoint using curl or Postman:

```bash
# First, login and get session cookie
# Then make a request:

curl -X POST http://localhost:3005/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"message": "How many observations do I have?"}'
```

Expected response:
```json
{
  "success": true,
  "response": "You have X observations. Here's the breakdown: ...",
  "metadata": {
    "usage": { ... },
    "cost": 0.008
  }
}
```

## Verification

After completing this task:
- [ ] File `src/app/api/v1/agent/chat/route.ts` exists
- [ ] POST handler is implemented
- [ ] GET health check is implemented
- [ ] No TypeScript errors
- [ ] Test with curl shows successful response
- [ ] Agent correctly calls MCP tools
- [ ] RBAC filtering works (test with different roles)

## Next Task

Proceed to **TASK_6.md** - Create Chat UI Components
