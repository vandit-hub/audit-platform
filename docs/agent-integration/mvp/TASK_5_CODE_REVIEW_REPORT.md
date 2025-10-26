# Code Review Report: Task 5 - Create Agent API Endpoint

**Review Date**: 2025-10-27
**Task File**: TASK_5.md
**Reviewer**: Task Code Reviewer Agent

## Executive Summary

The Task 5 implementation successfully creates a functional Agent API endpoint that bridges the frontend with the Claude Agent SDK. The code is well-structured, follows the MVP plan closely, and adheres to most project standards. However, there are important architectural concerns regarding the context injection pattern, type safety issues with session data, and some deviations from RBAC patterns that warrant attention before production deployment.

**Overall Assessment**: Ready for integration testing with minor fixes recommended.

## Implementation Analysis

### ✅ Strengths

1. **Clean API Route Structure**: The route handler follows Next.js App Router conventions with clear GET (health check) and POST (main logic) handlers.

2. **Comprehensive Documentation**: Excellent JSDoc comments explaining the flow, request/response formats, and purpose of each section.

3. **Proper Authentication Flow**: Uses NextAuth `auth()` function consistently with existing API route patterns, returning 401 for unauthorized requests.

4. **Input Validation**: Validates message field thoroughly (non-empty string check) before processing.

5. **Error Handling**: Comprehensive try-catch with development/production mode differentiation for error details.

6. **Non-Streaming Simplicity**: Correctly implements complete response collection before returning, matching MVP requirements.

7. **Cost Tracking**: Captures usage metadata and cost information for monitoring purposes.

8. **System Prompt Design**: Well-crafted system prompt that clearly explains role access levels and provides actionable guidelines for the agent.

9. **Security Conscious**: Hides error details in production mode to prevent information leakage.

10. **Logging Strategy**: Appropriate console logging for debugging without over-logging sensitive data.

### ⚠️ Issues & Concerns

#### 1. **CRITICAL: Type Safety Violation in Session Data**

**Location**: `route.ts` lines 82-83

```typescript
email: session.user.email || '',
name: session.user.name || session.user.email || 'Unknown User'
```

**Issue**: According to `/src/types/next-auth.d.ts`, `session.user.email` and `session.user.name` are typed as `string | null | undefined`. The implementation uses fallback values (`''` and `'Unknown User'`) which could cause issues:

1. Empty string for email doesn't make sense - email should always exist for authenticated users
2. `AgentUserContext` interface expects `email: string` and `name: string`, but doesn't specify if empty strings are acceptable
3. This deviates from the auth.ts pattern where `name: user.name ?? ""` is used during authorization

**Impact**: Potential runtime issues if downstream code expects valid emails. MCP tools use `userContext.userId` for queries, so this may not break functionality, but logging and audit trails could be affected.

**Recommendation**: 
```typescript
// Verify email exists (should always be present in authenticated session)
if (!session.user.email) {
  return NextResponse.json(
    { error: 'Invalid session: missing email' },
    { status: 401 }
  );
}

const userContext: AgentUserContext = {
  userId: session.user.id,
  role: session.user.role,
  email: session.user.email,
  name: session.user.name || session.user.email
};
```

#### 2. **Architectural Concern: Context Injection Pattern**

**Location**: `route.ts` lines 88-91, `mcp-server.ts` lines 210-362

**Issue**: The implementation introduces `createContextualMcpServer()` function to work around SDK limitations, creating per-request MCP server instances. While functional, this has implications:

**Pros**:
- Works around the SDK's lack of `extra` parameter support in MCP server config
- Successfully injects user context via closure
- Type-safe approach

**Cons**:
- Creates new MCP server instance on every request (potential performance impact)
- Code duplication: Tools are defined twice (lines 34-187 and 212-352 in mcp-server.ts)
- Deviates from the original plan (which expected `extra` parameter to work)
- ~150 lines of duplicated tool definitions

**Impact**: 
- Memory overhead: Each request creates new tool instances
- Maintenance burden: Any tool changes must be applied in two places
- Not scalable: Adding more tools doubles the duplication

**Recommendation**: This is acceptable for MVP but should be documented as technical debt. Consider:
- Factory pattern to reduce duplication
- Investigate SDK updates for native context injection support
- Performance testing with concurrent requests

#### 3. **Missing Audit Trail Logging**

**Context**: Per CLAUDE.md, significant actions should be logged via `writeAuditEvent()`

**Issue**: The API endpoint doesn't log agent queries to the audit trail. While not every query may warrant logging, this could be valuable for:
- Compliance: Tracking what data users accessed via the agent
- Security: Detecting unusual query patterns
- Analytics: Understanding how the agent is being used

**Recommendation**: Consider logging agent queries (possibly with a new action type like "AGENT_QUERY"):
```typescript
await writeAuditEvent({
  entityType: "USER",
  entityId: session.user.id,
  action: "AGENT_QUERY",
  actorId: session.user.id,
  diff: { message: message.substring(0, 200) } // Truncated for size
});
```

Note: `writeAuditEvent()` never throws, so this won't impact error handling.

#### 4. **RBAC Pattern Deviation**

**Context**: CLAUDE.md states API routes should use `assert*` functions for permission checks.

**Issue**: The endpoint doesn't use any RBAC assertion functions. While RBAC is enforced in the MCP tool layer (via `rbac-queries.ts`), the API route doesn't explicitly validate that the user role is allowed to access the agent feature.

**Current Behavior**: Any authenticated user (including GUEST with minimal permissions) can use the agent.

**Question**: Is this intentional? Should certain roles be blocked from agent access?

**Recommendation**: If agent access should be restricted, add:
```typescript
import { assertNotGuest } from '@/lib/rbac'; // If guests shouldn't use agent

const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Example: Block guests from agent access (if required)
assertNotGuest(session.user.role);
```

However, if all authenticated users should have agent access, the current approach is fine since RBAC filtering happens in the tool layer.

#### 5. **Potential Issue: Empty Response Handling**

**Location**: `route.ts` lines 148-167

**Issue**: If the agent returns no text blocks (empty `responseText`), the endpoint still returns success with an empty response:

```json
{
  "success": true,
  "response": "",
  "metadata": { ... }
}
```

**Impact**: Frontend may not handle empty responses gracefully. Users could see a blank agent response without understanding why.

**Recommendation**: Add validation after response collection:
```typescript
if (!responseText || responseText.trim().length === 0) {
  console.warn('[Agent] Empty response generated for message:', message);
  return NextResponse.json({
    success: true,
    response: 'I apologize, but I was unable to generate a response. Please try rephrasing your question.',
    metadata: { usage, cost }
  });
}
```

### 📋 Missing or Incomplete

1. **No Rate Limiting**: Agent queries are expensive. Consider adding rate limiting to prevent abuse.

2. **No Message Length Validation**: Very long messages could cause excessive token usage. Consider adding a character limit (e.g., 500 characters).

3. **No Conversation History**: MVP is stateless (each request is independent). This is intentional per the plan, but worth noting for future work.

4. **No Response Caching**: Identical queries result in duplicate API calls and costs. Simple caching could reduce costs significantly.

5. **No Timeout Handling**: Long-running agent queries could timeout. Next.js API routes have default timeouts that may not be sufficient for complex queries.

6. **Missing Health Check Verification**: The GET endpoint returns static JSON but doesn't verify that the MCP server or Claude SDK is actually functional.

## Architecture & Integration Review

### Database Integration

**Status**: ✅ Excellent

- Uses `rbac-queries.ts` functions that properly interact with Prisma
- No direct database calls in the API route (good separation of concerns)
- RBAC filtering happens at the database query level via `buildObservationWhereClause()`
- Proper handling of guest scope restrictions in `getObservationsForUser()`

### Authentication & Authorization

**Status**: ⚠️ Good with caveats

**Authentication**:
- ✅ Correctly uses `auth()` from NextAuth
- ✅ Validates `session?.user` presence
- ✅ Returns 401 for unauthenticated requests
- ⚠️ Type safety issues with session.user.email/name (see Issue #1)

**Authorization (RBAC)**:
- ✅ RBAC filtering correctly implemented in MCP tool layer
- ✅ Tools use `getObservationsForUser()` which enforces role-based access
- ✅ CFO short-circuit pattern respected in `rbac-queries.ts`
- ⚠️ No API-level role restrictions (any authenticated user can use agent)
- ✅ `permissionMode: 'bypassPermissions'` is correct since RBAC is enforced in tools

**RBAC Flow**:
```
1. API Route: Validates authentication ✅
2. API Route: Creates user context ✅
3. MCP Server: Receives user context via closure ✅
4. MCP Tools: Call rbac-queries with userId + role ✅
5. rbac-queries: Apply role-based WHERE clauses ✅
6. Prisma: Return filtered results ✅
```

### WebSocket Integration

**Status**: N/A - Not applicable for this task

Agent endpoint is REST-based and doesn't interact with WebSocket system.

### API Design

**Status**: ✅ Excellent

**Route Structure**:
- ✅ Follows `/api/v1/` versioning pattern
- ✅ RESTful resource naming (`/agent/chat`)
- ✅ Consistent with other API routes

**Request/Response Patterns**:
- ✅ JSON request body with clear schema
- ✅ Structured JSON responses
- ✅ Proper HTTP status codes (200, 400, 401, 500)
- ✅ Success/error response format consistent

**Error Handling**:
- ✅ Try-catch wraps entire handler
- ✅ Appropriate error status codes
- ✅ Development vs production error detail differentiation
- ✅ Console logging for debugging

**Type Safety**:
- ✅ Request type: `NextRequest`
- ✅ Response type: `NextResponse`
- ⚠️ Message typing could be stricter (see recommendations)

## Standards Compliance

### RBAC Patterns

**Status**: ⚠️ Partial Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Use `assert*` in API routes | ❌ Not Used | No explicit role assertions at API level |
| Use `is*` predicates elsewhere | ✅ Used | Used in `rbac-queries.ts` correctly |
| CFO short-circuit pattern | ✅ Compliant | Implemented in `rbac-queries.ts` |
| Role-appropriate permissions | ✅ Compliant | Enforced via database queries |

**Justification**: The lack of API-level assertions may be intentional since RBAC is fully enforced in the tool layer. However, this should be explicitly documented.

### Audit Trail

**Status**: ❌ Not Implemented

- No `writeAuditEvent()` calls in the endpoint
- Agent queries are not logged to audit trail
- Consider adding for compliance and analytics (see Issue #3)

### Type Safety

**Status**: ⚠️ Good with Issues

**Strengths**:
- ✅ Imports use `import type` for AgentUserContext
- ✅ Zod validation in MCP tools (from Task 4)
- ✅ Proper TypeScript return types

**Issues**:
- ⚠️ Session data type handling (email/name nullability)
- ⚠️ `usage: any` type - should be more specific
- ⚠️ Type assertions in MCP tools: `as any` on line 72, 247 in mcp-server.ts

**Recommendation**: Define proper types:
```typescript
interface AgentUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

// In POST handler:
let usage: AgentUsage | null = null;
```

### Error Handling

**Status**: ✅ Excellent

- ✅ Try-catch wraps entire POST handler
- ✅ Specific error responses (400, 401, 500)
- ✅ Development mode includes error details
- ✅ Production mode hides error details
- ✅ Console logging for debugging
- ✅ Graceful degradation

## Future Work & Dependencies

### Items for Upcoming Tasks

**TASK_6 (Chat UI Components)** depends on this endpoint:
- ✅ Response format is well-defined and ready for frontend consumption
- ✅ Success/error states clearly differentiated
- ✅ Metadata (usage, cost) available for display
- ⚠️ Frontend should handle empty responses gracefully

**Future Enhancements (Post-MVP)**:
1. **Streaming Support**: Replace complete response collection with streaming
2. **Conversation History**: Add session-based conversation state
3. **Response Caching**: Cache identical queries to reduce costs
4. **Rate Limiting**: Prevent abuse with per-user request limits
5. **Enhanced Logging**: Add detailed query analytics
6. **Timeout Configuration**: Adjust API route timeouts for long queries
7. **Tool Selection Optimization**: Allow agent to dynamically choose tools based on query complexity

### Blockers & Dependencies

**No Blockers Identified**:
- ✅ All dependencies from prior tasks are complete (Task 2, 3, 4)
- ✅ Claude Agent SDK is installed and functional
- ✅ NextAuth is configured and working
- ✅ Database schema supports all required queries

**Integration Points Ready**:
- ✅ MCP server exports `createContextualMcpServer` function
- ✅ RBAC query functions are available and tested
- ✅ Type definitions are complete

## Recommendations

### High Priority

1. **Add Session Email Validation** (Issue #1)
   - Verify `session.user.email` exists before proceeding
   - Prevents edge cases with invalid sessions
   - Estimated effort: 5 minutes

2. **Handle Empty Responses** (Issue #5)
   - Add fallback message if agent returns empty text
   - Improves user experience
   - Estimated effort: 10 minutes

3. **Document Context Injection Pattern** (Issue #2)
   - Add comments explaining why `createContextualMcpServer` is needed
   - Mark as technical debt for refactoring
   - Link to SDK documentation or issue tracker
   - Estimated effort: 15 minutes

### Medium Priority

1. **Add Message Length Validation**
   - Prevent excessive token usage from very long messages
   - Suggested limit: 500-1000 characters
   - Return 400 with clear error message
   - Estimated effort: 10 minutes

2. **Consider Audit Trail Logging** (Issue #3)
   - Log agent queries for compliance/analytics
   - Use truncated message to prevent bloat
   - Estimated effort: 20 minutes

3. **Improve Type Definitions**
   - Replace `usage: any` with specific interface
   - Document expected structure
   - Estimated effort: 15 minutes

4. **Clarify RBAC Policy** (Issue #4)
   - Document whether all authenticated users should access agent
   - Add role restrictions if necessary
   - Estimated effort: 10 minutes + policy decision

### Low Priority / Nice-to-Have

1. **Enhanced Health Check**
   - Verify MCP server is functional
   - Test database connectivity
   - Estimated effort: 30 minutes

2. **Add Request ID for Tracing**
   - Generate unique ID per request
   - Include in logs and responses
   - Useful for debugging
   - Estimated effort: 20 minutes

3. **Rate Limiting**
   - Implement per-user request limits
   - Prevent cost runaway
   - Estimated effort: 2-3 hours (post-MVP)

## Detailed Code Analysis

### File: `/src/app/api/v1/agent/chat/route.ts`

**Location**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`
**Purpose**: REST API endpoint for agent chat functionality
**Lines**: 192

#### Section 1: Imports and Documentation (Lines 1-21)

**Findings**:
- ✅ Clean imports with proper path aliases (`@/`)
- ✅ Type import uses `import type` syntax (best practice)
- ✅ Comprehensive file-level JSDoc explaining flow
- ✅ All necessary dependencies imported

**Code Quality**: Excellent

#### Section 2: GET Handler - Health Check (Lines 27-34)

**Findings**:
- ✅ Simple health check endpoint
- ✅ Returns appropriate metadata
- ✅ Follows pattern from other API routes
- ⚠️ Could be enhanced to verify MCP server health

**Code Quality**: Good

**Suggested Enhancement**:
```typescript
export async function GET() {
  // Optional: Verify MCP server is healthy
  try {
    const { createContextualMcpServer } = await import('@/agent/mcp-server');
    // Basic smoke test - create server instance
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/v1/agent/chat',
      method: 'POST',
      description: 'AI Agent chat endpoint (MVP - simple request/response)',
      mcpServerReady: true
    });
  } catch (error) {
    return NextResponse.json({
      status: 'degraded',
      endpoint: '/api/v1/agent/chat',
      method: 'POST',
      description: 'AI Agent chat endpoint (MVP - simple request/response)',
      mcpServerReady: false,
      error: 'MCP server initialization failed'
    }, { status: 503 });
  }
}
```

#### Section 3: POST Handler - Authentication (Lines 56-65)

**Findings**:
- ✅ Correct usage of NextAuth `auth()` function
- ✅ Validates session existence
- ✅ Returns 401 for unauthorized requests
- ✅ Consistent with patterns in `/api/v1/observations/route.ts`

**Code Quality**: Excellent

#### Section 4: Request Parsing and Validation (Lines 67-76)

**Findings**:
- ✅ Parses JSON body correctly
- ✅ Validates message field presence
- ✅ Type checking (string validation)
- ✅ Trim validation prevents whitespace-only messages
- ✅ Returns 400 with clear error message
- ⚠️ Missing length validation (could be very long)

**Code Quality**: Very Good

**Suggested Enhancement**:
```typescript
const MAX_MESSAGE_LENGTH = 1000;

if (!message || typeof message !== 'string' || message.trim().length === 0) {
  return NextResponse.json(
    { error: 'Message is required and must be a non-empty string' },
    { status: 400 }
  );
}

if (message.length > MAX_MESSAGE_LENGTH) {
  return NextResponse.json(
    { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` },
    { status: 400 }
  );
}
```

#### Section 5: User Context Creation (Lines 78-86)

**Findings**:
- ✅ Creates proper `AgentUserContext` object
- ⚠️ **CRITICAL**: Type safety issue with email/name (see Issue #1)
- ✅ Good logging statement for debugging
- ✅ Includes all required fields

**Code Quality**: Good (with type safety concern)

**Current Code**:
```typescript
const userContext: AgentUserContext = {
  userId: session.user.id,
  role: session.user.role,
  email: session.user.email || '', // ⚠️ Empty string fallback
  name: session.user.name || session.user.email || 'Unknown User' // ⚠️ Unknown User fallback
};
```

**Issue**: Session type defines `email?: string | null` but code provides empty string fallback instead of validating presence.

**Recommended Fix** (see High Priority #1).

#### Section 6: MCP Server Instantiation (Lines 88-91)

**Findings**:
- ✅ Dynamic import of `createContextualMcpServer`
- ✅ Creates per-request server instance with user context
- ✅ Properly awaits async import
- ⚠️ No error handling for import failure (caught by outer try-catch)

**Code Quality**: Good

**Architectural Note**: This pattern is necessary due to SDK limitations but creates overhead. See Issue #2 for details.

#### Section 7: Claude Agent SDK Configuration (Lines 94-146)

**Findings**:
- ✅ Correct `query()` function usage
- ✅ Proper MCP server configuration (type: 'sdk', instance)
- ✅ Excellent system prompt design:
  - User context included (name, role)
  - Role access levels clearly explained
  - Tool usage guidelines provided
  - Emphasis on RBAC pre-filtering
- ✅ Allowed tools explicitly listed (security best practice)
- ✅ `permissionMode: 'bypassPermissions'` correct (RBAC in tool layer)
- ✅ Model selection appropriate (`claude-sonnet-4-5`)
- ✅ `includePartialMessages: false` correct for non-streaming

**Code Quality**: Excellent

**System Prompt Analysis**:
The system prompt is well-crafted and provides clear guidance:
1. Explains current user's role and access level
2. Lists all role permissions for context
3. Instructs agent to use tools (prevents hallucination)
4. Provides formatting guidelines
5. Emphasizes data is pre-filtered (important for accuracy)

**Potential Enhancement**: Could add example queries for common use cases.

#### Section 8: Response Collection Loop (Lines 148-167)

**Findings**:
- ✅ Correct for-await-of syntax for async iteration
- ✅ Properly handles different message types (`assistant`, `result`)
- ✅ Accumulates text from content blocks
- ✅ Extracts usage and cost metadata
- ✅ Fallback value for cost (0)
- ✅ Logging includes cost information
- ⚠️ No handling for empty responseText (see Issue #5)
- ⚠️ `usage: any` type is too loose

**Code Quality**: Very Good

**Type Safety Enhancement**:
```typescript
interface MessageBlock {
  type: string;
  text?: string;
}

interface AssistantMessage {
  type: 'assistant';
  message: {
    content: MessageBlock[];
  };
}

interface ResultMessage {
  type: 'result';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  total_cost_usd?: number;
}
```

#### Section 9: Success Response (Lines 171-179)

**Findings**:
- ✅ Returns structured JSON
- ✅ Includes success flag (useful for frontend)
- ✅ Includes complete response text
- ✅ Includes metadata for monitoring
- ✅ HTTP 200 implicit (correct)
- ⚠️ No validation that responseText is non-empty

**Code Quality**: Very Good

#### Section 10: Error Handling (Lines 180-190)

**Findings**:
- ✅ Comprehensive try-catch
- ✅ Logs error with `[Agent]` prefix for filtering
- ✅ Returns 500 status
- ✅ Generic error message for security
- ✅ Conditional error details (dev vs prod)
- ✅ Consistent error response structure

**Code Quality**: Excellent

**Best Practice**: The `process.env.NODE_ENV === 'development'` check is the correct way to conditionally expose error details.

---

### File: `/src/agent/mcp-server.ts` (Modified)

**Location**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/agent/mcp-server.ts`
**Purpose**: MCP server with context injection via closure
**Lines**: 363 (increased from ~200 in Task 4)

#### Key Addition: `createContextualMcpServer()` Function (Lines 210-362)

**Findings**:
- ✅ Solves the context injection problem
- ✅ Uses closure pattern effectively
- ✅ Tools access `userContext` directly (no `extra` parameter needed)
- ⚠️ **CRITICAL**: ~150 lines of code duplication
- ⚠️ Maintenance burden: tool changes must be made twice
- ⚠️ Performance: Creates new server instance per request

**Code Quality**: Functional but with architectural concerns

**Duplication Analysis**:
- Lines 34-125: `getMyObservationsTool` (original)
- Lines 212-299: `getMyObservationsToolWithContext` (duplicate)
- Lines 133-187: `getObservationStatsTool` (original)
- Lines 301-352: `getObservationStatsToolWithContext` (duplicate)

**Differences**: Only difference is `args, extra` vs `args` in handler signature, and `extra as AgentUserContext` vs direct `userContext` closure access.

**Refactoring Suggestion** (Post-MVP):
```typescript
// Factory function to create tool with context
function createGetMyObservationsTool(userContext?: AgentUserContext) {
  return tool(
    'get_my_observations',
    'Fetches observations the user has access to...',
    { /* schema */ },
    async (args, extra) => {
      const context = userContext || (extra as AgentUserContext);
      // Single implementation
    }
  );
}

// Default export (no context)
export const auditDataMcpServer = createSdkMcpServer({
  name: 'audit-data-mvp',
  version: '1.0.0',
  tools: [createGetMyObservationsTool(), createGetObservationStatsTool()]
});

// Context-aware export
export function createContextualMcpServer(userContext: AgentUserContext) {
  return createSdkMcpServer({
    name: 'audit-data-mvp',
    version: '1.0.0',
    tools: [
      createGetMyObservationsTool(userContext),
      createGetObservationStatsTool(userContext)
    ]
  });
}
```

This eliminates duplication while maintaining both patterns.

## Conclusion

**Overall Assessment**: **Ready for integration testing with recommended fixes**

### Summary

The Task 5 implementation successfully delivers a functional Agent API endpoint that:
- ✅ Authenticates users via NextAuth
- ✅ Validates input properly
- ✅ Integrates with Claude Agent SDK correctly
- ✅ Enforces RBAC through the tool layer
- ✅ Returns structured responses with metadata
- ✅ Handles errors gracefully

### Critical Fixes Needed Before Production

1. **Session Type Safety** (High Priority #1): Add email validation to prevent edge cases
2. **Empty Response Handling** (High Priority #2): Provide fallback message for empty agent responses
3. **Document Technical Debt** (High Priority #3): Explain context injection pattern and mark for refactoring

### Recommended for Integration Testing

1. **Message Length Validation** (Medium Priority #1): Prevent token usage abuse
2. **Audit Trail Logging** (Medium Priority #3): Log queries for compliance
3. **Type Improvements** (Medium Priority #3): Replace `any` types with specific interfaces

### Post-MVP Improvements

1. Refactor `createContextualMcpServer` to eliminate code duplication
2. Add rate limiting for cost control
3. Implement response caching for common queries
4. Add streaming support for better UX
5. Implement conversation history for context-aware queries

### Critical Next Steps

1. ✅ **Mark Task 5 as complete** (pending minor fixes)
2. ✅ **Proceed to Task 6** (Chat UI Components) - API contract is stable
3. ⚠️ **Apply High Priority fixes** before Task 8 (Integration Testing)
4. 📝 **Document** the context injection pattern in code comments
5. 🧪 **Test** with different user roles to verify RBAC enforcement
6. 💰 **Monitor** costs during development to establish baselines

### API Contract for Frontend (Task 6)

**Request**:
```typescript
POST /api/v1/agent/chat
Content-Type: application/json

{
  "message": "How many high-risk observations do I have?"
}
```

**Success Response** (200):
```typescript
{
  "success": true,
  "response": "Based on the data, you have 5 high-risk observations...",
  "metadata": {
    "usage": {
      "input_tokens": 450,
      "output_tokens": 120
    },
    "cost": 0.0034
  }
}
```

**Error Responses**:
- 401: `{ "error": "Unauthorized" }`
- 400: `{ "error": "Message is required and must be a non-empty string" }`
- 500: `{ "success": false, "error": "...", "details": "..." }` (dev mode only)

**Frontend Implementation Notes**:
- Session cookies are automatically included (no manual auth needed)
- Handle empty `response` field gracefully (though should be rare)
- Display `metadata.cost` for transparency
- Show loading state during request (can take 3-10 seconds)
- Handle network errors and timeout scenarios

---

**Task 5 Status**: ✅ **COMPLETE** (with recommended fixes for production)

**Ready for Task 6**: ✅ **YES**

**Blocker Issues**: ❌ **NONE**

**Technical Debt Created**: 📝 Code duplication in `createContextualMcpServer()` (~150 lines)

**Security Review**: ✅ **PASSED** (no sensitive data exposure, proper auth, RBAC enforced)

**Performance Concerns**: ⚠️ Per-request MCP server instantiation (acceptable for MVP, monitor in production)
