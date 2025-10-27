# TASK 6: Production Features

## Overview
Add production-grade features to make the agent system robust, secure, and observable. This includes rate limiting, audit logging, structured monitoring, and comprehensive error categorization.

## Current State
- No rate limiting (vulnerable to abuse)
- No audit trail for agent queries
- Basic console.log statements for debugging
- Generic error handling

## Target State
- Rate limiting to prevent abuse (20 requests/minute per user)
- Comprehensive audit logging for compliance
- Structured JSON logging for observability
- Categorized error handling with proper HTTP status codes
- Environment-based configuration

## Analysis

### Codebase Context

**Current API Implementation** (`src/app/api/v1/agent/chat/route.ts`):
- Uses Server-Sent Events (SSE) for streaming responses (TASK 1 completed)
- Has basic try-catch error handling but no categorization
- Uses simple console.log statements for debugging
- No rate limiting implemented
- No audit trail for agent interactions

**Existing Infrastructure**:
- `writeAuditEvent()` in `src/server/auditTrail.ts` - Never throws errors, safe for fire-and-forget logging
- `EntityType` enum in Prisma schema - **AGENT_QUERY does NOT exist yet** - needs to be added
- `.env.example` - Ready for new environment variables
- No existing `src/lib/config/` or `src/lib/errors/` directories

**Dependencies**:
- Task 1 (Streaming) is complete - rate limiting and logging apply to streaming responses
- Task 5 (UI/UX) - Error categorization messages must match UI expectations
- Database schema change needed (add AGENT_QUERY to EntityType)

### Implementation Strategy

This task breaks down into 5 independent modules that can be implemented in parallel (except error handling must be created before integration):

1. **Error Categorization Module** (new file) - Create first, used by others
2. **Configuration Module** (new file) - Create first, used by others
3. **Rate Limiting** (inline in API route) - Can be implemented after config module
4. **Audit Logging** (inline in API route) - Independent, uses existing function
5. **Structured Logging** (inline in API route) - Independent, integrates throughout

### Complexity Assessment

- **Error Categorization**: Simple - Pattern matching on error messages
- **Configuration Module**: Simple - Environment variable parsing with defaults
- **Rate Limiting**: Medium - In-memory Map with cleanup, role-based limits optional
- **Audit Logging**: Simple - Call existing writeAuditEvent function
- **Structured Logging**: Medium - JSON formatting, integration across streaming flow

---

## Subtasks

### 1. Create Error Categorization Module

**Action**: Create a new error handling module that categorizes errors and provides user-friendly messages with appropriate HTTP status codes.

**Context**: Currently, the API route has generic error handling that returns a 500 status for all errors. This task creates a reusable module that categorizes errors (authentication, authorization, validation, rate limit, database, agent service, network, unknown) and maps them to appropriate HTTP status codes and user-friendly messages.

**Acceptance Criteria**:
- [ ] File created at `src/lib/errors/agent-errors.ts`
- [ ] `AgentErrorCategory` enum defined with 8 categories
- [ ] `CategorizedError` interface defined with category, statusCode, userMessage, logMessage
- [ ] `categorizeError()` function implemented with pattern matching for all categories
- [ ] Authentication errors return 401
- [ ] Authorization errors return 403
- [ ] Validation errors return 400
- [ ] Rate limit errors return 429
- [ ] Database errors return 500
- [ ] Agent service errors return 500
- [ ] Network errors return 503
- [ ] Unknown errors return 500 with generic message
- [ ] All user messages are friendly and actionable
- [ ] All log messages include original error details

**Files**:
- Create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/errors/agent-errors.ts`

**Implementation Steps**:

1. Create the directory structure:
```bash
mkdir -p src/lib/errors
```

2. Create the file with the following structure:

```typescript
/**
 * Agent Error Categorization Module
 *
 * Categorizes errors from the agent chat API and provides appropriate
 * HTTP status codes and user-friendly messages.
 */

export enum AgentErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  AGENT_SERVICE = 'AGENT_SERVICE',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

export interface CategorizedError {
  category: AgentErrorCategory;
  statusCode: number;
  userMessage: string;
  logMessage: string;
  originalError?: unknown;
}

export function categorizeError(error: unknown): CategorizedError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Authentication errors (401)
  if (
    errorMessage.includes('Unauthorized') ||
    errorMessage.includes('not authenticated') ||
    errorMessage.includes('session') ||
    errorMessage.includes('token')
  ) {
    return {
      category: AgentErrorCategory.AUTHENTICATION,
      statusCode: 401,
      userMessage: 'You are not authenticated. Please log in and try again.',
      logMessage: `Authentication error: ${errorMessage}`,
      originalError: error
    };
  }

  // Authorization errors (403)
  if (
    errorMessage.includes('Forbidden') ||
    errorMessage.includes('permission') ||
    errorMessage.includes('not authorized') ||
    errorMessage.includes('access denied')
  ) {
    return {
      category: AgentErrorCategory.AUTHORIZATION,
      statusCode: 403,
      userMessage: 'You do not have permission to perform this action.',
      logMessage: `Authorization error: ${errorMessage}`,
      originalError: error
    };
  }

  // Validation errors (400)
  if (
    errorMessage.includes('invalid') ||
    errorMessage.includes('required') ||
    errorMessage.includes('validation') ||
    errorMessage.includes('must be')
  ) {
    return {
      category: AgentErrorCategory.VALIDATION,
      statusCode: 400,
      userMessage: 'Invalid request. Please check your input and try again.',
      logMessage: `Validation error: ${errorMessage}`,
      originalError: error
    };
  }

  // Rate limit errors (429)
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('quota exceeded')
  ) {
    return {
      category: AgentErrorCategory.RATE_LIMIT,
      statusCode: 429,
      userMessage: 'You have sent too many requests. Please wait a moment and try again.',
      logMessage: `Rate limit error: ${errorMessage}`,
      originalError: error
    };
  }

  // Database errors (500)
  if (
    errorMessage.includes('prisma') ||
    errorMessage.includes('database') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('query failed') ||
    errorMessage.includes('ECONNREFUSED')
  ) {
    return {
      category: AgentErrorCategory.DATABASE,
      statusCode: 500,
      userMessage: 'A database error occurred. Our team has been notified. Please try again later.',
      logMessage: `Database error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Agent service errors (500)
  if (
    errorMessage.includes('anthropic') ||
    errorMessage.includes('claude') ||
    errorMessage.includes('AI') ||
    errorMessage.includes('model') ||
    errorMessage.includes('API key')
  ) {
    return {
      category: AgentErrorCategory.AGENT_SERVICE,
      statusCode: 500,
      userMessage: 'The AI service is temporarily unavailable. Please try again in a few moments.',
      logMessage: `Agent service error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Network errors (503)
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('fetch failed')
  ) {
    return {
      category: AgentErrorCategory.NETWORK,
      statusCode: 503,
      userMessage: 'Network error. Please check your connection and try again.',
      logMessage: `Network error: ${errorMessage}\nStack: ${errorStack}`,
      originalError: error
    };
  }

  // Unknown errors (500)
  return {
    category: AgentErrorCategory.UNKNOWN,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again later.',
    logMessage: `Unknown error: ${errorMessage}\nStack: ${errorStack}`,
    originalError: error
  };
}
```

**Testing Considerations**:
- Test each error category with sample error messages
- Verify correct status codes returned
- Verify user messages are helpful
- Verify log messages include stack traces

**Estimated Complexity**: Simple (1 hour)

---

### 2. Create Configuration Module

**Action**: Create a centralized configuration module for agent-related settings with environment variable support and sensible defaults.

**Context**: Agent configuration (rate limits, feature flags, logging levels) is currently scattered or hardcoded. This creates a single source of truth for all agent-related configuration that reads from environment variables with fallback defaults.

**Acceptance Criteria**:
- [ ] File created at `src/lib/config/agent.ts`
- [ ] `agentConfig` object exported with three sections: rateLimit, features, logging
- [ ] `rateLimit.requests` defaults to 20 (configurable via AGENT_RATE_LIMIT_REQUESTS)
- [ ] `rateLimit.windowMs` defaults to 60000 (configurable via AGENT_RATE_LIMIT_WINDOW_MS)
- [ ] `features.streaming` defaults to true (configurable via AGENT_STREAMING_ENABLED)
- [ ] `features.auditLogging` defaults to true (configurable via AGENT_AUDIT_LOGGING_ENABLED)
- [ ] `logging.level` defaults to 'info' (configurable via LOG_LEVEL)
- [ ] All values are properly typed
- [ ] Environment variables are parsed correctly (parseInt for numbers)
- [ ] Boolean parsing handles 'false' string correctly

**Files**:
- Create: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/config/agent.ts`
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/.env.example` (add new variables)

**Implementation Steps**:

1. Create the directory structure:
```bash
mkdir -p src/lib/config
```

2. Create the file with the following structure:

```typescript
/**
 * Agent Configuration Module
 *
 * Centralized configuration for AI agent features with environment
 * variable support and sensible defaults.
 */

export interface AgentConfig {
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  features: {
    streaming: boolean;
    auditLogging: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Parse boolean from environment variable
 * Handles 'true', 'false', '1', '0' strings
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse integer from environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse log level from environment variable
 */
function parseLogLevel(value: string | undefined): 'debug' | 'info' | 'warn' | 'error' {
  if (!value) return 'info';
  const lower = value.toLowerCase();
  if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error') {
    return lower;
  }
  return 'info';
}

/**
 * Agent configuration object
 *
 * All values can be overridden via environment variables.
 * Defaults are production-safe and suitable for MVP deployment.
 */
export const agentConfig: AgentConfig = {
  // Rate limiting configuration
  rateLimit: {
    // Maximum requests per user per window (default: 20)
    requests: parseInt(process.env.AGENT_RATE_LIMIT_REQUESTS, 20),

    // Time window in milliseconds (default: 60000 = 1 minute)
    windowMs: parseInt(process.env.AGENT_RATE_LIMIT_WINDOW_MS, 60000)
  },

  // Feature flags
  features: {
    // Enable Server-Sent Events streaming (default: true)
    streaming: parseBoolean(process.env.AGENT_STREAMING_ENABLED, true),

    // Enable audit event logging to database (default: true)
    auditLogging: parseBoolean(process.env.AGENT_AUDIT_LOGGING_ENABLED, true)
  },

  // Logging configuration
  logging: {
    // Log level: debug, info, warn, error (default: info)
    level: parseLogLevel(process.env.LOG_LEVEL)
  }
};
```

**Testing Considerations**:
- Test with environment variables set
- Test with environment variables missing (use defaults)
- Test boolean parsing for feature flags
- Test integer parsing for numeric values

**Estimated Complexity**: Simple (30 minutes)

---

### 3. Add Environment Variables to .env.example

**Action**: Document all new environment variables in `.env.example` for agent configuration.

**Context**: New configuration options need to be documented so developers know what can be configured.

**Acceptance Criteria**:
- [ ] AGENT_RATE_LIMIT_REQUESTS documented with default value (20)
- [ ] AGENT_RATE_LIMIT_WINDOW_MS documented with default value (60000)
- [ ] AGENT_STREAMING_ENABLED documented with default value (true)
- [ ] AGENT_AUDIT_LOGGING_ENABLED documented with default value (true)
- [ ] LOG_LEVEL documented with options (debug, info, warn, error)
- [ ] All variables have clear comments explaining their purpose
- [ ] Variables are grouped in a new "Agent Configuration" section

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/.env.example`

**Implementation Steps**:

Add the following section to `.env.example` after the WebSocket Configuration section:

```bash
# --- Agent Configuration ---
# Rate limiting for AI agent queries (expensive API calls)
AGENT_RATE_LIMIT_REQUESTS="20"        # Max requests per user per window (default: 20)
AGENT_RATE_LIMIT_WINDOW_MS="60000"    # Time window in milliseconds (default: 60000 = 1 minute)

# Feature flags for agent functionality
AGENT_STREAMING_ENABLED="true"        # Enable Server-Sent Events streaming (default: true)
AGENT_AUDIT_LOGGING_ENABLED="true"    # Enable audit trail logging for agent queries (default: true)

# Logging configuration
LOG_LEVEL="info"                      # Options: debug, info, warn, error (default: info)
```

**Testing Considerations**:
- Verify .env.example is valid and parseable
- Test that defaults work when .env doesn't have these variables

**Estimated Complexity**: Simple (10 minutes)

---

### 4. Implement In-Memory Rate Limiting

**Action**: Add in-memory rate limiting to prevent abuse of the expensive agent chat endpoint.

**Context**: Agent queries are expensive (Claude API costs). Without rate limiting, users could accidentally or maliciously send unlimited requests, causing cost spikes. This implements a simple in-memory rate limiter with automatic cleanup.

**Acceptance Criteria**:
- [ ] `rateLimitMap` Map created at module level in route.ts
- [ ] `checkRateLimit()` function implemented with userId, maxRequests, windowMs parameters
- [ ] Function creates new window when user not in map or window expired
- [ ] Function returns false when count exceeds maxRequests
- [ ] Function increments count on each successful check
- [ ] `setInterval` cleanup runs every 60 seconds to prevent memory leaks
- [ ] Cleanup removes expired entries from rateLimitMap
- [ ] Rate limit check runs after authentication but before agent query
- [ ] 429 status returned when rate limit exceeded
- [ ] Error message includes helpful information (max requests, time to wait)
- [ ] Rate limit exceeded events logged with structured JSON
- [ ] Configuration values read from `agentConfig`
- [ ] OPTIONAL: Role-based limits implemented via `getRateLimitForRole()` helper

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation Steps**:

1. Add imports at the top of the file:
```typescript
import { agentConfig } from '@/lib/config/agent';
```

2. Add rate limiting types and map at module level (after imports, before GET/POST handlers):
```typescript
/**
 * Rate Limiting
 *
 * In-memory rate limiting to prevent abuse of expensive agent queries.
 * Uses a Map to track requests per user with automatic cleanup.
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if user has exceeded rate limit
 *
 * @param userId - User ID to check
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request allowed, false if rate limit exceeded
 */
function checkRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  // No entry or window expired - create new window
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  // Within window - check count
  if (entry.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Increment count and allow
  entry.count++;
  return true;
}

/**
 * Cleanup expired rate limit entries
 * Runs every 60 seconds to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = agentConfig.rateLimit.windowMs;

  for (const [userId, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > windowMs) {
      rateLimitMap.delete(userId);
    }
  }
}, 60000); // Cleanup every minute
```

3. Add rate limit check in POST handler (after authentication, before creating user context):
```typescript
// After the session validation (around line 73)

// Check rate limit
const rateLimitAllowed = checkRateLimit(
  session.user.id,
  agentConfig.rateLimit.requests,
  agentConfig.rateLimit.windowMs
);

if (!rateLimitAllowed) {
  const waitTimeSeconds = Math.ceil(agentConfig.rateLimit.windowMs / 1000);

  console.log(JSON.stringify({
    level: 'WARN',
    type: 'rate_limit_exceeded',
    userId: session.user.id,
    role: session.user.role,
    maxRequests: agentConfig.rateLimit.requests,
    windowMs: agentConfig.rateLimit.windowMs,
    timestamp: new Date().toISOString()
  }));

  return NextResponse.json(
    {
      error: `Rate limit exceeded. You can make up to ${agentConfig.rateLimit.requests} requests per minute. Please wait ${waitTimeSeconds} seconds and try again.`
    },
    { status: 429 }
  );
}
```

**Optional: Role-Based Rate Limits**:

Add this function after `checkRateLimit()`:

```typescript
/**
 * Get role-specific rate limit
 *
 * @param role - User role
 * @returns Maximum requests for this role
 */
function getRateLimitForRole(role: string): number {
  switch (role) {
    case 'CFO':
    case 'CXO_TEAM':
      return 100; // Higher limit for management
    case 'AUDIT_HEAD':
      return 50;
    case 'AUDITOR':
      return 30;
    case 'AUDITEE':
      return 20;
    case 'GUEST':
      return 10; // Lower limit for guests
    default:
      return agentConfig.rateLimit.requests; // Use default
  }
}
```

Then update the rate limit check to use role-based limits:
```typescript
const maxRequests = getRateLimitForRole(session.user.role);
const rateLimitAllowed = checkRateLimit(
  session.user.id,
  maxRequests,
  agentConfig.rateLimit.windowMs
);
```

**Testing Considerations**:
- Send 20 requests rapidly - all should succeed
- Send 21st request - should return 429
- Wait 1 minute - rate limit should reset
- Verify cleanup interval doesn't cause memory leaks
- Test with different maxRequests values
- OPTIONAL: Test role-based limits if implemented

**Estimated Complexity**: Medium (1.5 hours)

---

### 5. Implement Audit Event Logging

**Action**: Log all agent queries to the audit trail for compliance, analytics, and troubleshooting.

**Context**: The platform already has an audit trail system (`writeAuditEvent` in `src/server/auditTrail.ts`). This task integrates it with the agent system to track all queries, tools called, tokens used, and costs.

**Acceptance Criteria**:
- [ ] `writeAuditEvent` imported from `@/server/auditTrail`
- [ ] `extractToolsCalled()` helper function created to parse tool names from agent messages
- [ ] Function returns array of unique tool names from tool_use messages
- [ ] `logAuditEvent()` helper function created with parameters: session, message, responseText, usage, cost, toolsCalled
- [ ] Audit event logged after successful agent response (before streaming completion)
- [ ] entityType set to 'AGENT_QUERY'
- [ ] entityId set to session.user.id (or unique query ID if generated)
- [ ] action set to 'QUERY'
- [ ] actorId set to session.user.id
- [ ] metadata includes: query text, responseLength, toolsCalled array, usage object (inputTokens, outputTokens, totalTokens), cost, timestamp
- [ ] Audit logging wrapped in try-catch to never break the response flow
- [ ] Feature flag checked from `agentConfig.features.auditLogging`
- [ ] Query text truncated if too long (e.g., first 500 chars)

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation Steps**:

1. Add imports at the top:
```typescript
import { writeAuditEvent } from '@/server/auditTrail';
```

2. Add helper functions at module level (after rate limiting functions):
```typescript
/**
 * Extract tool names from agent messages
 *
 * @param agentMessages - Messages from the agent SDK query
 * @returns Array of unique tool names used
 */
function extractToolsCalled(agentMessages: any[]): string[] {
  const tools = new Set<string>();

  for (const msg of agentMessages) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use' && block.name) {
          tools.add(block.name);
        }
      }
    }
  }

  return Array.from(tools);
}

/**
 * Log agent query to audit trail
 *
 * Logs all queries for compliance and analytics.
 * Never throws errors - wrapped in try-catch.
 *
 * @param session - User session
 * @param message - User query text
 * @param responseText - Agent response text
 * @param usage - Token usage statistics
 * @param cost - Query cost in USD
 * @param toolsCalled - Array of tool names used
 */
async function logAuditEvent(
  session: any,
  message: string,
  responseText: string,
  usage: any,
  cost: number,
  toolsCalled: string[]
): Promise<void> {
  // Check feature flag
  if (!agentConfig.features.auditLogging) {
    return;
  }

  try {
    await writeAuditEvent({
      entityType: 'AGENT_QUERY',
      entityId: session.user.id,
      action: 'QUERY',
      actorId: session.user.id,
      diff: {
        query: message.slice(0, 500), // Truncate long queries
        responseLength: responseText.length,
        toolsCalled,
        usage: {
          inputTokens: usage?.input_tokens || 0,
          outputTokens: usage?.output_tokens || 0,
          totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
        },
        cost,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Never throw - just log the error
    console.error('[Agent] Failed to write audit event:', error);
  }
}
```

3. Modify the streaming handler to collect messages and log after completion:

In the POST handler, update the stream creation to track messages and log on completion:

```typescript
// Add variables to track response data
let collectedText = '';
let finalUsage: any = null;
let finalCost = 0;
const allMessages: any[] = [];

// Inside the ReadableStream start function:
const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();

    try {
      for await (const msg of agentQuery) {
        allMessages.push(msg); // Track all messages

        if (msg.type === 'assistant') {
          // Stream text blocks as they arrive
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              collectedText += block.text; // Collect full response
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`
              ));
            }
          }
        }

        if (msg.type === 'result') {
          finalUsage = msg.usage;
          finalCost = msg.total_cost_usd || 0;

          // Send final metadata
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              type: 'metadata',
              usage: msg.usage,
              cost: msg.total_cost_usd || 0
            })}\n\n`
          ));

          console.log(`[Agent] Response generated. Cost: $${(msg.total_cost_usd || 0).toFixed(4)}`);
        }
      }

      // Log audit event after successful completion
      const toolsCalled = extractToolsCalled(allMessages);
      await logAuditEvent(
        session,
        message,
        collectedText,
        finalUsage,
        finalCost,
        toolsCalled
      );

      // Signal completion
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    } catch (error: any) {
      // Stream error to client
      console.error('[Agent] Streaming error:', error);
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
      ));
      controller.close();
    }
  }
});
```

**Database Consideration**:
- **IMPORTANT**: 'AGENT_QUERY' does NOT exist in the EntityType enum yet
- Must be added in Subtask 9 before this is tested

**Testing Considerations**:
- Send agent query and verify AuditEvent record created
- Check metadata contains all required fields
- Verify toolsCalled array is populated correctly
- Test with audit logging disabled via feature flag
- Verify writeAuditEvent errors don't break the API response

**SQL Verification Query**:
```sql
SELECT * FROM "AuditEvent"
WHERE "entityType" = 'AGENT_QUERY'
ORDER BY "createdAt" DESC
LIMIT 10;
```

**Estimated Complexity**: Simple (1 hour)

---

### 6. Implement Structured JSON Logging

**Action**: Replace simple console.log statements with structured JSON logging for better observability and log parsing.

**Context**: Current logging uses simple console.log which is hard to parse and aggregate. Structured JSON logs enable log aggregation tools (CloudWatch, Datadog, etc.) to analyze performance, errors, and usage patterns.

**Acceptance Criteria**:
- [ ] All console.log statements converted to JSON.stringify format
- [ ] INFO level logs include: level, type, userId, role, query (truncated to 100 chars), responseTime, cost, tokens object, toolsCalled, timestamp
- [ ] WARN level logs include: level, type, userId, role, timestamp, reason
- [ ] ERROR level logs include: level, type, userId, role, query (truncated), error message, stack trace, timestamp
- [ ] Performance tracking implemented: startTime at POST handler start, endTime/duration after response
- [ ] Success log emitted after streaming completes with performance metrics
- [ ] Rate limit exceeded logged as WARN with 'rate_limit_exceeded' type
- [ ] All errors logged as ERROR with 'agent_query_failed' type
- [ ] Query text truncated to prevent log bloat (100 chars for logs, 500 for audit)
- [ ] Timestamp in ISO format
- [ ] All logs are valid JSON (can be parsed with `jq`)

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation Steps**:

1. Add performance tracking at the start of POST handler:
```typescript
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ... existing code
```

2. Replace the existing console.log after "User asked" (around line 94):
```typescript
// Replace this line:
// console.log(`[Agent] User ${userContext.email} (${userContext.role}) asked: "${message}"`);

// With structured JSON log:
console.log(JSON.stringify({
  level: 'INFO',
  type: 'agent_query_started',
  userId: userContext.userId,
  role: userContext.role,
  email: userContext.email,
  query: message.slice(0, 100), // Truncate for logs
  timestamp: new Date().toISOString()
}));
```

3. Update the success log in the streaming handler (replace existing console.log around line 205):
```typescript
// Replace this line:
// console.log(`[Agent] Response generated. Cost: $${(msg.total_cost_usd || 0).toFixed(4)}`);

// With structured JSON log:
console.log(JSON.stringify({
  level: 'INFO',
  type: 'agent_query_success',
  userId: session.user.id,
  role: session.user.role,
  query: message.slice(0, 100),
  responseTime: Date.now() - startTime,
  cost: finalCost,
  tokens: {
    input: finalUsage?.input_tokens || 0,
    output: finalUsage?.output_tokens || 0,
    total: (finalUsage?.input_tokens || 0) + (finalUsage?.output_tokens || 0)
  },
  toolsCalled,
  timestamp: new Date().toISOString()
}));
```

4. Update the streaming error log (around line 214):
```typescript
// Replace this line:
// console.error('[Agent] Streaming error:', error);

// With structured JSON log:
console.log(JSON.stringify({
  level: 'ERROR',
  type: 'agent_streaming_error',
  userId: session.user.id,
  role: session.user.role,
  query: message.slice(0, 100),
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
}));
```

5. Update the main catch block error log (around line 231):
```typescript
// Replace this line:
// console.error('[Agent] Error:', error);

// With structured JSON log:
console.log(JSON.stringify({
  level: 'ERROR',
  type: 'agent_query_failed',
  userId: session?.user?.id || 'unknown',
  role: session?.user?.role || 'unknown',
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
}));
```

**Testing Considerations**:
- Send successful query and verify INFO log is valid JSON
- Trigger rate limit and verify WARN log is valid JSON
- Trigger error and verify ERROR log is valid JSON
- Pipe logs through `jq` to validate JSON format
- Verify responseTime is accurate
- Verify all required fields present in each log type

**Bash Test Command**:
```bash
npm run dev 2>&1 | grep 'agent_query' | head -1 | jq .
```

**Estimated Complexity**: Medium (1 hour)

---

### 7. Integrate Error Categorization into API Route

**Action**: Replace generic error handling with categorized error responses using the new error categorization module.

**Context**: Currently, all errors return a generic 500 status. This integrates the error categorization module to provide appropriate status codes and user-friendly messages while maintaining detailed error logging.

**Acceptance Criteria**:
- [ ] `categorizeError` imported from `@/lib/errors/agent-errors`
- [ ] Main try-catch block updated to use `categorizeError(error)`
- [ ] Categorized error logged with structured JSON (level: ERROR, category, userId, error message, stack trace)
- [ ] Response returns categorized userMessage and statusCode
- [ ] Streaming error handler also uses categorizeError
- [ ] Development mode still includes error details for debugging
- [ ] Production mode only shows user-friendly messages
- [ ] All error categories tested (authentication, authorization, validation, rate limit, database, agent, network, unknown)

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation Steps**:

1. Add import at the top:
```typescript
import { categorizeError } from '@/lib/errors/agent-errors';
```

2. Update the main catch block (around line 230):
```typescript
} catch (error: any) {
  const categorized = categorizeError(error);

  // Log categorized error with structured JSON
  console.log(JSON.stringify({
    level: 'ERROR',
    type: 'agent_query_failed',
    category: categorized.category,
    userId: session?.user?.id || 'unknown',
    role: session?.user?.role || 'unknown',
    query: body?.message?.slice(0, 100) || 'unknown',
    error: categorized.logMessage,
    statusCode: categorized.statusCode,
    timestamp: new Date().toISOString()
  }));

  return NextResponse.json(
    {
      success: false,
      error: categorized.userMessage,
      details: process.env.NODE_ENV === 'development' ? categorized.logMessage : undefined
    },
    { status: categorized.statusCode }
  );
}
```

3. Update the streaming error handler (inside the ReadableStream):
```typescript
} catch (error: any) {
  const categorized = categorizeError(error);

  // Stream error to client
  console.log(JSON.stringify({
    level: 'ERROR',
    type: 'agent_streaming_error',
    category: categorized.category,
    userId: session.user.id,
    role: session.user.role,
    query: message.slice(0, 100),
    error: categorized.logMessage,
    timestamp: new Date().toISOString()
  }));

  controller.enqueue(encoder.encode(
    `data: ${JSON.stringify({ type: 'error', error: categorized.userMessage })}\n\n`
  ));
  controller.close();
}
```

**Testing Considerations**:
- Trigger authentication error (no session) - expect 401
- Trigger authorization error (insufficient permissions) - expect 403
- Trigger validation error (empty message) - expect 400
- Trigger rate limit error (exceed limit) - expect 429
- Simulate database error - expect 500 with database-specific message
- Simulate agent service error - expect 500 with AI-specific message
- Verify user messages are helpful and not technical
- Verify log messages include full error details

**Estimated Complexity**: Medium (1 hour)

---

### 8. Add Optional Role-Based Rate Limits

**Action**: (OPTIONAL) Implement different rate limits for different user roles.

**Context**: Some roles (CFO, CXO_TEAM) may need higher rate limits than others (GUEST). This is an optional enhancement to provide role-appropriate rate limits.

**Acceptance Criteria**:
- [ ] `getRateLimitForRole()` helper function created
- [ ] Function returns role-specific limits: CFO (100), CXO_TEAM (100), AUDIT_HEAD (50), AUDITOR (30), AUDITEE (20), GUEST (10)
- [ ] Function has fallback default (20) for unknown roles
- [ ] checkRateLimit called with role-specific maxRequests
- [ ] Role limits logged in rate limit exceeded warning
- [ ] Role limits configurable via environment variables (optional enhancement)

**Files**:
- Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts`

**Implementation**: See Subtask 4 for the optional implementation code.

**Testing Considerations**:
- Test each role hits appropriate limit
- Verify CFO can send 100 requests
- Verify GUEST can only send 10 requests
- Test unknown role falls back to default

**NOTE**: This subtask is optional and can be skipped for MVP Phase 2.

**Estimated Complexity**: Simple (30 minutes)

---

### 9. Update Prisma Schema for AGENT_QUERY EntityType

**Action**: Verify and add 'AGENT_QUERY' to EntityType enum if it doesn't exist.

**Context**: The audit logging uses 'AGENT_QUERY' as the entityType, which must be a valid value in the Prisma EntityType enum. **Currently, AGENT_QUERY does NOT exist in the schema and must be added.**

**Acceptance Criteria**:
- [ ] Check if 'AGENT_QUERY' exists in `enum EntityType` in `prisma/schema.prisma`
- [ ] If missing, add 'AGENT_QUERY' to the enum
- [ ] If added, run `npx prisma migrate dev --name add-agent-query-entity-type`
- [ ] If added, run `npx prisma generate`
- [ ] Verify migration applies successfully
- [ ] Update `src/server/auditTrail.ts` type if needed to include AGENT_QUERY

**Files**:
- Check/Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/prisma/schema.prisma`
- Potentially Update: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/server/auditTrail.ts`

**Implementation Steps**:

1. Open the Prisma schema file and locate the EntityType enum (around line 225-235):
```prisma
enum EntityType {
  USER
  AUDIT
  OBSERVATION
  ATTACHMENT
  APPROVAL
  ACTION_PLAN
  PLANT
  INVITE
  AGENT_QUERY  // ADD THIS LINE
}
```

2. Run the migration:
```bash
# Start database if not running
docker start audit-postgres

# Create and apply migration
npx prisma migrate dev --name add-agent-query-entity-type

# Generate Prisma client
npx prisma generate
```

3. Verify the migration was successful:
```bash
# Check migration files
ls -la prisma/migrations/

# Test database connection
npx prisma studio
```

4. No changes needed to `src/server/auditTrail.ts` - it already accepts any EntityType string via:
```typescript
entityType: EntityType | keyof typeof EntityType | string;
```

**Testing Considerations**:
- After migration, test writing an audit event with entityType 'AGENT_QUERY'
- Verify no TypeScript errors
- Check database to confirm enum value exists

**Migration Commands**:
```bash
npx prisma migrate dev --name add-agent-query-entity-type
npx prisma generate
```

**SQL Verification**:
```sql
-- Check the enum type in PostgreSQL
SELECT unnest(enum_range(NULL::EntityType)) AS entity_type;
```

**IMPORTANT**: This subtask should be completed FIRST before implementing Subtask 5 (Audit Logging).

**Estimated Complexity**: Simple (15 minutes)

---

### 10. End-to-End Testing

**Action**: Comprehensive testing of all production features working together.

**Context**: All individual features implemented and need integration testing to ensure they work together without conflicts.

**Acceptance Criteria**:
- [ ] Rate limiting allows 20 requests then blocks 21st (or role-specific limits)
- [ ] Rate limit triggers return 429 with helpful message
- [ ] Rate limit resets after 1 minute window
- [ ] Audit events logged for all successful queries
- [ ] Audit events contain all required metadata
- [ ] Structured logs are valid JSON and parseable
- [ ] Success queries log as INFO
- [ ] Rate limit exceeded logs as WARN
- [ ] Errors log as ERROR with categorization
- [ ] Error categorization returns correct status codes
- [ ] User-friendly error messages displayed in UI
- [ ] No errors prevent successful queries
- [ ] Feature flags can disable audit logging and streaming
- [ ] Environment variables override defaults correctly
- [ ] Performance metrics are accurate (response time, cost, tokens)
- [ ] Memory cleanup runs without issues
- [ ] No memory leaks from rate limiting Map

**Testing Scenarios**:

**Scenario 1: Happy Path**
1. Send agent query
2. Verify streaming response
3. Check INFO log is valid JSON with all fields
4. Check AuditEvent record created
5. Verify performance metrics logged

**Scenario 2: Rate Limiting**
1. Send 20 queries rapidly
2. Verify all succeed
3. Send 21st query
4. Verify 429 response
5. Check WARN log for rate limit exceeded
6. Wait 1 minute
7. Send another query
8. Verify it succeeds

**Scenario 3: Error Handling**
1. Send request without session (401)
2. Send empty message (400)
3. Simulate database error (500)
4. Verify each returns appropriate status code
5. Verify each has user-friendly message
6. Check ERROR logs have full details

**Scenario 4: Feature Flags**
1. Disable audit logging (AGENT_AUDIT_LOGGING_ENABLED=false)
2. Send query
3. Verify no AuditEvent created
4. Re-enable audit logging
5. Verify AuditEvents created again

**Testing Checklist**:
- [ ] All rate limiting tests pass
- [ ] All audit logging tests pass
- [ ] All structured logging tests pass
- [ ] All error categorization tests pass
- [ ] All configuration tests pass
- [ ] Integration tests pass
- [ ] No breaking changes to existing functionality
- [ ] UI displays errors correctly

**Manual Testing Commands**:

```bash
# Test 1: Happy Path
curl -X POST http://localhost:3005/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"message":"How many observations do I have?"}' \
  --no-buffer

# Test 2: Rate Limiting (send 25 requests rapidly)
for i in {1..25}; do
  echo "Request $i"
  curl -X POST http://localhost:3005/api/v1/agent/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: your-session-cookie" \
    -d '{"message":"test"}' \
    --no-buffer &
done
wait

# Test 3: Empty Message (400)
curl -X POST http://localhost:3005/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"message":""}'

# Test 4: No Session (401)
curl -X POST http://localhost:3005/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

**SQL Verification Queries**:

```sql
-- Check audit events
SELECT * FROM "AuditEvent"
WHERE "entityType" = 'AGENT_QUERY'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check audit event metadata
SELECT
  "entityId",
  "action",
  "diff"->>'query' as query,
  "diff"->>'cost' as cost,
  "diff"->>'toolsCalled' as tools,
  "createdAt"
FROM "AuditEvent"
WHERE "entityType" = 'AGENT_QUERY'
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Log Validation**:

```bash
# Validate JSON logs
npm run dev 2>&1 | grep 'agent_query' | head -10 | jq .

# Check for structured log fields
npm run dev 2>&1 | grep 'agent_query_success' | jq '.level, .userId, .cost, .responseTime'

# Monitor rate limiting
npm run dev 2>&1 | grep 'rate_limit_exceeded' | jq .
```

**Files Involved**:
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/api/v1/agent/chat/route.ts` (main integration point)
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/errors/agent-errors.ts` (error module)
- `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/lib/config/agent.ts` (config module)

**Estimated Complexity**: Medium (2 hours)

---

## Dependencies

### Sequential Dependencies
1. **Subtask 9 (Prisma Schema)** must be completed FIRST before any other subtask
2. **Subtask 1 (Error Module)** must be completed before **Subtask 7 (Error Integration)**
3. **Subtask 2 (Config Module)** must be completed before **Subtask 4 (Rate Limiting)**
4. **Subtask 3 (.env.example)** should be completed with **Subtask 2 (Config Module)**

### Parallel Implementation
- **Subtask 1** and **Subtask 2** can be implemented in parallel (independent new files)
- **Subtask 5** (Audit Logging) and **Subtask 6** (Structured Logging) can be implemented in parallel
- **Subtask 8** (Role-Based Limits) is optional and can be done last or skipped

### Recommended Implementation Order
1. **Subtask 9**: Update Prisma Schema (CRITICAL - do first)
2. **Subtask 1**: Create Error Categorization Module
3. **Subtask 2**: Create Configuration Module
4. **Subtask 3**: Add Environment Variables
5. **Subtask 4**: Implement Rate Limiting
6. **Subtask 5**: Implement Audit Logging
7. **Subtask 6**: Implement Structured Logging
8. **Subtask 7**: Integrate Error Categorization
9. **Subtask 8**: Add Role-Based Limits (optional)
10. **Subtask 10**: End-to-End Testing

---

## Implementation Execution Plan

### Phase 1: Foundation (Subtasks 9, 1, 2, 3) - 2 hours
**Goal**: Create the foundational modules and schema updates

1. **Start here**: Update Prisma schema (Subtask 9)
   - Add AGENT_QUERY to EntityType enum
   - Run migration
   - Verify database updated
   - **Blocker**: Must complete before audit logging

2. **In parallel**: Create error categorization (Subtask 1)
   - Create `src/lib/errors/` directory
   - Implement error categorization module
   - Test with sample errors
   - **Used by**: Subtask 7

3. **In parallel**: Create configuration module (Subtask 2)
   - Create `src/lib/config/` directory
   - Implement agent config with env vars
   - Test parsing logic
   - **Used by**: Subtask 4, 5, 6

4. **Quick win**: Update .env.example (Subtask 3)
   - Add new environment variables
   - Document defaults

### Phase 2: Core Features (Subtasks 4, 5, 6) - 3 hours
**Goal**: Implement rate limiting, audit logging, and structured logging

5. **Implement rate limiting** (Subtask 4)
   - Add rate limit map and functions
   - Add rate limit check to POST handler
   - Test with rapid requests
   - **Depends on**: Subtask 2 (config)

6. **Implement audit logging** (Subtask 5)
   - Add helper functions for audit events
   - Integrate with streaming handler
   - Test audit event creation
   - **Depends on**: Subtask 9 (Prisma)

7. **Implement structured logging** (Subtask 6)
   - Replace console.log with JSON logs
   - Add performance tracking
   - Test log parsing with jq
   - **Can be done in parallel with 4 & 5**

### Phase 3: Integration (Subtask 7) - 1 hour
**Goal**: Integrate error categorization throughout

8. **Integrate error handling** (Subtask 7)
   - Update main catch block
   - Update streaming error handler
   - Test all error categories
   - **Depends on**: Subtask 1 (error module)

### Phase 4: Optional & Testing (Subtasks 8, 10) - 2.5 hours
**Goal**: Complete optional features and comprehensive testing

9. **Optional**: Role-based rate limits (Subtask 8)
   - Add getRateLimitForRole function
   - Test different roles
   - **Skip if time-constrained**

10. **End-to-end testing** (Subtask 10)
    - Test all scenarios
    - Verify integration
    - Check logs and audit events
    - **Final validation**

---

## Key Implementation Considerations

### Error Handling
- **Never break the response flow**: All audit logging and non-critical operations wrapped in try-catch
- **User-friendly messages**: Error categorization provides helpful messages, not technical jargon
- **Full logging**: Even with friendly user messages, log detailed error information for debugging

### Performance
- **In-memory rate limiting**: Fine for MVP and single-server deployments
- **Fire-and-forget audit logging**: Don't await writeAuditEvent to avoid slowing responses
- **Cleanup interval**: Prevents memory leaks from rate limit map

### Observability
- **Structured JSON logs**: Enable log aggregation and querying
- **Consistent format**: All logs have level, type, userId, role, timestamp
- **Truncation**: Prevent log bloat by truncating long queries

### Security
- **Rate limiting**: Prevents abuse and cost spikes
- **Role-based limits**: Optional but recommended for production
- **Audit trail**: Compliance requirement for tracking all agent queries

### Configuration
- **Environment variables**: All configuration externalized
- **Sensible defaults**: Works out-of-the-box with no configuration
- **Feature flags**: Can disable features without code changes

---

## Testing Checklist

### Rate Limiting
- [ ] Allows requests within limit (20 by default)
- [ ] Returns 429 when limit exceeded
- [ ] Resets after window expires (1 minute)
- [ ] Rate limit map cleans up expired entries
- [ ] Different limits per role work (if implemented)
- [ ] Error message includes helpful information

### Audit Logging
- [ ] All successful queries are logged to AuditEvent table
- [ ] Logs include query text (truncated if needed)
- [ ] Logs include tools called
- [ ] Logs include usage metrics (tokens, cost)
- [ ] Logs include timestamp
- [ ] writeAuditEvent never throws errors

### Structured Logging
- [ ] Success logs are valid JSON
- [ ] Error logs are valid JSON
- [ ] Warning logs are valid JSON
- [ ] Logs include all required fields
- [ ] Performance metrics are accurate
- [ ] Logs are parseable by log aggregation tools

### Error Categorization
- [ ] Authentication errors return 401
- [ ] Authorization errors return 403
- [ ] Validation errors return 400
- [ ] Rate limit errors return 429
- [ ] Database errors return 500
- [ ] Agent service errors return 500
- [ ] All error messages are user-friendly
- [ ] Error logs include stack traces

### Configuration
- [ ] Environment variables are read correctly
- [ ] Default values work when env vars not set
- [ ] Feature flags can enable/disable features
- [ ] Configuration is type-safe

---

## Potential Issues & Edge Cases

### 1. Rate Limiting
**Issue**: In-memory map doesn't work across multiple server instances
**Solution**: For production with multiple servers, use Redis for distributed rate limiting
**MVP Approach**: Single-server deployment is fine for MVP Phase 2

### 2. Audit Logging
**Issue**: writeAuditEvent could slow down response if it fails
**Solution**: Fire-and-forget pattern (don't await), wrapped in try-catch
**Implementation**: Already handled in existing writeAuditEvent function

### 3. Memory Leaks
**Issue**: Rate limit map could grow indefinitely
**Solution**: Cleanup interval runs every 60 seconds
**Monitoring**: Watch memory usage in production

### 4. Log Volume
**Issue**: JSON logs could become very large
**Solution**: Truncate query text (100 chars for logs, 500 for audit)
**Production**: Consider log sampling or rotation

### 5. Error Categorization
**Issue**: Pattern matching might mis-categorize some errors
**Solution**: Add more patterns as issues are discovered
**Fallback**: Unknown category with 500 status is safe default

### 6. Feature Flags
**Issue**: Disabling audit logging might break compliance
**Solution**: Document that audit logging should always be enabled in production
**Use case**: Feature flags mainly for testing and troubleshooting

### 7. Cost Tracking
**Issue**: Agent queries can be expensive
**Solution**: Rate limiting + audit logging tracks costs
**Future**: Add per-user cost budgets and alerts

### 8. Session Expiry During Query
**Issue**: Session might expire while query is processing
**Solution**: Session validation happens at start, before expensive operations
**Edge case**: Long-running queries (>15 min) might have stale session data in logs

---

## Performance Considerations

### Rate Limit Map
- In-memory map is fine for single-server deployments
- For multi-server: Use Redis for shared rate limiting
- Cleanup interval prevents memory leaks
- Consider using a library like `rate-limiter-flexible` for production

### Audit Logging
- writeAuditEvent is async but we don't await it (fire-and-forget)
- This prevents audit logging from slowing down responses
- Errors in audit logging are caught and logged, never thrown

### Structured Logging
- JSON.stringify can be expensive for large objects
- Truncate long strings (query, response) before logging
- Consider sampling logs for high-volume deployments

---

## Related Tasks
- TASK_1 (Streaming Architecture) - Logging applies to streaming responses
- TASK_5 (UI/UX Improvements) - Error messages must match UI expectations
- TASK_7 (Testing) - Tests should verify rate limiting and logging

---

## Migration Notes

### Enabling Features Gradually
1. Deploy code with features disabled
2. Enable audit logging first (low risk)
3. Enable structured logging
4. Enable rate limiting last (after establishing baseline)

### Monitoring After Deployment
- Watch for rate limit 429s (too many = limits too strict)
- Monitor audit event table growth (ensure disk space)
- Check log volume (ensure not overwhelming log storage)
- Track error categories (identify systemic issues)

---

## Future Enhancements
- Redis-based rate limiting for multi-server deployments
- Distributed tracing (OpenTelemetry)
- Real-time alerting on error spikes
- Cost tracking and budgeting
- Per-user cost attribution
- Rate limit dashboards

---

## References
- Rate Limiting Strategies: https://blog.logrocket.com/rate-limiting-node-js/
- Structured Logging: https://github.com/pinojs/pino
- Error Handling Best Practices: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
- Audit Logging: See `src/server/auditTrail.ts`

---

## Summary

This task adds critical production features to the agent system through 10 well-defined subtasks. The implementation is designed to be:

- **Modular**: New modules (errors, config) are independent and reusable
- **Safe**: Error handling and feature flags allow gradual rollout
- **Observable**: Structured logging and audit trail enable monitoring
- **Performant**: In-memory rate limiting with cleanup, fire-and-forget audit logging
- **User-Friendly**: Categorized errors with helpful messages

**Estimated Complexity**:
- Simple: Subtasks 1, 2, 3, 5, 9 (2.5 hours total)
- Medium: Subtasks 4, 6, 7 (3.5 hours total)
- Testing: Subtask 10 (2 hours)
- Optional: Subtask 8 (0.5 hours)
- **Total Estimated Time**: 8-10 hours for full implementation and testing

**Key Success Metrics**:
- Rate limiting prevents abuse without blocking legitimate users
- All queries logged for compliance
- Logs are parseable JSON for aggregation tools
- User-friendly error messages improve UX
- Zero production incidents from agent queries

**Implementation Priority**:
1. **CRITICAL**: Subtask 9 (Prisma Schema) - Must be done first
2. **HIGH**: Subtasks 1, 2, 3 (Foundation modules)
3. **HIGH**: Subtasks 4, 5, 6 (Core features)
4. **MEDIUM**: Subtask 7 (Error integration)
5. **LOW**: Subtask 8 (Optional role-based limits)
6. **CRITICAL**: Subtask 10 (Testing)
