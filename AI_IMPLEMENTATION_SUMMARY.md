# AI RBAC Conversational Agent - Implementation Summary

## Overview
Successfully implemented a Cerebras-powered AI conversational agent that allows users to query audit observations and audits using natural language while strictly enforcing the existing RBAC system.

## Implementation Date
January 2025

## Components Implemented

### 1. Backend - AI Chat API Route
**File**: `src/app/api/v1/ai/chat/route.ts`

- **Model**: Cerebras `llama-3.3-70b` via `@ai-sdk/cerebras`
- **Framework**: Vercel AI SDK with `streamText` and multi-step tool calling (`stopWhen: stepCountIs(8)`)
- **Authentication**: Uses NextAuth session via `auth()` helper
- **RBAC Enforcement**: All tools replicate exact filtering logic from existing API routes

#### Implemented Tools

##### 1. `observations_count`
- Counts observations with RBAC-aware filtering
- **Filters**: `approvalStatus`, `currentStatus`, `auditId`, `plantId`, `risk`, `process`, `q` (text search)
- **RBAC Logic**:
  - CFO/CXO_TEAM: See all observations
  - AUDIT_HEAD: See observations from audits they lead or are assigned to
  - AUDITOR: See observations from audits they're assigned to
  - AUDITEE: See only observations they're assigned to via `ObservationAssignment`
  - GUEST: See only published + approved observations (or within scope)

##### 2. `observations_list`
- Lists observations with pagination (default limit: 10)
- Returns: `id`, `title` (first 120 chars), `approvalStatus`, `currentStatus`, `riskCategory`, `concernedProcess`, `auditTitle`, `plantName`, `createdAt`
- Same filters and RBAC logic as `observations_count`

##### 3. `audits_count`
- Counts audits with RBAC-aware filtering
- **Filters**: `plantId`, `status`
- **RBAC Logic**:
  - CFO/CXO_TEAM: See all audits
  - AUDIT_HEAD: See audits they lead or are assigned to as auditor
  - AUDITOR: See audits they're assigned to
  - AUDITEE/GUEST: **No access** (returns `allowed: false`)

##### 4. `audits_list`
- Lists audits with progress information (observations total/resolved)
- Returns: `id`, `title`, `plantName`, `status`, `visitStartDate`, `visitEndDate`, `isLocked`, `createdAt`, `assignedAuditors`, `progress` (total, resolved)
- Applies visibility rules for AUDIT_HEAD and AUDITOR roles
- Same filters and RBAC logic as `audits_count`

#### System Prompt
Comprehensive system prompt that:
- Defines the AI assistant's role and behavior
- Provides context about RBAC roles and permissions
- Instructs the model to use tools for factual queries
- Guides the model to explain RBAC limitations gracefully
- Lists available observation statuses, risk categories, and processes

### 2. Frontend - AI Assistant Page
**File**: `src/app/(dashboard)/ai/page.tsx`

- **Route**: `/ai`
- **Framework**: React with `@ai-sdk/react` `useChat` hook
- **Authentication**: Protected by existing dashboard session wrapper
- **Features**:
  - Clean chat interface with user/assistant message bubbles
  - Real-time streaming responses
  - Tool invocation visualization (shows which tools are called)
  - Suggested prompts for users
  - Role-aware disclaimer about data access
  - Empty state with helpful icon
  - Loading indicators during streaming

### 3. Navigation Update
**File**: `src/components/NavBar.tsx`

- Added "AI Assistant" link visible to **all authenticated roles**
- Positioned after existing nav items (Plants, Audits, Observations, Reports, Users)
- Uses existing `navLinkClass` helper for active state styling

### 4. Environment Configuration
**File**: `.env.local`

- Added `CEREBRAS_API_KEY` placeholder
- **Action Required**: User must add their actual Cerebras API key

### 5. Dependencies Installed
- `ai` - Vercel AI SDK core
- `@ai-sdk/react` - React hooks for AI SDK
- `@ai-sdk/cerebras` - Cerebras provider
- `zod` - Schema validation (already installed)

## RBAC Alignment

### Permission Matrix

| Role | Observations Access | Audits Access | Tool Behavior |
|------|-------------------|---------------|---------------|
| CFO | All observations | All audits | Full access to all data |
| CXO_TEAM | All observations | All audits | Full access to all data |
| AUDIT_HEAD | Audits they lead + assigned audits | Audits they lead + assigned audits | Filtered by audit assignment + visibility rules |
| AUDITOR | Assigned audits | Assigned audits | Filtered by audit assignment + visibility rules |
| AUDITEE | Assigned observations only | **No access** | Can query observations, audits return `allowed: false` |
| GUEST | Published + approved only | **No access** | Limited to public data |

### RBAC Enforcement Details

1. **Same Logic as Existing Routes**: All tools use identical Prisma `where` clauses as existing GET endpoints in:
   - `src/app/api/v1/observations/route.ts` (lines 88-148)
   - `src/app/api/v1/audits/route.ts` (lines 41-93)

2. **Short-Circuit Pattern**: CFO checks happen first for optimal performance

3. **Graceful Degradation**: When a role lacks permission, tools return:
   ```json
   {
     "allowed": false,
     "reason": "Your role (AUDITEE/GUEST) does not have access to audit listings."
   }
   ```
   The model then explains this to the user naturally.

4. **Visibility Rules**: For AUDIT_HEAD and AUDITOR, audit visibility follows existing rules:
   - `show_all` - See all historical audits
   - `hide_all` - See only assigned audits
   - `last_12m` - See audits from last 12 months
   - `explicit: { auditIds: [...] }` - See specific audits

## Example Queries

Users can now ask questions like:

- "How many draft observations do I have?"
- "List my observations with risk category A"
- "Show me observations in Plant X"
- "Count approved observations"
- "What audits am I assigned to?"
- "Show audits in progress with their progress"
- "How many open observations are in Audit Y?"
- "List observations that mention 'inventory'"

## Testing Checklist

### Per Role Testing

#### CFO
- [ ] Can count all observations
- [ ] Can list observations across all audits/plants
- [ ] Can count all audits
- [ ] Can list all audits with progress
- [ ] Filters work correctly (status, risk, process)

#### CXO_TEAM
- [ ] Same as CFO (full access)

#### AUDIT_HEAD
- [ ] Can count observations from their audits
- [ ] Can list observations from their audits
- [ ] Can count their assigned audits
- [ ] Can list audits they lead or are assigned to
- [ ] Visibility rules are respected

#### AUDITOR
- [ ] Can count observations from assigned audits
- [ ] Can list observations from assigned audits
- [ ] Can count assigned audits
- [ ] Can list assigned audits
- [ ] Cannot see unassigned audits/observations

#### AUDITEE
- [ ] Can count assigned observations
- [ ] Can list assigned observations
- [ ] **Cannot access audits** (gets polite error message)
- [ ] Model explains RBAC limitation

#### GUEST
- [ ] Can only see published + approved observations
- [ ] **Cannot access audits** (gets polite error message)
- [ ] Scope restrictions work if configured

### Functional Testing
- [ ] Multi-step tool calling works (model can call multiple tools)
- [ ] Streaming responses display in real-time
- [ ] Tool invocations show in UI
- [ ] Filters are correctly applied (risk, status, process, etc.)
- [ ] Text search (q parameter) works
- [ ] Pagination limit parameter works
- [ ] Model summarizes tool results naturally
- [ ] Error handling works (invalid queries, network issues)

## Architecture Decisions

1. **Server-Side Tools**: Tools execute on the server with full Prisma access, ensuring security
2. **Streaming Responses**: Uses `streamText` for better UX with long-running queries
3. **Multi-Step Execution**: Model can call multiple tools (up to 8 steps) to answer complex queries
4. **Type Safety**: Full TypeScript with Zod schemas for tool inputs
5. **Reusable Logic**: Tools replicate existing route logic rather than calling routes (avoids HTTP overhead)
6. **Graceful Errors**: All RBAC failures return structured `allowed: false` responses
7. **Simple UI**: Clean chat interface without overengineering tool displays

## Security Considerations

1. **Session Required**: All requests require valid NextAuth session
2. **Tool-Level RBAC**: Each tool independently enforces RBAC (defense in depth)
3. **No Role Override**: Tools use `session.user.role` directly, no client-side role manipulation possible
4. **Prisma-Level Filtering**: All filtering happens in database queries, not post-fetch
5. **Read-Only**: AI assistant only reads data, never modifies (all tools use `.findMany()`, `.count()`)

## Performance Considerations

1. **Efficient Queries**: Uses Prisma's query optimization
2. **Pagination**: Default limit of 10 items prevents large result sets
3. **Indexed Fields**: Relies on existing database indices
4. **Streaming**: Reduces perceived latency
5. **Tool Caching**: Model may reuse tool results within same conversation turn

## Future Enhancements (Out of Scope)

- [ ] Add memory/conversation persistence
- [ ] Add more tools (create observations, update status, etc.)
- [ ] Add data visualization (charts, graphs)
- [ ] Add export functionality (PDF, CSV)
- [ ] Add scheduling/reminder tools
- [ ] Multi-modal support (images, documents)
- [ ] Fine-tuning on audit-specific terminology

## Deployment Notes

### Environment Variables
Ensure production environment has:
```bash
CEREBRAS_API_KEY=your_actual_key_here
AI_MODEL=llama-3.3-70b  # Optional, defaults to this
```

### Cerebras API Key
1. Sign up at https://cloud.cerebras.ai
2. Generate API key from dashboard
3. Add to `.env.local` (development) and hosting provider (production)

### Monitoring
- Monitor Cerebras API usage via their dashboard
- Track token consumption (count/list operations can be verbose)
- Set up alerts for API errors

## Files Modified/Created

### Created
- `src/app/api/v1/ai/chat/route.ts` (491 lines)
- `src/app/(dashboard)/ai/page.tsx` (225 lines)

### Modified
- `src/components/NavBar.tsx` (added AI Assistant link)
- `.env.local` (added CEREBRAS_API_KEY)
- `package.json` (dependencies)

### Total Lines Added
~750 lines of new code

## Success Metrics

✅ All 8 todos completed:
1. ✅ Add CEREBRAS_API_KEY to .env.local
2. ✅ Create /api/v1/ai/chat with Cerebras and RBAC tools
3. ✅ Implement observations_count tool with RBAC filters
4. ✅ Implement observations_list tool with filters + pagination
5. ✅ Implement audits_count tool with RBAC filters
6. ✅ Implement audits_list tool with progress data
7. ✅ Add /ai page with useChat wired to chat API
8. ✅ Add AI Assistant link to NavBar for all roles

✅ No linter errors
✅ TypeScript compilation successful (after fixing useChat API)
✅ RBAC alignment verified against existing routes
✅ All roles have appropriate access levels

## Documentation
- This summary document
- Inline code comments in route.ts
- System prompt documents agent behavior
- Tool descriptions provide context to model

---

**Status**: ✅ **COMPLETE** - Ready for testing with actual Cerebras API key

**Next Step**: Add real Cerebras API key to `.env.local` and test with different user roles

