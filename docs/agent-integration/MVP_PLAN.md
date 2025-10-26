# AI Conversational Agent - MVP Implementation Plan

## Executive Summary

This document outlines the **Minimum Viable Product (MVP)** implementation for an AI conversational agent that helps users query their audit observations using natural language. The MVP focuses on proving the core concept with minimal complexity.

**MVP Goal:** Enable users to ask simple questions about their observations (e.g., "How many draft observations do I have?") while respecting RBAC restrictions.

**Estimated Development Time:** 3-5 days

**Estimated Code:** ~800 lines across 6 new files

---

## MVP Scope

### ✅ Included in MVP

1. **Observations Only** - No audit queries in MVP
2. **2 MCP Tools** - Basic data fetching and statistics
3. **Simple Request/Response** - No streaming (faster to build)
4. **Basic Chat UI** - Functional and clean, desktop-only
5. **Manual Testing** - Test with 3 roles (AUDITOR, AUDIT_HEAD, CFO)
6. **RBAC Enforcement** - Core security requirement

### ❌ Excluded from MVP

- ❌ Streaming responses (use simple request/response)
- ❌ Audit-related queries (observations only)
- ❌ Search functionality (can filter by basic criteria only)
- ❌ Observation detail views (list view only)
- ❌ Advanced filters (dates, full-text search, etc.)
- ❌ Stop generation / clear chat buttons
- ❌ Conversation history storage
- ❌ Audit logging of agent queries
- ❌ Automated tests (manual testing only)
- ❌ Mobile responsive UI (desktop first)
- ❌ Refactoring existing API routes

### MVP Success Criteria

✅ User can ask "How many observations do I have?" → Agent responds with counts
✅ User can ask "Show me draft observations" → Agent lists them with basic details
✅ User can ask "How many high-risk observations?" → Agent returns filtered counts
✅ AUDITOR only sees observations from assigned audits
✅ AUDIT_HEAD sees observations from audits they lead
✅ CFO sees all observations
✅ UI is functional and easy to use on desktop

---

## Architecture Overview (MVP)

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat UI (Desktop Only)                    │
│  /agent-chat page with message list + input                 │
└─────────────────────────────────────────────────────────────┘
                            ↓ POST /api/v1/agent/chat
┌─────────────────────────────────────────────────────────────┐
│              Agent API Endpoint (No Streaming)               │
│  - Authenticate user                                         │
│  - Call Claude Agent SDK                                     │
│  - Wait for complete response                                │
│  - Return JSON response                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Claude Agent SDK                           │
│  - Process user question                                     │
│  - Call MCP tools as needed                                  │
│  - Generate natural language response                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│             MCP Server (2 Tools Only)                        │
│  Tool 1: get_my_observations(filters?)                      │
│  Tool 2: get_observation_stats(groupBy)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              RBAC Query Functions (New)                      │
│  buildObservationWhereClause(userId, role, filters)         │
│  getObservationsForUser(userId, role, filters, options)     │
│  getObservationStats(userId, role, groupBy, filters)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Prisma + PostgreSQL                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Install Dependencies

**Duration:** 5 minutes

```bash
npm install @anthropic-ai/claude-agent-sdk
```

**Update `.env`:**
```bash
# Add your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

### Step 2: Create RBAC Query Functions

**Duration:** 2-3 hours

**File:** `src/lib/rbac-queries.ts`

This file contains all RBAC filtering logic, extracted from existing API routes.

```typescript
/**
 * RBAC Query Functions for Agent MVP
 *
 * These functions encapsulate role-based access control logic for observations.
 * They ensure that users only see data they're authorized to access.
 */

import { prisma } from "@/server/db";
import { Prisma, Role } from "@prisma/client";
import { isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, buildScopeWhere } from "@/lib/scope";

/**
 * Basic filters supported in MVP
 */
export interface ObservationFilters {
  auditId?: string;
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  riskCategory?: 'A' | 'B' | 'C';
  currentStatus?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  limit?: number;
}

/**
 * Builds a Prisma WHERE clause for observations based on user role and filters.
 * This encapsulates the RBAC logic from src/app/api/v1/observations/route.ts
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters to apply
 * @returns Prisma WHERE clause
 */
export function buildObservationWhereClause(
  userId: string,
  role: Role | string,
  filters?: ObservationFilters
): Prisma.ObservationWhereInput {
  // Start with base filters
  const baseFilters: Prisma.ObservationWhereInput[] = [];

  if (filters?.auditId) {
    baseFilters.push({ auditId: filters.auditId });
  }

  if (filters?.approvalStatus) {
    baseFilters.push({ approvalStatus: filters.approvalStatus });
  }

  if (filters?.riskCategory) {
    baseFilters.push({ riskCategory: filters.riskCategory });
  }

  if (filters?.currentStatus) {
    baseFilters.push({ currentStatus: filters.currentStatus });
  }

  let where: Prisma.ObservationWhereInput =
    baseFilters.length > 0 ? { AND: baseFilters } : {};

  // Apply role-based filtering
  // CFO and CXO_TEAM see ALL observations
  if (isCFO(role) || isCXOTeam(role)) {
    // No additional filter - they have unrestricted access
    return where;
  }

  // AUDIT_HEAD sees observations from audits where they are the audit head OR assigned as auditor
  else if (isAuditHead(role)) {
    const auditHeadFilter: Prisma.ObservationWhereInput = {
      audit: {
        OR: [
          { auditHeadId: userId }, // Audits where they are the audit head
          { assignments: { some: { auditorId: userId } } } // Audits where they're assigned as auditor
        ]
      }
    };
    where = { AND: [where, auditHeadFilter] };
  }

  // AUDITOR sees observations from audits they're assigned to
  else if (isAuditor(role)) {
    const auditorFilter: Prisma.ObservationWhereInput = {
      audit: {
        assignments: {
          some: {
            auditorId: userId
          }
        }
      }
    };
    where = { AND: [where, auditorFilter] };
  }

  // AUDITEE sees only observations they're assigned to via ObservationAssignment
  else if (isAuditee(role)) {
    const auditeeFilter: Prisma.ObservationWhereInput = {
      assignments: {
        some: {
          auditeeId: userId
        }
      }
    };
    where = { AND: [where, auditeeFilter] };
  }

  // GUEST sees only published+approved OR scoped observations
  else if (isGuest(role)) {
    // Note: This is async in the original, but we'll handle it in the calling function
    // For now, just return the basic filter and handle guest scope in getObservationsForUser
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    where = { AND: [where, allowPublished] };
  }

  return where;
}

/**
 * Fetches observations for a user with RBAC enforcement
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param filters - Optional filters
 * @param options - Prisma query options (include, orderBy, take, skip)
 * @returns Array of observations the user can access
 */
export async function getObservationsForUser(
  userId: string,
  role: Role | string,
  filters?: ObservationFilters,
  options?: {
    include?: Prisma.ObservationInclude;
    orderBy?: Prisma.ObservationOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
) {
  let where = buildObservationWhereClause(userId, role, filters);

  // Handle GUEST scope (async operation)
  if (isGuest(role)) {
    const scope = await getUserScope(userId);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    where = { AND: [where, { OR: or }] };
  }

  // Apply limit from filters if provided
  const take = filters?.limit || options?.take;

  const observations = await prisma.observation.findMany({
    where,
    include: options?.include,
    orderBy: options?.orderBy || { createdAt: 'desc' },
    take,
    skip: options?.skip
  });

  return observations;
}

/**
 * Gets aggregated observation statistics for a user
 *
 * @param userId - Current user's ID
 * @param role - Current user's role
 * @param groupBy - Field to group by ('approvalStatus', 'currentStatus', or 'riskCategory')
 * @param filters - Optional filters
 * @returns Array of grouped statistics with counts
 */
export async function getObservationStats(
  userId: string,
  role: Role | string,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; _count: { _all: number } }>> {
  const where = buildObservationWhereClause(userId, role, filters);

  // Handle GUEST scope
  if (isGuest(role)) {
    const scope = await getUserScope(userId);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    where.AND = [where, { OR: or }];
  }

  const stats = await prisma.observation.groupBy({
    by: [groupBy],
    where,
    _count: {
      _all: true
    }
  });

  return stats;
}
```

**Key Points:**
- Extracts RBAC logic from existing `src/app/api/v1/observations/route.ts`
- Supports basic filters only (auditId, approvalStatus, riskCategory, currentStatus, limit)
- Each role gets appropriate filtering applied
- Reusable by both MCP tools and (optionally) existing API routes later

**Estimated Lines:** ~180 lines

---

### Step 3: Create Type Definitions

**Duration:** 30 minutes

**File:** `src/lib/types/agent.ts`

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

**Estimated Lines:** ~50 lines

---

### Step 4: Create MCP Server with 2 Tools

**Duration:** 3-4 hours

**File:** `src/agent/mcp-server.ts`

```typescript
/**
 * MCP Server for AI Agent MVP
 *
 * Provides 2 tools for the agent to query observation data:
 * 1. get_my_observations - Fetch observations with basic filters
 * 2. get_observation_stats - Get aggregated counts
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getObservationsForUser, getObservationStats } from '@/lib/rbac-queries';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * Tool 1: get_my_observations
 *
 * Fetches observations the user has access to based on their role.
 * Supports basic filtering by audit, status, and risk category.
 */
const getMyObservationsTool = tool(
  'get_my_observations',
  'Fetches observations the user has access to. Supports filtering by audit ID, approval status, risk category, and current status. Returns a list of observations with basic details.',
  {
    auditId: z.string().optional().describe('Filter by specific audit ID'),
    approvalStatus: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional()
      .describe('Filter by approval status'),
    riskCategory: z.enum(['A', 'B', 'C']).optional()
      .describe('Filter by risk category (A=High, B=Medium, C=Low)'),
    currentStatus: z.enum(['PENDING_MR', 'MR_UNDER_REVIEW', 'REFERRED_BACK', 'OBSERVATION_FINALISED', 'RESOLVED']).optional()
      .describe('Filter by current observation status'),
    limit: z.number().optional().default(20)
      .describe('Maximum number of observations to return (default: 20, max: 50)')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      // Enforce maximum limit
      const limit = Math.min(args.limit || 20, 50);

      const observations = await getObservationsForUser(
        userContext.userId,
        userContext.role,
        {
          auditId: args.auditId,
          approvalStatus: args.approvalStatus,
          riskCategory: args.riskCategory,
          currentStatus: args.currentStatus,
          limit
        },
        {
          include: {
            plant: { select: { id: true, name: true, code: true } },
            audit: { select: { id: true, title: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      );

      // Transform to summary format (truncate long text)
      const summary = observations.map(obs => ({
        id: obs.id,
        observationText: obs.observationText.length > 150
          ? obs.observationText.slice(0, 150) + '...'
          : obs.observationText,
        riskCategory: obs.riskCategory,
        concernedProcess: obs.concernedProcess,
        currentStatus: obs.currentStatus,
        approvalStatus: obs.approvalStatus,
        isPublished: obs.isPublished,
        createdAt: obs.createdAt.toISOString(),
        audit: {
          id: obs.audit.id,
          title: obs.audit.title
        },
        plant: {
          id: obs.plant.id,
          name: obs.plant.name,
          code: obs.plant.code
        }
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            observations: summary,
            count: observations.length,
            totalShown: summary.length,
            hasMore: observations.length === limit,
            filters: {
              auditId: args.auditId,
              approvalStatus: args.approvalStatus,
              riskCategory: args.riskCategory,
              currentStatus: args.currentStatus
            }
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in get_my_observations:', error);
      return {
        content: [{
          type: 'text',
          text: `Error fetching observations: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Tool 2: get_observation_stats
 *
 * Returns aggregated observation counts grouped by a specified field.
 * Useful for answering questions like "How many observations do I have by status?"
 */
const getObservationStatsTool = tool(
  'get_observation_stats',
  'Returns aggregated observation counts grouped by a specified field (approvalStatus, currentStatus, or riskCategory). Use this to get summary statistics.',
  {
    groupBy: z.enum(['approvalStatus', 'currentStatus', 'riskCategory'])
      .describe('Field to group observations by'),
    auditId: z.string().optional()
      .describe('Optional: Filter stats to specific audit ID')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      const stats = await getObservationStats(
        userContext.userId,
        userContext.role,
        args.groupBy,
        {
          auditId: args.auditId
        }
      );

      // Transform stats to friendlier format
      const formattedStats = stats.map(stat => ({
        [args.groupBy]: stat[args.groupBy] || 'null',
        count: stat._count._all
      }));

      const totalCount = formattedStats.reduce((sum, stat) => sum + stat.count, 0);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            groupBy: args.groupBy,
            stats: formattedStats,
            totalCount,
            filters: {
              auditId: args.auditId
            }
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in get_observation_stats:', error);
      return {
        content: [{
          type: 'text',
          text: `Error fetching observation statistics: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Create and export the MCP server instance
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

**Key Points:**
- Only 2 tools to keep MVP simple
- Each tool validates inputs with Zod schemas
- Tools receive user context (userId, role) from the agent endpoint
- Results formatted as JSON for the agent to parse
- Error handling included

**Estimated Lines:** ~200 lines

---

### Step 5: Create Agent API Endpoint (Simple Request/Response)

**Duration:** 2-3 hours

**File:** `src/app/api/v1/agent/chat/route.ts`

```typescript
/**
 * Agent Chat API Endpoint - MVP Version
 *
 * Simple request/response (no streaming).
 * User sends a question, waits for complete response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { auth } from '@/lib/auth';
import { auditDataMcpServer } from '@/agent/mcp-server';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * POST /api/v1/agent/chat
 *
 * Handles user questions about observations.
 * Returns complete response (no streaming in MVP).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // 3. Create user context for MCP tools
    const userContext: AgentUserContext = {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name || session.user.email
    };

    console.log(`[Agent] User ${userContext.email} (${userContext.role}) asked: "${message}"`);

    // 4. Call Claude Agent SDK
    const agentQuery = query({
      prompt: message,
      options: {
        mcpServers: {
          'audit-data': {
            type: 'sdk',
            name: 'audit-data-mvp',
            instance: auditDataMcpServer.instance
          }
        },
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: `You are an AI assistant for an internal audit platform. You help users understand and analyze their observation data.

Current User:
- Name: ${userContext.name}
- Role: ${userContext.role}

Role Access Levels:
- CFO: Full access to all observations across the organization
- CXO_TEAM: Can view all observations
- AUDIT_HEAD: Can view observations from audits they lead or are assigned to
- AUDITOR: Can view observations from audits they are assigned to
- AUDITEE: Can view only observations they are assigned to
- GUEST: Limited read-only access to published observations

Available Tools:
You have 2 tools to fetch observation data:
1. get_my_observations - Fetches observations with optional filters (audit, status, risk)
2. get_observation_stats - Returns aggregated counts grouped by a field

IMPORTANT: The data returned by these tools is already filtered based on the user's role. You will only see observations the user is authorized to access.

Guidelines:
1. Be conversational and helpful
2. Always use the tools to get real data - never make up numbers
3. When showing observation lists, display key details (risk, status, plant)
4. Format statistics clearly (use bullet points or simple tables)
5. If the user has no observations matching their query, say so politely
6. For questions about counts, use get_observation_stats first (more efficient)
7. Only use get_my_observations if the user wants to see specific observations
8. Keep responses concise but informative`
        },
        allowedTools: [
          'get_my_observations',
          'get_observation_stats'
        ],
        permissionMode: 'bypassPermissions',
        model: 'claude-sonnet-4-5',
        includePartialMessages: false
      }
    });

    // 5. Collect complete response (no streaming in MVP)
    let responseText = '';
    let usage: any = null;
    let cost = 0;

    for await (const msg of agentQuery) {
      if (msg.type === 'assistant') {
        // Extract text from assistant message
        for (const block of msg.message.content) {
          if (block.type === 'text') {
            responseText += block.text;
          }
        }
      }

      if (msg.type === 'result') {
        usage = msg.usage;
        cost = msg.total_cost_usd || 0;
      }
    }

    console.log(`[Agent] Response generated. Cost: $${cost.toFixed(4)}`);

    // 6. Return complete response
    return NextResponse.json({
      success: true,
      response: responseText,
      metadata: {
        usage,
        cost
      }
    });

  } catch (error: any) {
    console.error('[Agent] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing your request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/agent/chat
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/v1/agent/chat',
    method: 'POST',
    description: 'AI Agent chat endpoint (MVP - simple request/response)'
  });
}
```

**Key Points:**
- No streaming - waits for complete response before returning
- Simpler to implement and debug
- Authenticates user via NextAuth session
- Passes user context to MCP tools
- Returns JSON response with agent's answer
- Includes cost tracking for monitoring

**Estimated Lines:** ~150 lines

---

### Step 6: Create Chat UI

**Duration:** 3-4 hours

#### 6a. Server Component (Page)

**File:** `src/app/(dashboard)/agent-chat/page.tsx`

```typescript
/**
 * Agent Chat Page - Server Component
 *
 * Handles authentication and renders the client component.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AgentChatClient from './AgentChatClient';

export const metadata = {
  title: 'AI Assistant - Audit Platform',
  description: 'Ask questions about your observations'
};

export default async function AgentChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">AI Assistant</h1>
        <p className="text-neutral-600 mt-1">
          Ask questions about your observations. For example: "How many draft observations do I have?"
        </p>
      </div>

      <AgentChatClient user={session.user} />
    </div>
  );
}
```

**Estimated Lines:** ~30 lines

---

#### 6b. Client Component (Chat Interface)

**File:** `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

```typescript
/**
 * Agent Chat Client - MVP Version
 *
 * Simple chat interface with message list and input.
 * No streaming - shows loading spinner while waiting for response.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from 'next-auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatClientProps {
  user: User & { role: string };
}

export default function AgentChatClient({ user }: AgentChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200 flex flex-col" style={{ height: '600px' }}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="text-sm text-neutral-600">
          <span className="font-medium">{user.name || user.email}</span>
          <span className="mx-2">•</span>
          <span className="text-neutral-500">{user.role}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <p className="mb-4">Ask me about your observations!</p>
            <div className="text-sm space-y-2 max-w-md mx-auto text-left">
              <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                "How many observations do I have?"
              </div>
              <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                "Show me my draft observations"
              </div>
              <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
                "How many high-risk observations?"
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-100 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
```

**Key Features:**
- Simple message list (user messages on right, agent on left)
- Loading animation while waiting for response
- Example questions shown when empty
- Clean, functional design
- Desktop-only (no mobile optimization in MVP)

**Estimated Lines:** ~180 lines

---

#### 6c. Add Navigation Link

**File:** `src/components/NavBar.tsx`

**Add this link after existing navigation items:**

```typescript
{/* AI Assistant link - add after other nav items */}
<Link
  href="/agent-chat"
  className={navLinkClass("/agent-chat")}
>
  AI Assistant
</Link>
```

---

### Step 7: Update Package.json

**File:** `package.json`

Add the dependency:

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    // ... existing dependencies
  }
}
```

Then run:
```bash
npm install
```

---

## Testing Checklist

### Manual Testing (Required for MVP)

**Test with 3 different roles:**

#### 1. Test as AUDITOR

- [ ] Login as `auditor@example.com` (password: `auditor123`)
- [ ] Navigate to `/agent-chat`
- [ ] Ask: "How many observations do I have?"
  - Expected: Should return counts for observations from assigned audits only
- [ ] Ask: "Show me my draft observations"
  - Expected: Should list draft observations, only from assigned audits
- [ ] Ask: "How many high-risk observations?"
  - Expected: Should return count of Category A observations from assigned audits
- [ ] Verify: Cannot see observations from unassigned audits

#### 2. Test as AUDIT_HEAD

- [ ] Login as `audithead@example.com` (password: `audithead123`)
- [ ] Navigate to `/agent-chat`
- [ ] Ask: "How many observations do I have?"
  - Expected: Should return counts for observations from audits they lead
- [ ] Ask: "Show me approved observations"
  - Expected: Should list approved observations from their audits
- [ ] Verify: Can see observations from audits they lead

#### 3. Test as CFO

- [ ] Login as `cfo@example.com` (password: `cfo123`)
- [ ] Navigate to `/agent-chat`
- [ ] Ask: "How many observations are there?"
  - Expected: Should return counts for ALL observations in the system
- [ ] Ask: "Show me all observations"
  - Expected: Should list observations across all audits
- [ ] Verify: Has unrestricted access

#### 4. General Tests (Any Role)

- [ ] Test with no observations: "Show me observations"
  - Expected: Agent says user has no observations
- [ ] Test with invalid filter: "Show me observations from audit XYZ999"
  - Expected: Agent says no observations found for that audit
- [ ] Test error handling: Disconnect database, send message
  - Expected: Error message displayed to user
- [ ] Test UI:
  - [ ] Messages display correctly
  - [ ] Scrolling works
  - [ ] Loading animation shows while waiting
  - [ ] Input is disabled while loading
  - [ ] Enter key sends message
  - [ ] Shift+Enter adds new line

---

## Deployment Steps

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variable:**
   ```bash
   # Add to .env
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   ```

3. **Start development servers:**
   ```bash
   # Terminal 1: Next.js
   npm run dev

   # Terminal 2: WebSocket server (if needed for other features)
   npm run ws:dev
   ```

4. **Test:**
   - Navigate to `http://localhost:3005/agent-chat`
   - Login with test credentials
   - Try asking questions

### Production Deployment

1. **Build:**
   ```bash
   npm run build:prod
   ```

2. **Environment variables:**
   - Ensure `ANTHROPIC_API_KEY` is set in production environment
   - All other existing env vars remain the same

3. **Deploy:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

## Cost Estimation

### Per Query Cost

**Model:** Claude Sonnet 4.5
- Input tokens: ~500 (system prompt) + ~50 (user question) + ~1000 (tool data) = ~1,550 tokens
- Output tokens: ~200 (agent response)

**Cost per query:** ~$0.008 (less than 1 cent)

### Monthly Estimates

| Users | Queries/User/Day | Monthly Cost |
|-------|------------------|--------------|
| 10    | 10               | ~$24         |
| 20    | 10               | ~$48         |
| 50    | 10               | ~$120        |

**MVP Budget Recommendation:** Start with $50/month cap

---

## Success Metrics for MVP

### Adoption
- [ ] Target: 30% of active users try the agent within first week
- [ ] Target: 10+ questions asked per day

### Accuracy
- [ ] Target: >90% of questions answered correctly
- [ ] Target: Zero RBAC violations (users seeing unauthorized data)

### User Feedback
- [ ] Collect qualitative feedback from first 10 users
- [ ] Identify most common questions asked
- [ ] Note any questions the agent struggles with

---

## Known Limitations (MVP)

1. **No Streaming** - Users wait for complete response (can be 3-10 seconds)
2. **Basic Filters Only** - No date ranges, no full-text search
3. **Observations Only** - Cannot query audit information
4. **No History** - Conversations not saved (refresh = lost)
5. **Desktop Only** - UI not optimized for mobile
6. **No Error Recovery** - If agent fails, user must retry manually
7. **Limited Context** - Agent doesn't remember previous questions in conversation

---

## Post-MVP Enhancements (Future)

### Phase 2 (After MVP Validation)
- Add streaming responses for better UX
- Add audit-related queries
- Add conversation history storage
- Add "clear chat" button
- Mobile-responsive UI

### Phase 3 (If Successful)
- Add search/filter by date ranges
- Add observation detail views
- Add export chat to PDF
- Add suggested follow-up questions
- Add audit logging

---

## Files Summary

### New Files Created (6 files)

1. `src/lib/rbac-queries.ts` - RBAC filtering functions (~180 lines)
2. `src/lib/types/agent.ts` - Type definitions (~50 lines)
3. `src/agent/mcp-server.ts` - MCP server with 2 tools (~200 lines)
4. `src/app/api/v1/agent/chat/route.ts` - API endpoint (~150 lines)
5. `src/app/(dashboard)/agent-chat/page.tsx` - Server component (~30 lines)
6. `src/app/(dashboard)/agent-chat/AgentChatClient.tsx` - Client component (~180 lines)

### Modified Files (2 files)

1. `src/components/NavBar.tsx` - Add navigation link (+3 lines)
2. `package.json` - Add dependency (+1 line)

**Total New Code:** ~790 lines
**Total Modified Code:** ~4 lines

---

## Development Timeline

### Day 1 (Setup + RBAC)
- Install dependencies (30 min)
- Create `src/lib/rbac-queries.ts` (2-3 hours)
- Create `src/lib/types/agent.ts` (30 min)
- Test RBAC functions manually (1 hour)

### Day 2 (MCP Server + API)
- Create `src/agent/mcp-server.ts` (3-4 hours)
- Create `src/app/api/v1/agent/chat/route.ts` (2-3 hours)
- Test API endpoint with Postman/curl (1 hour)

### Day 3 (UI)
- Create chat page components (3-4 hours)
- Add navigation link (15 min)
- Test UI locally (1 hour)
- Fix bugs (1-2 hours)

### Day 4 (Testing)
- Manual testing with all roles (3-4 hours)
- Fix any RBAC issues found (2-3 hours)
- Polish UI based on testing (1 hour)

### Day 5 (Deployment + Buffer)
- Deploy to staging (1 hour)
- Final testing in staging (2 hours)
- Deploy to production (1 hour)
- Buffer for unexpected issues (2-3 hours)

**Total:** 3-5 days depending on experience level and issues encountered

---

## Troubleshooting

### Common Issues

**Issue 1: "Module not found: @anthropic-ai/claude-agent-sdk"**
- Solution: Run `npm install @anthropic-ai/claude-agent-sdk`

**Issue 2: "ANTHROPIC_API_KEY is not defined"**
- Solution: Add `ANTHROPIC_API_KEY=sk-ant-...` to `.env` file

**Issue 3: Agent returns empty response**
- Check browser console for errors
- Check server logs for agent errors
- Verify ANTHROPIC_API_KEY is valid

**Issue 4: User sees observations they shouldn't**
- Debug `buildObservationWhereClause()` with console.log
- Check that correct userId and role are passed
- Verify AuditAssignment records exist in database

**Issue 5: Loading spinner never stops**
- Check browser Network tab for failed request
- Check API route logs for errors
- Verify fetch error handling in client component

---

## Next Steps After MVP

Once MVP is validated:

1. **Collect Feedback:**
   - Survey first users
   - Track which questions are asked most
   - Note questions the agent struggles with

2. **Analyze Usage:**
   - How many queries per day?
   - Which tools are called most?
   - Average response time?
   - Cost per query?

3. **Decide on Enhancements:**
   - Is streaming worth adding?
   - Should we add audit queries?
   - Do users want conversation history?
   - What filters are most requested?

4. **Plan Phase 2:**
   - Prioritize features based on feedback
   - Estimate effort for each enhancement
   - Set timeline for next iteration

---

## Conclusion

This MVP provides a **focused, achievable implementation** of the AI agent concept. By limiting scope to observations-only with basic filters and simple request/response, we can:

- ✅ Ship in 3-5 days instead of 2-3 weeks
- ✅ Validate the concept with real users
- ✅ Keep costs low (<$50/month initially)
- ✅ Maintain security with RBAC enforcement
- ✅ Build foundation for future enhancements

**The MVP proves the value before investing in advanced features.**

Once validated, we can incrementally add streaming, audit queries, search, conversation history, and other enhancements based on actual user needs.
