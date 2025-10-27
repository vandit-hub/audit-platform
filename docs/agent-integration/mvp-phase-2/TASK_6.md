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

## Acceptance Criteria
- [ ] Rate limiting implemented and tested
- [ ] Audit events logged for all agent queries
- [ ] Structured logging for performance metrics
- [ ] Error categorization with user-friendly messages
- [ ] Environment variables for configuration
- [ ] Rate limit triggers return 429 status
- [ ] Audit logs include relevant metadata
- [ ] Logs are parseable JSON format

## Implementation Details

### 6.1 Rate Limiting

**File**: `src/app/api/v1/agent/chat/route.ts`

**Implementation Strategy**: In-memory rate limiter (good for MVP Phase 2)

**Code**:
```typescript
// At the top of the file (module-level)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if user has exceeded rate limit
 * @param userId User ID to check
 * @param maxRequests Maximum requests per window (default: 20)
 * @param windowMs Window duration in milliseconds (default: 60000 = 1 minute)
 * @returns true if within limit, false if exceeded
 */
function checkRateLimit(
  userId: string,
  maxRequests: number = 20,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Start new window
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  userLimit.count++;
  return true;
}

// Clean up expired entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of rateLimitMap.entries()) {
    if (now > limit.resetAt) {
      rateLimitMap.delete(userId);
    }
  }
}, 60000); // Run cleanup every minute
```

**Usage in POST Handler**:
```typescript
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit check
  const maxRequests = parseInt(process.env.AGENT_RATE_LIMIT_REQUESTS || '20');
  const windowMs = parseInt(process.env.AGENT_RATE_LIMIT_WINDOW_MS || '60000');

  if (!checkRateLimit(session.user.id, maxRequests, windowMs)) {
    console.warn(JSON.stringify({
      level: 'WARN',
      type: 'rate_limit_exceeded',
      userId: session.user.id,
      role: session.user.role,
      timestamp: new Date().toISOString()
    }));

    return NextResponse.json(
      {
        error: 'Rate limit exceeded. You can send up to ' + maxRequests + ' requests per minute. Please wait a moment and try again.'
      },
      { status: 429 }
    );
  }

  // Continue with normal request processing...
}
```

**Environment Variables**:
```bash
# .env
AGENT_RATE_LIMIT_REQUESTS=20
AGENT_RATE_LIMIT_WINDOW_MS=60000
```

**Optional: Role-Based Limits**:
```typescript
function getRateLimitForRole(role: string): number {
  const limits: Record<string, number> = {
    CFO: 100,
    CXO_TEAM: 100,
    AUDIT_HEAD: 50,
    AUDITOR: 30,
    AUDITEE: 20,
    GUEST: 10
  };
  return limits[role] || 20;
}

// Usage
const maxRequests = getRateLimitForRole(session.user.role);
```

### 6.2 Audit Event Logging

**File**: `src/app/api/v1/agent/chat/route.ts`

**What to Log**: Every agent query should be logged for compliance and analytics

**Implementation**:
```typescript
import { writeAuditEvent } from '@/server/auditTrail';

// After successful agent response
const logAuditEvent = async (
  session: any,
  message: string,
  responseText: string,
  usage: any,
  cost: number,
  toolsCalled: string[]
) => {
  await writeAuditEvent({
    entityType: 'AGENT_QUERY',
    entityId: session.user.id, // Or generate unique query ID
    action: 'QUERY',
    actorId: session.user.id,
    metadata: {
      query: message,
      responseLength: responseText.length,
      toolsCalled,
      usage: {
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        totalTokens: (usage?.inputTokens || 0) + (usage?.outputTokens || 0)
      },
      cost,
      timestamp: new Date().toISOString()
    }
  });
};
```

**Extract Tools Called from Response**:
```typescript
function extractToolsCalled(agentMessages: any[]): string[] {
  const tools: string[] = [];

  for (const message of agentMessages) {
    if (message.type === 'tool_use') {
      tools.push(message.name);
    }
  }

  return [...new Set(tools)]; // Remove duplicates
}
```

**Usage in Handler**:
```typescript
// After agent query completes
const toolsCalled = extractToolsCalled(allMessages);

await logAuditEvent(
  session,
  message,
  assistantText,
  usage,
  cost,
  toolsCalled
);
```

### 6.3 Structured Monitoring

**File**: `src/app/api/v1/agent/chat/route.ts`

**Performance Metrics**:

```typescript
// At the start of POST handler
const startTime = Date.now();

// At the end (after response sent, in streaming or regular)
const endTime = Date.now();
const duration = endTime - startTime;

console.log(JSON.stringify({
  level: 'INFO',
  type: 'agent_query_completed',
  userId: session.user.id,
  role: session.user.role,
  query: message.substring(0, 100), // Truncate for logs
  responseTime: duration,
  cost,
  tokens: {
    input: usage?.inputTokens || 0,
    output: usage?.outputTokens || 0,
    total: (usage?.inputTokens || 0) + (usage?.outputTokens || 0)
  },
  toolsCalled,
  timestamp: new Date().toISOString()
}));
```

**Error Logging**:

```typescript
// In catch block
console.error(JSON.stringify({
  level: 'ERROR',
  type: 'agent_query_failed',
  userId: session.user.id,
  role: session.user.role,
  query: message.substring(0, 100),
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
}));
```

**Warning Logging** (rate limits, access denials):

```typescript
console.warn(JSON.stringify({
  level: 'WARN',
  type: 'rate_limit_exceeded',
  userId: session.user.id,
  role: session.user.role,
  timestamp: new Date().toISOString()
}));
```

### 6.4 Error Categorization

**Create Error Categorization Module**:

**File**: `src/lib/errors/agent-errors.ts`

```typescript
export enum AgentErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  DATABASE = 'database',
  AGENT_SERVICE = 'agent_service',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

export interface CategorizedError {
  category: AgentErrorCategory;
  statusCode: number;
  userMessage: string;
  logMessage: string;
}

/**
 * Categorize an error and return user-friendly information
 */
export function categorizeError(error: any): CategorizedError {
  const errorStr = error?.message || error?.toString() || '';

  // Authentication errors
  if (errorStr.includes('session') || errorStr.includes('authentication')) {
    return {
      category: AgentErrorCategory.AUTHENTICATION,
      statusCode: 401,
      userMessage: 'Your session has expired. Please refresh the page and log in again.',
      logMessage: errorStr
    };
  }

  // Authorization errors
  if (errorStr.includes('permission') || errorStr.includes('unauthorized') || errorStr.includes('forbidden')) {
    return {
      category: AgentErrorCategory.AUTHORIZATION,
      statusCode: 403,
      userMessage: 'You don\'t have permission to perform this action. Contact your administrator if you believe this is an error.',
      logMessage: errorStr
    };
  }

  // Validation errors
  if (errorStr.includes('validation') || errorStr.includes('invalid')) {
    return {
      category: AgentErrorCategory.VALIDATION,
      statusCode: 400,
      userMessage: 'Invalid request. Please check your input and try again.',
      logMessage: errorStr
    };
  }

  // Rate limit errors
  if (errorStr.includes('rate limit') || errorStr.includes('too many requests')) {
    return {
      category: AgentErrorCategory.RATE_LIMIT,
      statusCode: 429,
      userMessage: 'You\'re sending requests too quickly. Please wait a moment and try again.',
      logMessage: errorStr
    };
  }

  // Database errors
  if (errorStr.includes('database') || errorStr.includes('prisma') || errorStr.includes('query')) {
    return {
      category: AgentErrorCategory.DATABASE,
      statusCode: 500,
      userMessage: 'A database error occurred. Please try again in a moment.',
      logMessage: errorStr
    };
  }

  // Agent/Claude API errors
  if (errorStr.includes('agent') || errorStr.includes('claude') || errorStr.includes('anthropic')) {
    return {
      category: AgentErrorCategory.AGENT_SERVICE,
      statusCode: 500,
      userMessage: 'AI service error. Please try rephrasing your question or try again later.',
      logMessage: errorStr
    };
  }

  // Network errors
  if (errorStr.includes('fetch') || errorStr.includes('network') || errorStr.includes('ECONNREFUSED')) {
    return {
      category: AgentErrorCategory.NETWORK,
      statusCode: 503,
      userMessage: 'Network error. Please check your connection and try again.',
      logMessage: errorStr
    };
  }

  // Unknown errors
  return {
    category: AgentErrorCategory.UNKNOWN,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
    logMessage: errorStr
  };
}
```

**Usage in API Route**:

```typescript
import { categorizeError } from '@/lib/errors/agent-errors';

try {
  // Agent query logic
} catch (error: any) {
  const categorized = categorizeError(error);

  // Log the error
  console.error(JSON.stringify({
    level: 'ERROR',
    type: 'agent_query_error',
    category: categorized.category,
    userId: session.user.id,
    error: categorized.logMessage,
    stack: error.stack,
    timestamp: new Date().toISOString()
  }));

  // Return user-friendly error
  return NextResponse.json(
    { error: categorized.userMessage },
    { status: categorized.statusCode }
  );
}
```

### 6.5 Environment Configuration

**Add to `.env.example`**:

```bash
# Agent Configuration
AGENT_RATE_LIMIT_REQUESTS=20
AGENT_RATE_LIMIT_WINDOW_MS=60000
AGENT_STREAMING_ENABLED=true
AGENT_AUDIT_LOGGING_ENABLED=true

# Logging
LOG_LEVEL=info  # debug, info, warn, error
```

**Create Configuration Module**:

**File**: `src/lib/config/agent.ts`

```typescript
export const agentConfig = {
  rateLimit: {
    requests: parseInt(process.env.AGENT_RATE_LIMIT_REQUESTS || '20'),
    windowMs: parseInt(process.env.AGENT_RATE_LIMIT_WINDOW_MS || '60000')
  },
  features: {
    streaming: process.env.AGENT_STREAMING_ENABLED !== 'false',
    auditLogging: process.env.AGENT_AUDIT_LOGGING_ENABLED !== 'false'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
```

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

## Testing Scenarios

### Rate Limit Testing
```bash
# Test rapid requests
for i in {1..25}; do
  curl -X POST http://localhost:3005/api/v1/agent/chat \
    -H "Content-Type: application/json" \
    -H "Cookie: session=<session>" \
    -d '{"message":"test"}' &
done

# Expected: First 20 succeed, remaining 5 return 429
```

### Audit Log Verification
```sql
-- Check audit events
SELECT * FROM "AuditEvent"
WHERE "entityType" = 'AGENT_QUERY'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Verify metadata
SELECT metadata FROM "AuditEvent"
WHERE "entityType" = 'AGENT_QUERY'
LIMIT 1;
```

### Log Format Validation
```bash
# Capture logs and validate JSON
npm run dev 2>&1 | grep 'agent_query' | head -1 | jq .

# Should output valid JSON with required fields
```

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

## Dependencies
None - this task can be implemented independently

## Related Tasks
- TASK_1 (Streaming Architecture) - Logging applies to streaming responses
- TASK_5 (UI/UX Improvements) - Error messages must match UI expectations
- TASK_7 (Testing) - Tests should verify rate limiting and logging

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

## Future Enhancements
- Redis-based rate limiting for multi-server deployments
- Distributed tracing (OpenTelemetry)
- Real-time alerting on error spikes
- Cost tracking and budgeting
- Per-user cost attribution
- Rate limit dashboards

## References
- Rate Limiting Strategies: https://blog.logrocket.com/rate-limiting-node-js/
- Structured Logging: https://github.com/pinojs/pino
- Error Handling Best Practices: https://kentcdodds.com/blog/get-a-catch-block-error-message-with-typescript
- Audit Logging: See `src/server/auditTrail.ts`
