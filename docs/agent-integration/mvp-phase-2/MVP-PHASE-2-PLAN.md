# AI Conversational Agent - MVP Phase 2 Implementation Plan

## Executive Summary

**Phase 2 builds on the proven MVP foundation** to create a production-ready AI agent system with enhanced capabilities, better user experience, and enterprise-grade features.

### Why Phase 2?

The MVP successfully validated the core concept:
- ✅ Users can query observations using natural language
- ✅ RBAC enforcement works correctly
- ✅ Response quality is good
- ✅ Performance is acceptable
- ✅ Costs are manageable

**Phase 2 transforms the proof-of-concept into a production-ready system** by adding:
- **Streaming responses** for better UX
- **Expanded query capabilities** (audits, search, detail views)
- **Production-grade features** (monitoring, rate limiting, audit logging)
- **Code quality improvements** through refactoring
- **Comprehensive testing** infrastructure

---

## Current State: What MVP Delivered

### ✅ Working Features

**MCP Tools (2)**
- `get_my_observations` - Fetch observations with basic filters
- `get_observation_stats` - Aggregated statistics

**Filtering Capabilities**
- Filter by: auditId, approvalStatus, riskCategory, currentStatus, limit

**Stats Grouping**
- Group by: approvalStatus, currentStatus, riskCategory

**RBAC Functions (3)**
- `buildObservationWhereClause()` - Role-based query filtering
- `getObservationsForUser()` - Fetch observations with RBAC
- `getObservationStats()` - Statistics with RBAC

**User Experience**
- Simple request/response pattern
- Loading spinner during queries
- Example questions displayed
- Clean functional UI

**Security**
- NextAuth session authentication
- Role-based data filtering
- No data leakage between roles

### 🔧 Technical Architecture (MVP)

```
User Interface (AgentChatClient.tsx)
    ↓
API Endpoint (/api/v1/agent/chat) - Request/Response
    ↓
Claude Agent SDK
    ↓
MCP Server (2 tools)
    ↓
RBAC Query Functions
    ↓
Prisma + PostgreSQL
```

---

## Phase 2 Goals & Objectives

### Primary Goals

1. **Enhanced User Experience**
   - Real-time streaming responses
   - Ability to stop generation mid-stream
   - Clear chat history
   - Better visual feedback

2. **Expanded Query Capabilities**
   - Query audit information
   - Full-text search across observations
   - View detailed information for specific observations and audits
   - More comprehensive filtering options

3. **Production-Grade Features**
   - Rate limiting to prevent abuse
   - Audit trail logging for compliance
   - Structured monitoring and observability
   - Better error handling and categorization

4. **Code Quality & Maintainability**
   - Refactor existing API routes to use shared RBAC functions
   - Eliminate code duplication
   - Improve type safety
   - Add comprehensive testing

5. **Scalability & Performance**
   - Optimize database queries
   - Add caching where appropriate
   - Implement pagination
   - Monitor and optimize costs

---

## Implementation Areas

### Area 1: Streaming Architecture

**Current State**: API waits for complete response, then returns JSON. User sees loading spinner for 3-10 seconds.

**Target State**: API streams response chunks in real-time via Server-Sent Events. User sees words appear as they're generated.

#### Changes Required

**1.1 Update API Endpoint** (`src/app/api/v1/agent/chat/route.ts`)

**What to Change**:
- Convert from `NextResponse.json()` to streaming `Response` with `text/event-stream`
- Use `ReadableStream` to stream agent responses
- Send chunks as Server-Sent Events (SSE) format: `data: {json}\n\n`
- Handle streaming lifecycle (start, chunks, done, errors)

**Key Implementation Details**:
```typescript
// Convert from:
return NextResponse.json({ success: true, response: text });

// To:
const stream = new ReadableStream({
  async start(controller) {
    for await (const message of agentQuery) {
      if (message.type === 'assistant') {
        // Stream text blocks as they arrive
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({...})}\n\n`));
      }
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  }
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
});
```

**1.2 Update Client Component** (`src/app/(dashboard)/agent-chat/AgentChatClient.tsx`)

**What to Change**:
- Replace `fetch().then(response.json())` with `EventSource` or streaming fetch
- Add state for `streamingContent` (content being streamed)
- Update UI to display streaming content with animated cursor
- Handle SSE message parsing
- Implement stop generation functionality

**Key Implementation Details**:
```typescript
// Add state
const [streamingContent, setStreamingContent] = useState('');
const abortControllerRef = useRef<AbortController | null>(null);

// Stream handling
const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') {
        // Finalize message
      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'text') {
          assistantContent += parsed.content;
          setStreamingContent(assistantContent);
        }
      }
    }
  }
}
```

**1.3 Add Stop Generation**

**What to Add**:
- `AbortController` to cancel ongoing requests
- Stop button in UI (shows when streaming)
- Handle aborted requests gracefully
- Save partial responses when stopped

**1.4 Add Clear Chat**

**What to Add**:
- Clear button in chat header
- Confirmation dialog (optional)
- Reset messages array
- Clear streaming content

---

### Area 2: Expanded MCP Tools

**Current State**: 2 tools (observations only)

**Target State**: 6 tools (observations + audits + search + details)

#### New Tools to Add

**2.1 Tool: `get_my_audits`**

**Purpose**: Fetch audits the user has access to based on their role.

**Parameters**:
- `plantId?: string` - Filter by plant
- `status?: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF'` - Filter by status
- `limit?: number` - Max results (default: 50)

**Implementation**:
- Create tool in `src/agent/mcp-server.ts`
- Use `getAuditsForUser()` function (needs to be created)
- Return audit summary with plant, assignments, observation counts

**RBAC Enforcement**:
- CFO/CXO_TEAM: All audits
- AUDIT_HEAD: Audits they lead or are assigned to
- AUDITOR: Audits they're assigned to
- AUDITEE/GUEST: No audit access (or limited based on requirements)

**2.2 Tool: `search_observations`**

**Purpose**: Full-text search across observation text, risks, and feedback.

**Parameters**:
- `query: string` - Search query (required, min 1 char)
- `limit?: number` - Max results (default: 20)

**Implementation**:
- Add `searchQuery` parameter to `getObservationsForUser()`
- Implement full-text search in `buildObservationWhereClause()`
- Use Prisma `contains` or PostgreSQL full-text search
- Return matching observations with truncated text

**Search Strategy**:
```typescript
// Option 1: Simple contains (case-insensitive)
where.OR = [
  { observationText: { contains: query, mode: 'insensitive' } },
  { riskDescription: { contains: query, mode: 'insensitive' } },
  { managementResponse: { contains: query, mode: 'insensitive' } }
];

// Option 2: PostgreSQL full-text search (more advanced)
// Implement using Prisma raw query if needed
```

**2.3 Tool: `get_observation_details`**

**Purpose**: Fetch complete details of a specific observation.

**Parameters**:
- `observationId: string` - Observation ID (required)

**Implementation**:
- Add `canAccessObservation()` helper function
- Verify user has permission to view the observation
- Fetch observation with all relations (attachments, approvals, action plans, assignments)
- Return 403 if no access

**Includes**:
- Full observation text
- Risk descriptions
- Management response
- Attachments (metadata, not file content)
- Approvals history
- Action plans
- Auditee assignments

**2.4 Tool: `get_audit_details`**

**Purpose**: Fetch complete details of a specific audit.

**Parameters**:
- `auditId: string` - Audit ID (required)

**Implementation**:
- Add `canAccessAudit()` helper function
- Verify user has permission to view the audit
- Fetch audit with all relations (plant, audit head, assignments, checklists, observation counts)
- Return 403 if no access

**Includes**:
- Audit metadata (title, dates, status)
- Plant information
- Audit head
- Auditor assignments
- Checklist assignments
- Observation count

---

### Area 3: Enhanced RBAC & Data Access

**Current State**: 3 RBAC functions (observations only)

**Target State**: 8 RBAC functions (observations + audits + access helpers)

#### New Functions to Add

**3.1 Audit-Related RBAC Functions** (`src/lib/rbac-queries.ts`)

**Add `buildAuditWhereClause()`**:
```typescript
export function buildAuditWhereClause(
  userId: string,
  role: Role | string,
  filters?: {
    plantId?: string;
    status?: AuditStatus;
  }
): Prisma.AuditWhereInput
```

**Logic by Role**:
- CFO/CXO_TEAM: All audits
- AUDIT_HEAD: Audits where `auditHeadId = userId` OR assigned as auditor
- AUDITOR: Audits where assigned via `AuditAssignment`
- AUDITEE/GUEST: Likely no access (clarify requirements)

**Add `getAuditsForUser()`**:
```typescript
export async function getAuditsForUser(
  userId: string,
  role: Role | string,
  filters?: AuditFilters,
  options?: {
    include?: Prisma.AuditInclude;
    orderBy?: Prisma.AuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
): Promise<Audit[]>
```

**Implementation**:
- Use `buildAuditWhereClause()`
- Apply filters
- Handle visibility rules (based on audit settings)
- Return audit array

**3.2 Access Control Helpers**

**Add `canAccessObservation()`**:
```typescript
export async function canAccessObservation(
  userId: string,
  role: Role | string,
  observationId: string
): Promise<boolean>
```

**Implementation**:
- Fetch observation with minimal fields
- Build where clause with `buildObservationWhereClause()`
- Check if observation matches where clause
- Return boolean

**Add `canAccessAudit()`**:
```typescript
export async function canAccessAudit(
  userId: string,
  role: Role | string,
  auditId: string
): Promise<boolean>
```

**Implementation**:
- Similar to `canAccessObservation()` but for audits
- Check against audit RBAC rules
- Return boolean

**3.3 Enhanced Filtering**

**Update `ObservationFilters` interface** (`src/lib/types/agent.ts`):
```typescript
export interface ObservationFilters {
  // Existing
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;

  // New in Phase 2
  plantId?: string;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  process?: 'O2C' | 'P2P' | 'R2R' | 'INVENTORY';
  published?: boolean;
  searchQuery?: string;
}
```

**Update `buildObservationWhereClause()`** to handle new filters:
```typescript
// Add to existing function
if (filters?.plantId) {
  baseFilters.push({ plantId: filters.plantId });
}

if (filters?.process) {
  baseFilters.push({ concernedProcess: filters.process });
}

if (filters?.published !== undefined) {
  baseFilters.push({ isPublished: filters.published });
}

if (filters?.startDate || filters?.endDate) {
  const dateFilter: any = { audit: {} };
  if (filters.startDate) {
    dateFilter.audit.visitStartDate = { gte: new Date(filters.startDate) };
  }
  if (filters.endDate) {
    dateFilter.audit.visitEndDate = { lte: new Date(filters.endDate) };
  }
  baseFilters.push(dateFilter);
}

if (filters?.searchQuery) {
  // Add full-text search logic (see Area 2.2)
}
```

**3.4 Enhanced Stats Grouping**

**Update `getObservationStats()` signature**:
```typescript
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>>
```

**Update tool in MCP server** to accept new groupBy options:
```typescript
groupBy: z.enum(['approvalStatus', 'currentStatus', 'riskCategory', 'concernedProcess', 'auditId'])
```

---

### Area 4: API Refactoring

**Goal**: Eliminate code duplication by having existing API routes use the shared RBAC functions.

#### Files to Refactor

**4.1 Observations API** (`src/app/api/v1/observations/route.ts`)

**Current**: ~65 lines of inline RBAC filtering logic (lines 88-148)

**Target**: Replace with shared function call

**Changes**:
```typescript
// Before (lines 88-148)
let where: Prisma.ObservationWhereInput = ...;
if (isCFO(session.user.role) || isCXOTeam(session.user.role)) {
  // ... 60+ lines of role-specific logic
}

// After (~10 lines)
import { buildObservationWhereClause } from '@/lib/rbac-queries';

const where = buildObservationWhereClause(
  session.user.id,
  session.user.role,
  {
    plantId,
    auditId,
    startDate,
    endDate,
    risk,
    process,
    status,
    published: published === "1" ? true : published === "0" ? false : undefined,
    searchQuery: q
  }
);

const observations = await prisma.observation.findMany({ where, ... });
```

**Benefits**:
- Reduces code from ~65 lines to ~15 lines
- Ensures consistency between API and agent
- Single source of truth for RBAC logic
- Easier to maintain and test

**4.2 Audits API** (`src/app/api/v1/audits/route.ts`)

**Current**: ~60 lines of inline RBAC filtering + post-query filtering (lines 36-93)

**Target**: Replace with shared function

**Changes**:
```typescript
// Before (lines 36-93)
const where: any = { plantId, status };
if (isCFO(role) || isCXOTeam(role)) {
  // ... role-specific logic
}
const audits = await prisma.audit.findMany({ where });
// ... post-query filtering for AUDIT_HEAD/AUDITOR

// After (~10 lines)
import { getAuditsForUser } from '@/lib/rbac-queries';

const audits = await getAuditsForUser(
  session.user.id,
  session.user.role,
  { plantId, status },
  {
    include: {
      plant: true,
      assignments: { include: { auditor: true } }
    },
    orderBy: { createdAt: 'desc' }
  }
);
// Visibility rules now handled inside getAuditsForUser()
```

**Benefits**:
- Simplifies API route code
- Eliminates post-query filtering (moves to database level)
- Better performance (database does filtering)
- Consistency with agent RBAC

---

### Area 5: UI/UX Improvements

**Current State**: Basic chat interface with loading spinner

**Target State**: Modern chat experience with streaming, stop, clear, and better visuals

#### Improvements to Implement

**5.1 Streaming Text Display**

**Add animated streaming cursor**:
```tsx
{streamingContent && (
  <div className="flex justify-start">
    <div className="max-w-[80%] rounded-lg p-4 bg-neutral-100">
      <div className="whitespace-pre-wrap">{streamingContent}</div>
      <div className="inline-block w-2 h-4 bg-neutral-400 animate-pulse ml-1"></div>
    </div>
  </div>
)}
```

**5.2 Stop Generation Button**

**Replace Send button with Stop when streaming**:
```tsx
{isLoading ? (
  <button
    onClick={stopGeneration}
    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
  >
    Stop
  </button>
) : (
  <button
    onClick={sendMessage}
    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
  >
    Send
  </button>
)}
```

**Implement stop handler**:
```typescript
const stopGeneration = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    setIsLoading(false);

    // Save partial response
    if (streamingContent) {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: streamingContent + ' [Generation stopped]',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    }
  }
};
```

**5.3 Clear Chat Button**

**Add to chat header**:
```tsx
<div className="p-4 border-b flex justify-between">
  <div>User info...</div>
  <button
    onClick={clearChat}
    disabled={messages.length === 0}
    className="text-sm px-3 py-1 rounded border hover:bg-neutral-50"
  >
    Clear Chat
  </button>
</div>
```

**Implement clear handler**:
```typescript
const clearChat = () => {
  setMessages([]);
  setStreamingContent('');
};
```

**5.4 Better Empty State**

**Make example questions clickable**:
```tsx
const exampleQuestions = [
  "How many of my observations are in draft status?",
  "Show me all high-risk observations from the last month",
  "What audits am I assigned to?",
  "Give me a summary of observations by risk category"
];

<div className="space-y-2">
  {exampleQuestions.map((q, i) => (
    <button
      key={i}
      onClick={() => {
        setInput(q);
        // Auto-send or just populate input
      }}
      className="w-full text-left bg-neutral-50 p-3 rounded border hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
    >
      {q}
    </button>
  ))}
</div>
```

**5.5 Enhanced Visual Feedback**

**Update message display**:
- Add relative timestamps ("2 minutes ago")
- Add user avatar/initials
- Improve message spacing
- Add smooth scroll animation

**5.6 Better Error Handling**

**Categorize errors**:
```typescript
if (parsed.type === 'error') {
  let errorMessage = 'An error occurred';

  if (parsed.error.includes('session')) {
    errorMessage = 'Your session expired. Please refresh and log in again.';
  } else if (parsed.error.includes('permission')) {
    errorMessage = 'You don\'t have permission to access that data.';
  } else if (parsed.error.includes('database')) {
    errorMessage = 'Database error. Please try again.';
  }

  // Display user-friendly error
}
```

---

### Area 6: Production Features

#### 6.1 Rate Limiting

**Goal**: Prevent abuse of expensive agent queries

**Implementation Location**: `src/app/api/v1/agent/chat/route.ts`

**Strategy**: Use a simple in-memory rate limiter or Redis-based limiter

**Simple In-Memory Approach** (good for MVP Phase 2):
```typescript
// At top of file
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxRequests = 20, windowMs = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    // Start new window
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

// In POST handler (after auth)
if (!checkRateLimit(session.user.id)) {
  return NextResponse.json(
    { error: 'Rate limit exceeded. Please wait before sending more queries.' },
    { status: 429 }
  );
}
```

**Configuration**:
- Default: 20 requests per minute per user
- Adjustable via environment variables
- Different limits per role (optional)

**6.2 Audit Event Logging**

**Goal**: Log all agent interactions for compliance and analytics

**Implementation Location**: `src/app/api/v1/agent/chat/route.ts`

**What to Log**:
```typescript
import { writeAuditEvent } from '@/server/auditTrail';

// After successful agent response
await writeAuditEvent({
  entityType: 'AGENT_QUERY',
  entityId: session.user.id, // Or generate unique query ID
  action: 'QUERY',
  actorId: session.user.id,
  metadata: {
    query: message,
    toolsCalled: extractedToolNames, // Parse from agent response
    responseLength: responseText.length,
    cost: cost,
    tokens: usage
  }
});
```

**Benefits**:
- Compliance tracking
- Usage analytics
- Cost attribution
- Security audit trail
- Troubleshooting

**6.3 Structured Monitoring**

**Goal**: Comprehensive observability for production operations

**Metrics to Track**:

**Performance Metrics**:
```typescript
const startTime = Date.now();
// ... agent processing ...
const endTime = Date.now();

console.log(JSON.stringify({
  level: 'INFO',
  type: 'agent_query',
  userId: session.user.id,
  role: session.user.role,
  query: message,
  responseTime: endTime - startTime,
  cost: cost,
  tokens: usage,
  timestamp: new Date().toISOString()
}));
```

**Usage Metrics**:
- Queries per user
- Queries per role
- Most common questions
- Tool usage frequency

**Error Metrics**:
```typescript
console.error(JSON.stringify({
  level: 'ERROR',
  type: 'agent_error',
  userId: session.user.id,
  error: error.message,
  stack: error.stack,
  query: message,
  timestamp: new Date().toISOString()
}));
```

**Log Levels**:
- `INFO`: Successful queries, tool calls
- `WARN`: Rate limit hits, access denials
- `ERROR`: Failures, exceptions

**6.4 Error Categorization**

**Goal**: Better error handling and user feedback

**Error Categories**:

1. **Authentication Errors** (401)
   - Session expired
   - Missing credentials

2. **Authorization Errors** (403)
   - Insufficient permissions
   - Data access denied

3. **Validation Errors** (400)
   - Invalid input
   - Missing required fields

4. **Rate Limit Errors** (429)
   - Too many requests

5. **Database Errors** (500)
   - Connection failures
   - Query errors

6. **Agent Errors** (500)
   - Claude API failures
   - MCP server errors
   - Tool execution failures

**Implementation**:
```typescript
try {
  // Agent query
} catch (error: any) {
  let statusCode = 500;
  let userMessage = 'An error occurred';

  if (error.message.includes('authentication')) {
    statusCode = 401;
    userMessage = 'Authentication failed. Please log in again.';
  } else if (error.message.includes('permission')) {
    statusCode = 403;
    userMessage = 'You don\'t have permission to perform this action.';
  } else if (error.message.includes('validation')) {
    statusCode = 400;
    userMessage = 'Invalid request. Please check your input.';
  }

  console.error(JSON.stringify({
    level: 'ERROR',
    category: categorizeError(error),
    error: error.message,
    ...
  }));

  return NextResponse.json({ error: userMessage }, { status: statusCode });
}
```

---

### Area 7: Testing Infrastructure

**Current State**: Manual testing only

**Target State**: Automated unit and integration tests

#### 7.1 Unit Tests for RBAC Functions

**Create**: `src/lib/__tests__/rbac-queries.test.ts`

**Test Cases**:

**Test `buildObservationWhereClause()`**:
- ✅ CFO returns no additional filters
- ✅ CXO_TEAM returns no additional filters
- ✅ AUDIT_HEAD returns audit filter (auditHeadId OR assigned)
- ✅ AUDITOR returns audit assignment filter
- ✅ AUDITEE returns observation assignment filter
- ✅ GUEST returns published+approved filter
- ✅ Filters are combined correctly (AND logic)
- ✅ All filter types work (plantId, dates, risk, etc.)

**Test `getObservationsForUser()`**:
- ✅ Returns correct observations for each role
- ✅ Respects filters
- ✅ Handles pagination
- ✅ Returns empty array when no observations

**Test `getObservationStats()`**:
- ✅ Returns correct counts by groupBy field
- ✅ Respects RBAC filtering
- ✅ Handles all groupBy options

**Test `canAccessObservation()`**:
- ✅ Returns true when user has access
- ✅ Returns false when user doesn't have access
- ✅ Works for all roles

**Test Setup**:
```typescript
import { prismaMock } from '../../../test/prisma-mock';
import { buildObservationWhereClause } from '../rbac-queries';

describe('buildObservationWhereClause', () => {
  it('should return no additional filters for CFO', () => {
    const where = buildObservationWhereClause('user123', 'CFO', {});
    expect(where).toEqual({});
  });

  it('should filter by audit for AUDITOR', () => {
    const where = buildObservationWhereClause('user123', 'AUDITOR', {});
    expect(where).toHaveProperty('audit');
    expect(where.audit).toHaveProperty('assignments');
  });

  // ... more tests
});
```

#### 7.2 Integration Tests for Agent Flow

**Create**: `src/app/api/v1/agent/__tests__/chat.test.ts`

**Test Cases**:

**Authentication**:
- ✅ Returns 401 when not authenticated
- ✅ Returns 401 when email is missing
- ✅ Accepts valid session

**Request Validation**:
- ✅ Returns 400 for empty message
- ✅ Returns 400 for non-string message
- ✅ Accepts valid message

**Agent Response**:
- ✅ Returns streaming response
- ✅ Handles tool calls correctly
- ✅ Returns complete response
- ✅ Handles errors gracefully

**RBAC Enforcement**:
- ✅ AUDITOR doesn't see other auditors' observations
- ✅ Tools respect user permissions
- ✅ Access checks work correctly

**Rate Limiting**:
- ✅ Allows requests within limit
- ✅ Returns 429 when limit exceeded
- ✅ Resets after window expires

#### 7.3 Test All Roles

**Test Matrix**:

| Role | Test Scenario | Expected Result |
|------|---------------|-----------------|
| CFO | Query all observations | Returns all observations |
| CXO_TEAM | Query all observations | Returns all observations |
| AUDIT_HEAD | Query their audit observations | Returns only their audits |
| AUDITOR | Query assigned observations | Returns only assigned audits |
| AUDITEE | Query assigned observations | Returns only assigned observations |
| GUEST | Query observations | Returns only published+approved |

**Test Implementation**:
```typescript
describe('Agent RBAC enforcement', () => {
  it('AUDITOR should only see assigned observations', async () => {
    const response = await testAgentQuery(
      auditorSession,
      'How many observations do I have?'
    );

    expect(response.observations).toHaveLength(expectedCount);
    expect(response.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ auditId: assignedAuditId })
      ])
    );
  });
});
```

---

## Task Breakdown

### Phase 2.1: Streaming Foundation
1. ✅ Update API endpoint to use Server-Sent Events
2. ✅ Update client to handle streaming responses
3. ✅ Add streaming content display
4. ✅ Add stop generation functionality
5. ✅ Test streaming with different query types

### Phase 2.2: Expanded Tools
1. ✅ Add `buildAuditWhereClause()` function
2. ✅ Add `getAuditsForUser()` function
3. ✅ Create `get_my_audits` MCP tool
4. ✅ Add full-text search to `buildObservationWhereClause()`
5. ✅ Create `search_observations` MCP tool
6. ✅ Add `canAccessObservation()` helper
7. ✅ Create `get_observation_details` MCP tool
8. ✅ Add `canAccessAudit()` helper
9. ✅ Create `get_audit_details` MCP tool
10. ✅ Update tool definitions in agent system prompt

### Phase 2.3: Enhanced Filtering
1. ✅ Update `ObservationFilters` interface
2. ✅ Add plantId filter to `buildObservationWhereClause()`
3. ✅ Add date range filters
4. ✅ Add process filter
5. ✅ Add published filter
6. ✅ Add searchQuery handling
7. ✅ Update `get_my_observations` tool to accept new filters
8. ✅ Add concernedProcess to groupBy enum
9. ✅ Add auditId to groupBy enum
10. ✅ Update `get_observation_stats` tool

### Phase 2.4: UI Improvements
1. ✅ Add clear chat button
2. ✅ Make example questions clickable
3. ✅ Add streaming cursor animation
4. ✅ Improve empty state
5. ✅ Add better error messages
6. ✅ Improve message styling
7. ✅ Add smooth scroll
8. ✅ Add relative timestamps (optional)

### Phase 2.5: API Refactoring
1. ✅ Refactor `GET /api/v1/observations` to use `buildObservationWhereClause()`
2. ✅ Refactor `GET /api/v1/audits` to use `getAuditsForUser()`
3. ✅ Test refactored endpoints
4. ✅ Verify no regressions

### Phase 2.6: Production Features
1. ✅ Implement rate limiting
2. ✅ Add audit event logging
3. ✅ Add structured logging
4. ✅ Categorize errors
5. ✅ Add environment variable configuration
6. ✅ Test rate limiting
7. ✅ Test audit logging

### Phase 2.7: Testing
1. ✅ Set up Jest testing framework (if not already)
2. ✅ Create test utilities and mocks
3. ✅ Write unit tests for RBAC functions
4. ✅ Write integration tests for agent API
5. ✅ Write tests for all 6 roles
6. ✅ Achieve >80% code coverage on new code
7. ✅ Set up CI/CD to run tests

---

## Testing Strategy

### Manual Testing Checklist

**Streaming Functionality**:
- [ ] Text appears in real-time as streaming
- [ ] Stop button appears during streaming
- [ ] Stop button aborts request and saves partial response
- [ ] Complete responses are finalized correctly
- [ ] Errors during streaming are handled gracefully

**New Tools**:
- [ ] `get_my_audits` returns correct audits for each role
- [ ] `search_observations` finds relevant observations
- [ ] `get_observation_details` shows complete observation info
- [ ] `get_audit_details` shows complete audit info
- [ ] Access checks prevent unauthorized access

**UI Improvements**:
- [ ] Clear chat button works
- [ ] Clicking example questions populates/sends them
- [ ] Streaming cursor animates correctly
- [ ] Error messages are clear and helpful

**Production Features**:
- [ ] Rate limiting triggers after limit exceeded
- [ ] Audit events are logged correctly
- [ ] Logs are structured and parseable
- [ ] Errors are categorized correctly

**RBAC Enforcement** (Test with all 6 roles):
- [ ] CFO sees all data
- [ ] CXO_TEAM sees all data
- [ ] AUDIT_HEAD sees their audits
- [ ] AUDITOR sees assigned audits
- [ ] AUDITEE sees assigned observations
- [ ] GUEST sees published only

### Automated Testing

**Unit Tests**:
- Run: `npm test src/lib/__tests__/rbac-queries.test.ts`
- Coverage target: >90% for RBAC functions

**Integration Tests**:
- Run: `npm test src/app/api/v1/agent/__tests__/chat.test.ts`
- Coverage target: >80% for API endpoints

**Performance Tests**:
- Verify streaming response starts within 1 second
- Verify complete response time < 15 seconds
- Verify rate limiting doesn't affect legitimate usage

---

## Deployment Strategy

### Pre-Deployment

1. **Code Review**
   - Review all changes
   - Ensure tests pass
   - Check for security issues
   - Verify RBAC enforcement

2. **Staging Deployment**
   - Deploy to staging environment
   - Run full test suite
   - Manual testing with all roles
   - Load testing (optional)

3. **Documentation**
   - Update API documentation
   - Document new tools
   - Update user guides
   - Create migration notes

### Deployment Approach

**Option 1: Feature Flag** (Recommended)
```typescript
// Add to .env
AGENT_STREAMING_ENABLED=false
AGENT_NEW_TOOLS_ENABLED=false
AGENT_RATE_LIMIT_ENABLED=true

// In code
if (process.env.AGENT_STREAMING_ENABLED === 'true') {
  // Use streaming
} else {
  // Use old request/response
}
```

**Benefits**:
- Enable features gradually
- Easy rollback if issues
- A/B testing capability

**Option 2: Phased Rollout**

**Week 1**: Deploy to staging
- Internal team testing
- Fix critical bugs

**Week 2**: Deploy to production (streaming disabled)
- Enable new tools only
- Monitor errors and performance

**Week 3**: Enable streaming
- For CFO and CXO_TEAM only
- Monitor performance and user feedback

**Week 4**: Enable for all users
- Full rollout
- Monitor costs and usage

### Rollback Plan

If issues arise:

1. **Immediate**: Disable feature flags
   ```bash
   AGENT_STREAMING_ENABLED=false
   AGENT_NEW_TOOLS_ENABLED=false
   ```

2. **If needed**: Revert to MVP version
   - Tag current production as `mvp-v1`
   - Deploy previous stable version
   - Investigate issues offline

3. **Database**: No schema changes in Phase 2
   - No rollback needed for database

---

## Success Criteria

### User Experience Metrics

- ✅ **Response Time**: First word appears < 2 seconds
- ✅ **Complete Response**: Total time < 15 seconds (95th percentile)
- ✅ **Stop Generation**: Works within 1 second
- ✅ **Error Rate**: < 5% of queries fail
- ✅ **User Satisfaction**: >4/5 rating (if surveyed)

### Functional Metrics

- ✅ **RBAC Enforcement**: Zero data leakage incidents
- ✅ **Tool Usage**: All 6 tools used in production
- ✅ **Search Quality**: >80% of searches return relevant results
- ✅ **Rate Limiting**: Zero legitimate users blocked

### Performance Metrics

- ✅ **Streaming**: >90% of queries stream successfully
- ✅ **Database Performance**: Query time < 200ms (avg)
- ✅ **Memory Usage**: No memory leaks
- ✅ **Cost per Query**: < $0.02 per query (avg)

### Code Quality Metrics

- ✅ **Test Coverage**: >80% on new code
- ✅ **Code Duplication**: Reduced by 150+ lines
- ✅ **Type Safety**: No `any` types (except known Prisma limitations)
- ✅ **Documentation**: All public functions documented

### Adoption Metrics

- ✅ **Usage**: 50% of active users try new features in first month
- ✅ **Retention**: 40% of users continue using weekly
- ✅ **Query Diversity**: All 6 tools used at least once per day
- ✅ **Common Questions**: Identify top 10 most asked questions

---

## Cost Management

### Expected Cost Impact

**Current MVP Costs** (~$24-$120/month):
- 10-50 users
- 10 queries/user/day
- ~$0.008 per query

**Phase 2 Projected Costs** (~$120-$600/month):
- 50-100 users
- 15 queries/user/day (increased due to better UX)
- ~$0.01 per query (slightly higher due to more complex queries)

**Cost Optimization Strategies**:

1. **Rate Limiting**: Prevent runaway costs
2. **Caching**: Cache common queries (future)
3. **Model Selection**: Use appropriate Claude model
4. **Context Management**: Limit unnecessary context in prompts
5. **Monitoring**: Alert on abnormal usage patterns

---

## Migration Path

### From MVP to Phase 2

**No Breaking Changes**:
- All MVP functionality remains
- New features are additive
- No database schema changes
- API backward compatible

**Gradual Enablement**:
1. Deploy code with features disabled
2. Enable new tools first
3. Enable streaming after monitoring
4. Enable rate limiting last (after baseline established)

**Data Migration**: None required

**Configuration Changes**:
```bash
# Add to .env
AGENT_RATE_LIMIT_REQUESTS=20
AGENT_RATE_LIMIT_WINDOW_MS=60000
AGENT_STREAMING_ENABLED=true
```

---

## Risk Mitigation

### Identified Risks

**Risk 1: Streaming Performance Issues**
- **Mitigation**: Feature flag to disable, fallback to request/response
- **Monitoring**: Track streaming errors and latency

**Risk 2: Increased Costs**
- **Mitigation**: Rate limiting, cost monitoring, alerts
- **Monitoring**: Daily cost tracking, per-user limits

**Risk 3: New Tools Not Used**
- **Mitigation**: User education, in-app guidance
- **Monitoring**: Track tool usage frequency

**Risk 4: RBAC Violations with New Tools**
- **Mitigation**: Comprehensive testing, code review, audit logging
- **Monitoring**: Monitor audit logs for access denials

**Risk 5: Performance Degradation**
- **Mitigation**: Database indexing, query optimization, caching
- **Monitoring**: Response time tracking, database query analysis

---

## Post-Phase 2 Enhancements

### Future Considerations (Phase 3)

Once Phase 2 is stable, consider:

1. **Conversation History**
   - Store chat sessions in database
   - Allow users to resume conversations
   - Search conversation history

2. **Export & Sharing**
   - Export chat to PDF
   - Share insights with team
   - Generate reports from queries

3. **Suggested Follow-ups**
   - Agent suggests related questions
   - Context-aware recommendations
   - Guided exploration

4. **Visualizations**
   - Chart generation for statistics
   - Trend analysis graphs
   - Interactive dashboards

5. **Advanced Search**
   - Semantic search
   - Cross-entity search
   - Saved searches

6. **Multi-language Support**
   - UI translations
   - Query translation
   - Response translation

7. **Voice Interface**
   - Speech-to-text input
   - Text-to-speech output
   - Hands-free operation

8. **Predictive Analytics**
   - Risk prediction
   - Trend forecasting
   - Anomaly detection

---

## Conclusion

**Phase 2 transforms the validated MVP into a production-ready AI agent system** with:

- ✅ **Better UX**: Streaming responses, stop generation, clear chat
- ✅ **More Capabilities**: 6 tools, comprehensive filtering, audit queries
- ✅ **Production-Grade**: Rate limiting, audit logging, monitoring
- ✅ **Higher Quality**: Refactored code, automated tests, better errors
- ✅ **Scalability**: Optimized queries, efficient architecture

**This phase builds on the proven foundation while maintaining stability and backward compatibility.**

The implementation is designed to be:
- **Incremental**: Deploy features gradually
- **Measurable**: Clear success criteria
- **Reversible**: Feature flags for quick rollback
- **Sustainable**: Lower maintenance burden through refactoring

**Next Steps**: Begin with Phase 2.1 (Streaming Foundation) to deliver immediate UX improvements while building toward the full Phase 2 vision.
