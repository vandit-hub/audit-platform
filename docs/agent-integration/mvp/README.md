# AI Agent MVP - Task Breakdown

This directory contains the step-by-step implementation plan for the AI Conversational Agent MVP.

## Overview

**Goal:** Build a minimal viable product that allows users to ask questions about their audit observations using natural language, while respecting RBAC restrictions.

**Timeline:** 3-5 days

**Complexity:** ~800 lines of code across 6 new files

## Task List

Follow these tasks in order:

### ✅ Task 1: Install Dependencies (5 min)
**File:** `TASK_1.md`
- Install Claude Agent SDK
- Configure environment variables

### ✅ Task 2: Create Type Definitions (30 min)
**File:** `TASK_2.md`
- Create `src/lib/types/agent.ts`
- Define interfaces for agent tools

### ✅ Task 3: Create RBAC Query Functions (2-3 hours)
**File:** `TASK_3.md`
- Create `src/lib/rbac-queries.ts`
- Extract RBAC filtering logic
- Implement 3 core functions

### ✅ Task 4: Create MCP Server with Tools (3-4 hours)
**File:** `TASK_4.md`
- Create `src/agent/mcp-server.ts`
- Implement 2 MCP tools:
  - `get_my_observations`
  - `get_observation_stats`

### ✅ Task 5: Create Agent API Endpoint (2-3 hours)
**File:** `TASK_5.md`
- Create `src/app/api/v1/agent/chat/route.ts`
- Implement POST handler
- Simple request/response (no streaming)

### ✅ Task 6: Create Chat UI Components (3-4 hours)
**File:** `TASK_6.md`
- Create `src/app/(dashboard)/agent-chat/page.tsx`
- Create `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`
- Build functional chat interface

### ✅ Task 7: Add Navigation Link (15 min)
**File:** `TASK_7.md`
- Modify `src/components/NavBar.tsx`
- Add link to AI Assistant

### ✅ Task 8: Manual Testing (3-4 hours)
**File:** `TASK_8.md`
- Test with 3 roles (AUDITOR, AUDIT_HEAD, CFO)
- Verify RBAC enforcement
- Document bugs

### ✅ Task 9: Deployment (2-3 hours)
**File:** `TASK_9.md`
- Deploy to production
- Monitor initial usage
- Set up cost tracking

## Quick Start

1. Read `../MVP_PLAN.md` for full context
2. Start with `TASK_1.md`
3. Complete each task in order
4. Mark tasks complete as you go
5. Document any issues encountered

## Files Created

By the end of these tasks, you will have created:

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/types/agent.ts` | ~50 | Type definitions |
| `src/lib/rbac-queries.ts` | ~180 | RBAC filtering functions |
| `src/agent/mcp-server.ts` | ~200 | MCP server with 2 tools |
| `src/app/api/v1/agent/chat/route.ts` | ~150 | API endpoint |
| `src/app/(dashboard)/agent-chat/page.tsx` | ~30 | Server component |
| `src/app/(dashboard)/agent-chat/AgentChatClient.tsx` | ~180 | Client component |

**Total:** ~790 lines of new code + 4 lines modified

## MVP Scope

### ✅ Included
- Observations-only queries (no audits)
- 2 MCP tools (get observations, get stats)
- Basic filtering (status, risk, audit)
- Simple request/response (no streaming)
- Clean, functional UI
- Full RBAC enforcement

### ❌ Excluded (Post-MVP)
- Streaming responses
- Audit queries
- Full-text search
- Conversation history
- Mobile UI
- Automated tests

## Success Criteria

MVP is successful if:
- ✅ Users can ask basic questions about observations
- ✅ RBAC restrictions are enforced (no data leakage)
- ✅ Response time < 10 seconds
- ✅ UI is functional and usable
- ✅ Costs stay under $50/month initially

## Support

If you encounter issues:
1. Check the specific task's troubleshooting section
2. Review `../MVP_PLAN.md` for detailed implementation
3. Check `../AGENT_INTEGRATION_PLAN.md` for architectural context

## After Completion

Once all tasks are done:
1. Collect user feedback
2. Monitor usage and costs
3. Identify most common questions
4. Plan Phase 2 enhancements

## Progress Tracking

Track your progress:

- [ ] Task 1: Dependencies installed
- [ ] Task 2: Types created
- [ ] Task 3: RBAC functions implemented
- [ ] Task 4: MCP server created
- [ ] Task 5: API endpoint working
- [ ] Task 6: UI implemented
- [ ] Task 7: Navigation added
- [ ] Task 8: Testing complete
- [ ] Task 9: Deployed to production

**Good luck with the implementation! 🚀**
