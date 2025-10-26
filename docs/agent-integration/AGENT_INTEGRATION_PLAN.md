# AI Conversational Agent Integration Plan

## Executive Summary

This document outlines the complete implementation plan for integrating an AI conversational agent into the audit platform. The agent will allow users to ask natural language questions about their audits and observations (e.g., "How many of my observations are open?") while respecting the existing RBAC (Role-Based Access Control) system.

**Key Principles:**
- **Security First**: Agent must respect all RBAC restrictions at runtime
- **Consistent Data**: Same filtering logic as REST API endpoints
- **Streaming Responses**: Real-time response delivery
- **Tool-Based Architecture**: Agent uses MCP (Model Context Protocol) tools to fetch data
- **No Context Pre-loading**: Data fetched on-demand based on user queries

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Chat UI Page (/agent-chat)                                │    │
│  │  - Message input/display                                   │    │
│  │  - Streaming response rendering                            │    │
│  │  - Session management                                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓ HTTP POST
┌─────────────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                             │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  POST /api/v1/agent/chat                                   │    │
│  │  - Authenticates user (NextAuth session)                   │    │
│  │  - Validates request                                       │    │
│  │  - Initializes Claude Agent SDK                            │    │
│  │  - Streams response back to client                         │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Claude Agent SDK Layer                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Agent Runtime                                             │    │
│  │  - Processes natural language query                        │    │
│  │  - Determines which tools to call                          │    │
│  │  - Executes tool calls with user context                   │    │
│  │  - Generates natural language response                     │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       MCP Server Layer                               │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Custom MCP Tools                                          │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │  get_my_observations(filters?)                       │ │    │
│  │  │  get_my_audits(filters?)                             │ │    │
│  │  │  get_observation_stats(groupBy?)                     │ │    │
│  │  │  search_observations(query)                          │ │    │
│  │  │  get_audit_details(auditId)                          │ │    │
│  │  │  get_observation_details(observationId)              │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  │  Each tool receives: { userId, role } from agent context  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    RBAC Query Layer (New)                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Shared RBAC Query Functions (src/lib/rbac-queries.ts)    │    │
│  │  ┌──────────────────────────────────────────────────────┐ │    │
│  │  │  buildObservationWhereClause(userId, role, filters) │ │    │
│  │  │  buildAuditWhereClause(userId, role, filters)       │ │    │
│  │  │  getObservationsForUser(userId, role, filters)      │ │    │
│  │  │  getAuditsForUser(userId, role, filters)            │ │    │
│  │  │  getObservationStats(userId, role, groupBy)         │ │    │
│  │  └──────────────────────────────────────────────────────┘ │    │
│  │  - Encapsulates RBAC filtering logic                      │    │
│  │  - Reused by both MCP tools AND existing API routes       │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      Database Layer (Prisma)                         │
│  PostgreSQL with RBAC-filtered queries                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Extract and Centralize RBAC Logic

**Objective**: Create reusable RBAC query functions that can be used by both existing API routes and the new agent tools.

#### Files to Create

##### 1. `src/lib/rbac-queries.ts`

**Purpose**: Central repository for RBAC-aware database queries.

**Key Functions**:

```typescript
/**
 * Builds a Prisma WHERE clause for observations based on user role
 * This encapsulates the same logic from src/app/api/v1/observations/route.ts:88-148
 */
export function buildObservationWhereClause(
  userId: string,
  role: Role,
  filters?: {
    plantId?: string;
    auditId?: string;
    startDate?: string;
    endDate?: string;
    risk?: RiskCategory;
    process?: Process;
    status?: ObservationStatus;
    published?: boolean;
    approvalStatus?: ApprovalStatus;
    searchQuery?: string;
  }
): Prisma.ObservationWhereInput

/**
 * Builds a Prisma WHERE clause for audits based on user role
 * This encapsulates the logic from src/app/api/v1/audits/route.ts:36-93
 */
export function buildAuditWhereClause(
  userId: string,
  role: Role,
  filters?: {
    plantId?: string;
    status?: AuditStatus;
  }
): Prisma.AuditWhereInput

/**
 * Fetches observations for a user with RBAC enforcement
 */
export async function getObservationsForUser(
  userId: string,
  role: Role,
  filters?: ObservationFilters,
  options?: {
    include?: Prisma.ObservationInclude;
    orderBy?: Prisma.ObservationOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
): Promise<Observation[]>

/**
 * Fetches audits for a user with RBAC enforcement
 */
export async function getAuditsForUser(
  userId: string,
  role: Role,
  filters?: AuditFilters,
  options?: {
    include?: Prisma.AuditInclude;
    orderBy?: Prisma.AuditOrderByWithRelationInput;
    take?: number;
    skip?: number;
  }
): Promise<Audit[]>

/**
 * Gets aggregated observation statistics for a user
 */
export async function getObservationStats(
  userId: string,
  role: Role,
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId',
  filters?: ObservationFilters
): Promise<Array<{ [key: string]: any; count: number }>>

/**
 * Checks if a user has access to a specific observation
 */
export async function canAccessObservation(
  userId: string,
  role: Role,
  observationId: string
): Promise<boolean>

/**
 * Checks if a user has access to a specific audit
 */
export async function canAccessAudit(
  userId: string,
  role: Role,
  auditId: string
): Promise<boolean>
```

**RBAC Logic by Role** (extracted from existing API routes):

```typescript
// CFO and CXO_TEAM: See all observations/audits (no filter)
if (isCFO(role) || isCXOTeam(role)) {
  // No additional filter - unrestricted access
}

// AUDIT_HEAD: See observations from audits where they are the audit head OR assigned as auditor
else if (isAuditHead(role)) {
  where.audit = {
    OR: [
      { auditHeadId: userId },
      { assignments: { some: { auditorId: userId } } }
    ]
  };
}

// AUDITOR: See observations from audits they're assigned to
else if (isAuditor(role)) {
  where.audit = {
    assignments: {
      some: { auditorId: userId }
    }
  };
}

// AUDITEE: See only observations they're assigned to
else if (isAuditee(role)) {
  where.assignments = {
    some: { auditeeId: userId }
  };
}

// GUEST: See published+approved OR scoped observations
else if (isGuest(role)) {
  const scope = await getUserScope(userId);
  const scopeWhere = buildScopeWhere(scope);
  const allowPublished = {
    AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
  };
  where.OR = [allowPublished];
  if (scopeWhere) where.OR.push(scopeWhere);
}
```

**Estimated Lines**: ~300 lines

---

##### 2. `src/lib/types/agent.ts`

**Purpose**: TypeScript type definitions for agent tools and responses.

```typescript
// Tool input types
export interface GetObservationsInput {
  plantId?: string;
  auditId?: string;
  startDate?: string; // ISO date string
  endDate?: string;
  risk?: 'A' | 'B' | 'C';
  process?: 'O2C' | 'P2P' | 'R2R' | 'INVENTORY';
  status?: 'PENDING_MR' | 'MR_UNDER_REVIEW' | 'REFERRED_BACK' | 'OBSERVATION_FINALISED' | 'RESOLVED';
  approvalStatus?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  published?: boolean;
  limit?: number;
}

export interface GetAuditsInput {
  plantId?: string;
  status?: 'PLANNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'SIGNED_OFF';
  limit?: number;
}

export interface GetObservationStatsInput {
  groupBy: 'approvalStatus' | 'currentStatus' | 'riskCategory' | 'concernedProcess' | 'auditId';
  plantId?: string;
  auditId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SearchObservationsInput {
  query: string;
  limit?: number;
}

export interface GetObservationDetailsInput {
  observationId: string;
}

export interface GetAuditDetailsInput {
  auditId: string;
}

// User context passed to all tools
export interface AgentUserContext {
  userId: string;
  role: string;
  email: string;
  name: string;
}

// Tool response types
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

export interface AuditSummary {
  id: string;
  title: string | null;
  status: string;
  visitStartDate: string | null;
  visitEndDate: string | null;
  plant: {
    id: string;
    name: string;
  };
  observationCount: number;
}

export interface StatResult {
  [key: string]: any;
  count: number;
}
```

**Estimated Lines**: ~100 lines

---

#### Files to Modify

##### 1. `src/app/api/v1/observations/route.ts`

**Changes**: Refactor `GET` handler to use `buildObservationWhereClause()`.

**Before** (lines 85-148):
```typescript
let where: Prisma.ObservationWhereInput = filters.length > 0 ? { AND: filters } : {};

// CFO and CXO_TEAM can see all observations
if (isCFO(session.user.role) || isCXOTeam(session.user.role)) {
  if (published === "1") where = { AND: [where, { isPublished: true }] };
  else if (published === "0") where = { AND: [where, { isPublished: false }] };
}
// AUDIT_HEAD can see observations from audits where they are the audit head OR assigned as auditor
else if (isAuditHead(session.user.role)) {
  // ... 60 lines of role-specific filtering
}
// ... etc
```

**After**:
```typescript
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
```

**Estimated Changes**: Replace ~65 lines with ~15 lines

---

##### 2. `src/app/api/v1/audits/route.ts`

**Changes**: Refactor `GET` handler to use `buildAuditWhereClause()`.

**Before** (lines 36-93):
```typescript
const where: any = { plantId, status };

// Apply role-based filtering
if (isCFO(role) || isCXOTeam(role)) {
  // CFO and CXO_TEAM see all audits - no additional filters
} else if (isAuditHead(role)) {
  // ... role-specific filtering
}
// ... etc

const audits = await prisma.audit.findMany({ where, include: { ... } });

// Apply visibility rules for AUDIT_HEAD and AUDITOR
let filteredAudits = audits;
if (isAuditHead(role) || isAuditor(role)) {
  filteredAudits = audits.filter((audit) => {
    // ... complex filtering logic
  });
}
```

**After**:
```typescript
import { getAuditsForUser } from '@/lib/rbac-queries';

const audits = await getAuditsForUser(
  session.user.id,
  session.user.role,
  { plantId, status },
  {
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  }
);
// Note: visibility rules now handled inside getAuditsForUser()
```

**Estimated Changes**: Replace ~60 lines with ~15 lines

---

### Phase 2: Create MCP Server with Custom Tools

**Objective**: Build the Model Context Protocol (MCP) server that provides tools for the Claude agent to fetch audit/observation data.

#### Files to Create

##### 1. `src/agent/mcp-server.ts`

**Purpose**: Main MCP server with all custom tools for data access.

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  getObservationsForUser,
  getAuditsForUser,
  getObservationStats,
  canAccessObservation,
  canAccessAudit
} from '@/lib/rbac-queries';
import { prisma } from '@/server/db';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * Tool 1: get_my_observations
 * Fetches observations the user has access to based on RBAC
 */
const getMyObservationsTool = tool(
  'get_my_observations',
  'Fetches observations the user has access to. Supports filtering by plant, audit, date range, risk, process, status, and approval status.',
  {
    plantId: z.string().optional().describe('Filter by plant ID'),
    auditId: z.string().optional().describe('Filter by audit ID'),
    startDate: z.string().optional().describe('Filter by audit start date (ISO format)'),
    endDate: z.string().optional().describe('Filter by audit end date (ISO format)'),
    risk: z.enum(['A', 'B', 'C']).optional().describe('Filter by risk category'),
    process: z.enum(['O2C', 'P2P', 'R2R', 'INVENTORY']).optional().describe('Filter by concerned process'),
    status: z.enum(['PENDING_MR', 'MR_UNDER_REVIEW', 'REFERRED_BACK', 'OBSERVATION_FINALISED', 'RESOLVED']).optional().describe('Filter by observation status'),
    approvalStatus: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional().describe('Filter by approval status'),
    published: z.boolean().optional().describe('Filter by published status'),
    limit: z.number().optional().default(50).describe('Maximum number of observations to return (default: 50)')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      const observations = await getObservationsForUser(
        userContext.userId,
        userContext.role,
        {
          plantId: args.plantId,
          auditId: args.auditId,
          startDate: args.startDate,
          endDate: args.endDate,
          risk: args.risk,
          process: args.process,
          status: args.status,
          approvalStatus: args.approvalStatus,
          published: args.published
        },
        {
          include: {
            plant: { select: { id: true, name: true, code: true } },
            audit: { select: { id: true, title: true, visitStartDate: true, visitEndDate: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: args.limit
        }
      );

      const summary = observations.map(obs => ({
        id: obs.id,
        observationText: obs.observationText.slice(0, 150) + (obs.observationText.length > 150 ? '...' : ''),
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
          name: obs.plant.name
        }
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            observations: summary,
            count: observations.length,
            hasMore: observations.length === args.limit
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
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
 * Tool 2: get_my_audits
 * Fetches audits the user has access to based on RBAC
 */
const getMyAuditsTool = tool(
  'get_my_audits',
  'Fetches audits the user has access to. Supports filtering by plant and status.',
  {
    plantId: z.string().optional().describe('Filter by plant ID'),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF']).optional().describe('Filter by audit status'),
    limit: z.number().optional().default(50).describe('Maximum number of audits to return (default: 50)')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      const audits = await getAuditsForUser(
        userContext.userId,
        userContext.role,
        {
          plantId: args.plantId,
          status: args.status
        },
        {
          include: {
            plant: { select: { id: true, name: true, code: true } },
            assignments: {
              include: {
                auditor: { select: { id: true, name: true, email: true } }
              }
            },
            _count: { select: { observations: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: args.limit
        }
      );

      const summary = audits.map(audit => ({
        id: audit.id,
        title: audit.title,
        status: audit.status,
        visitStartDate: audit.visitStartDate?.toISOString(),
        visitEndDate: audit.visitEndDate?.toISOString(),
        plant: {
          id: audit.plant.id,
          name: audit.plant.name,
          code: audit.plant.code
        },
        observationCount: audit._count.observations,
        auditors: audit.assignments.map(a => a.auditor.name)
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            audits: summary,
            count: audits.length,
            hasMore: audits.length === args.limit
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching audits: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Tool 3: get_observation_stats
 * Returns aggregated observation statistics grouped by specified field
 */
const getObservationStatsTool = tool(
  'get_observation_stats',
  'Returns aggregated observation counts grouped by a specified field (approvalStatus, currentStatus, riskCategory, concernedProcess, or auditId).',
  {
    groupBy: z.enum(['approvalStatus', 'currentStatus', 'riskCategory', 'concernedProcess', 'auditId']).describe('Field to group observations by'),
    plantId: z.string().optional().describe('Filter by plant ID'),
    auditId: z.string().optional().describe('Filter by audit ID'),
    startDate: z.string().optional().describe('Filter by audit start date'),
    endDate: z.string().optional().describe('Filter by audit end date')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      const stats = await getObservationStats(
        userContext.userId,
        userContext.role,
        args.groupBy,
        {
          plantId: args.plantId,
          auditId: args.auditId,
          startDate: args.startDate,
          endDate: args.endDate
        }
      );

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            groupBy: args.groupBy,
            stats: stats,
            totalCount: stats.reduce((sum, stat) => sum + stat.count, 0)
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching observation stats: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Tool 4: search_observations
 * Full-text search across observation text, risks, feedback, etc.
 */
const searchObservationsTool = tool(
  'search_observations',
  'Searches observations using full-text search across observation text, risks, and feedback. Returns only observations the user has access to.',
  {
    query: z.string().min(1).describe('Search query string'),
    limit: z.number().optional().default(20).describe('Maximum number of results (default: 20)')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      const observations = await getObservationsForUser(
        userContext.userId,
        userContext.role,
        {
          searchQuery: args.query
        },
        {
          include: {
            plant: { select: { id: true, name: true } },
            audit: { select: { id: true, title: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: args.limit
        }
      );

      const results = observations.map(obs => ({
        id: obs.id,
        observationText: obs.observationText.slice(0, 200),
        riskCategory: obs.riskCategory,
        currentStatus: obs.currentStatus,
        approvalStatus: obs.approvalStatus,
        plant: obs.plant.name,
        audit: obs.audit.title || obs.audit.id
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: args.query,
            results: results,
            count: results.length
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error searching observations: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Tool 5: get_observation_details
 * Fetches full details of a specific observation (if user has access)
 */
const getObservationDetailsTool = tool(
  'get_observation_details',
  'Fetches complete details of a specific observation including all fields, attachments, approvals, and action plans. User must have access to the observation.',
  {
    observationId: z.string().min(1).describe('Observation ID')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      // First check if user has access
      const hasAccess = await canAccessObservation(
        userContext.userId,
        userContext.role,
        args.observationId
      );

      if (!hasAccess) {
        return {
          content: [{
            type: 'text',
            text: 'Access denied: You do not have permission to view this observation.'
          }],
          isError: true
        } as CallToolResult;
      }

      const observation = await prisma.observation.findUnique({
        where: { id: args.observationId },
        include: {
          plant: true,
          audit: {
            select: {
              id: true,
              title: true,
              visitStartDate: true,
              visitEndDate: true,
              status: true,
              isLocked: true
            }
          },
          attachments: true,
          approvals: {
            include: {
              actor: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
          actionPlans: {
            orderBy: { createdAt: 'asc' }
          },
          assignments: {
            include: {
              auditee: { select: { id: true, name: true, email: true } }
            }
          }
        }
      });

      if (!observation) {
        return {
          content: [{
            type: 'text',
            text: 'Observation not found.'
          }],
          isError: true
        } as CallToolResult;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(observation, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching observation details: ${error.message}`
        }],
        isError: true
      } as CallToolResult;
    }
  }
);

/**
 * Tool 6: get_audit_details
 * Fetches full details of a specific audit (if user has access)
 */
const getAuditDetailsTool = tool(
  'get_audit_details',
  'Fetches complete details of a specific audit including all fields, assignments, and observation counts. User must have access to the audit.',
  {
    auditId: z.string().min(1).describe('Audit ID')
  },
  async (args, extra) => {
    const userContext = extra as AgentUserContext;

    try {
      // First check if user has access
      const hasAccess = await canAccessAudit(
        userContext.userId,
        userContext.role,
        args.auditId
      );

      if (!hasAccess) {
        return {
          content: [{
            type: 'text',
            text: 'Access denied: You do not have permission to view this audit.'
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
              checklist: { select: { id: true, name: true } },
              items: true
            }
          },
          _count: {
            select: {
              observations: true
            }
          }
        }
      });

      if (!audit) {
        return {
          content: [{
            type: 'text',
            text: 'Audit not found.'
          }],
          isError: true
        } as CallToolResult;
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(audit, null, 2)
        }]
      } as CallToolResult;
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error fetching audit details: ${error.message}`
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
  name: 'audit-data',
  version: '1.0.0',
  tools: [
    getMyObservationsTool,
    getMyAuditsTool,
    getObservationStatsTool,
    searchObservationsTool,
    getObservationDetailsTool,
    getAuditDetailsTool
  ]
});
```

**Estimated Lines**: ~400 lines

---

### Phase 3: Create Agent Chat API Endpoint

**Objective**: Build the Next.js API route that handles agent chat requests with streaming responses.

#### Files to Create

##### 1. `src/app/api/v1/agent/chat/route.ts`

**Purpose**: Main API endpoint for agent chat interactions.

```typescript
import { NextRequest } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { auth } from '@/lib/auth';
import { auditDataMcpServer } from '@/agent/mcp-server';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * POST /api/v1/agent/chat
 *
 * Handles conversational queries from users about their audits and observations.
 * Streaming endpoint that returns agent responses in real-time.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create user context for MCP tools
    const userContext: AgentUserContext = {
      userId: session.user.id,
      role: session.user.role,
      email: session.user.email,
      name: session.user.name || session.user.email
    };

    // 4. Initialize Claude Agent with streaming
    const agentQuery = query({
      prompt: message,
      options: {
        mcpServers: {
          'audit-data': {
            type: 'sdk',
            name: 'audit-data',
            instance: auditDataMcpServer.instance
          }
        },
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: `You are an AI assistant for an internal audit platform. You help users understand and analyze their audit data.

Current User Context:
- Name: ${userContext.name}
- Role: ${userContext.role}
- User ID: ${userContext.userId}

Role Capabilities:
- CFO: Full access to all audits and observations across the organization
- CXO_TEAM: Can view all audits and observations
- AUDIT_HEAD: Can view audits they lead or are assigned to
- AUDITOR: Can view audits they are assigned to
- AUDITEE: Can view observations they are assigned to
- GUEST: Limited read-only access

Available Tools:
You have access to tools that fetch audit and observation data. The data returned by these tools is already filtered based on the user's role and permissions - you will only see data the user is authorized to access.

Guidelines:
1. Always be helpful and conversational
2. Use the provided tools to fetch real-time data when answering questions
3. When providing statistics, cite the specific tool you used
4. If asked about data you cannot access, explain the user's access limitations politely
5. Offer to provide more details or drill down into specific audits/observations when appropriate
6. Format numerical data clearly (use tables when helpful)
7. For questions about compliance, risk, or specific processes, use the appropriate filters when calling tools
8. If the user asks for recommendations or analysis, base it on the actual data you fetch
9. Never make up data - always use the tools to get real information`
        },
        allowedTools: [
          'get_my_observations',
          'get_my_audits',
          'get_observation_stats',
          'search_observations',
          'get_observation_details',
          'get_audit_details'
        ],
        permissionMode: 'bypassPermissions', // Agent runs server-side with pre-authorized context
        model: 'claude-sonnet-4-5', // Use the latest Claude model
        includePartialMessages: false // We'll handle streaming ourselves
      }
    });

    // 5. Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';

          for await (const message of agentQuery) {
            // Filter for assistant messages (ignore system messages, tool use messages, etc.)
            if (message.type === 'assistant') {
              // Extract text content from assistant message
              const content = message.message.content;
              for (const block of content) {
                if (block.type === 'text') {
                  buffer += block.text;

                  // Send chunks to client
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`
                    )
                  );
                }
              }
            }

            // Send result message (final)
            if (message.type === 'result') {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'result',
                    status: message.subtype,
                    fullResponse: buffer,
                    usage: message.usage,
                    cost: message.total_cost_usd
                  })}\n\n`
                )
              );
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Agent streaming error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error.message || 'An error occurred while processing your request'
              })}\n\n`
            )
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/v1/agent/chat
 *
 * Health check endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/v1/agent/chat',
      method: 'POST'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

**Estimated Lines**: ~200 lines

---

### Phase 4: Create Chat UI Page

**Objective**: Build a user-friendly chat interface for interacting with the agent.

#### Files to Create

##### 1. `src/app/(dashboard)/agent-chat/page.tsx`

**Purpose**: Main chat UI page (server component for initial auth check).

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AgentChatClient from './AgentChatClient';

export const metadata = {
  title: 'AI Assistant - Audit Platform',
  description: 'Ask questions about your audits and observations'
};

export default async function AgentChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-neutral-900">AI Assistant</h1>
          <p className="text-neutral-600 mt-2">
            Ask questions about your audits and observations. I can help you find specific data,
            generate reports, and analyze trends.
          </p>
        </div>

        <AgentChatClient user={session.user} />
      </div>
    </div>
  );
}
```

**Estimated Lines**: ~30 lines

---

##### 2. `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

**Purpose**: Client-side chat interface with streaming support.

```typescript
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
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              if (data === '[DONE]') {
                // Streaming complete
                const assistantMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
                setStreamingContent('');
                break;
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'text') {
                  assistantContent += parsed.content;
                  setStreamingContent(assistantContent);
                } else if (parsed.type === 'error') {
                  console.error('Agent error:', parsed.error);
                  assistantContent += `\n\n[Error: ${parsed.error}]`;
                  setStreamingContent(assistantContent);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);

      // Save whatever was generated so far
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

  const clearChat = () => {
    setMessages([]);
    setStreamingContent('');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex flex-col h-[calc(100vh-12rem)]">
      {/* Chat header */}
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <div>
          <div className="text-sm text-neutral-600">
            Logged in as: <span className="font-medium">{user.name || user.email}</span>
          </div>
          <div className="text-xs text-neutral-500">
            Role: <span className="font-medium">{user.role}</span>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-1 rounded border border-neutral-300 hover:border-neutral-400"
          disabled={messages.length === 0}
        >
          Clear Chat
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
          <div className="text-center py-12">
            <div className="text-neutral-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-700 mb-2">Start a conversation</h3>
            <p className="text-neutral-500 mb-6">Try asking questions like:</p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200 text-sm">
                "How many of my observations are in draft status?"
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200 text-sm">
                "Show me all high-risk observations from the last month"
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200 text-sm">
                "What audits am I assigned to?"
              </div>
              <div className="bg-neutral-50 p-3 rounded border border-neutral-200 text-sm">
                "Give me a summary of observations by risk category"
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
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-neutral-500'
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-neutral-100 text-neutral-900">
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <div className="inline-block w-2 h-4 bg-neutral-400 animate-pulse ml-1"></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-neutral-200">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your audits or observations..."
            className="flex-1 resize-none rounded-lg border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          )}
        </div>
        <div className="text-xs text-neutral-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
```

**Estimated Lines**: ~300 lines

---

##### 3. Update `src/components/NavBar.tsx`

**Changes**: Add navigation link to the agent chat page.

```typescript
// Add after the existing navigation links
{session.user && (
  <Link
    href="/agent-chat"
    className={navLinkClass("/agent-chat")}
  >
    AI Assistant
  </Link>
)}
```

---

### Phase 5: Dependencies and Configuration

#### Files to Modify

##### 1. `package.json`

**Changes**: Add the Claude Agent SDK dependency.

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.1.0",
    // ... existing dependencies
  }
}
```

After adding, run:
```bash
npm install
```

---

##### 2. `.env` (or `.env.example`)

**Changes**: Document any required environment variables.

```bash
# Claude Agent SDK
ANTHROPIC_API_KEY=sk-ant-...  # Your Anthropic API key

# Existing variables
DATABASE_URL=...
NEXTAUTH_SECRET=...
# ... etc
```

---

##### 3. `tsconfig.json`

**Changes**: Ensure path alias includes agent directory.

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

**Files to create**:
- `src/lib/__tests__/rbac-queries.test.ts` - Test RBAC filtering logic
- `src/agent/__tests__/mcp-server.test.ts` - Test MCP tool responses

**Test Cases**:
1. **RBAC Query Functions**:
   - CFO sees all observations
   - AUDITOR sees only assigned observations
   - AUDIT_HEAD sees observations from their audits
   - AUDITEE sees only assigned observations
   - GUEST sees only published+approved observations

2. **MCP Tools**:
   - Tools correctly pass user context
   - Tools return properly formatted responses
   - Tools handle errors gracefully
   - Access checks work correctly

### Integration Tests

**Test Scenarios**:
1. **End-to-End Chat Flow**:
   - User sends message → Agent responds
   - Streaming works correctly
   - Multiple tool calls work
   - Error handling works

2. **RBAC Enforcement**:
   - AUDITOR cannot see other auditors' observations
   - Tools respect visibility rules
   - Access denial returns 403

3. **Performance**:
   - Large result sets are handled
   - Streaming doesn't block
   - Database queries are optimized

### Manual Testing Checklist

- [ ] Login as each role (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- [ ] Test questions that require different tools
- [ ] Test questions that require multiple tool calls
- [ ] Test error scenarios (invalid IDs, no access, etc.)
- [ ] Test streaming response (should see words appear in real-time)
- [ ] Test stop generation button
- [ ] Test clear chat functionality
- [ ] Verify no data leakage across roles
- [ ] Test on mobile/tablet viewports

---

## Security Considerations

### 1. **RBAC Enforcement**
- ✅ All data access goes through `buildObservationWhereClause()` and `buildAuditWhereClause()`
- ✅ MCP tools always receive user context (userId, role)
- ✅ No direct database access without RBAC checks
- ✅ Instance-level access checks for detail views

### 2. **Session Management**
- ✅ Every request validates NextAuth session
- ✅ Session timeouts respected (idle + absolute)
- ✅ User context passed securely to agent

### 3. **Input Validation**
- ✅ All tool inputs validated with Zod schemas
- ✅ User messages sanitized
- ✅ No SQL injection risk (Prisma parameterized queries)

### 4. **Rate Limiting** (Future Enhancement)
- Consider adding rate limiting to `/api/v1/agent/chat`
- Prevent abuse of expensive agent queries
- Implement per-user or per-role limits

### 5. **Audit Logging** (Future Enhancement)
- Log all agent interactions to `AuditEvent` table
- Track which tools were called
- Record user questions and agent responses

---

## Performance Optimization

### 1. **Database Query Optimization**
- Add indexes for frequently queried fields:
  ```sql
  CREATE INDEX idx_observations_audit_assignments ON "Observation" ("auditId");
  CREATE INDEX idx_audit_assignments_auditor ON "AuditAssignment" ("auditorId");
  CREATE INDEX idx_observation_assignments_auditee ON "ObservationAssignment" ("auditeeId");
  ```

### 2. **Caching Strategy** (Future Enhancement)
- Cache frequently requested data (e.g., user's audit list)
- Invalidate cache on data changes
- Use Redis for session-based caching

### 3. **Streaming Optimization**
- Current implementation streams assistant text as it arrives
- No buffering delays
- User sees responses immediately

---

## Monitoring and Observability

### Metrics to Track

1. **Usage Metrics**:
   - Number of agent queries per user/role
   - Most common questions
   - Tool usage frequency

2. **Performance Metrics**:
   - Average response time
   - Tool execution time
   - Database query performance

3. **Error Metrics**:
   - Failed queries
   - Access denials
   - Tool errors

### Logging Strategy

**Log Levels**:
- `INFO`: Successful agent queries, tool calls
- `WARN`: Access denials, invalid inputs
- `ERROR`: Tool failures, unexpected errors

**What to Log**:
```typescript
{
  timestamp: Date,
  userId: string,
  role: string,
  query: string,
  toolsCalled: string[],
  responseTime: number,
  error?: string
}
```

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)
- Deploy to staging environment
- Test with development team
- Gather feedback on UX and accuracy

### Phase 2: Limited Beta (Week 2)
- Enable for CFO and CXO_TEAM roles only
- Monitor usage and errors
- Collect user feedback

### Phase 3: Role-by-Role Rollout (Weeks 3-4)
- Week 3: Enable for AUDIT_HEAD
- Week 4: Enable for AUDITOR, AUDITEE
- GUEST: Decide based on use case

### Phase 4: Full Production (Week 5+)
- Enable for all users
- Monitor performance and costs
- Iterate based on feedback

---

## Cost Estimation

### Claude API Costs

**Model**: Claude Sonnet 4.5
- Input: ~$3 per million tokens
- Output: ~$15 per million tokens

**Estimated Usage per Query**:
- System prompt: ~500 tokens
- User question: ~50 tokens
- Tool responses (observation data): ~1,000 tokens
- Agent response: ~300 tokens
- **Total per query**: ~1,850 tokens

**Cost per Query**: ~$0.02

**Monthly Cost Estimates**:
- 10 users, 20 queries/day: ~$120/month
- 50 users, 20 queries/day: ~$600/month
- 100 users, 20 queries/day: ~$1,200/month

### Optimization Tips
- Implement caching for repeated queries
- Limit context size in tool responses
- Use pagination for large result sets

---

## Future Enhancements

### Short-term (1-3 months)
1. **Conversation History**: Store chat sessions in database
2. **Export Chat**: Allow users to export conversations
3. **Suggested Questions**: Show relevant follow-up questions
4. **Audit Logging**: Log all agent interactions

### Medium-term (3-6 months)
1. **Report Generation**: Generate PDF/Excel reports from chat
2. **Visualizations**: Show charts/graphs for statistics
3. **Notifications**: Alert users about important findings
4. **Multi-language**: Support multiple languages

### Long-term (6+ months)
1. **Predictive Analytics**: Predict risks based on historical data
2. **Recommendations**: Suggest actions for observations
3. **Automated Workflows**: Trigger actions based on chat
4. **Voice Interface**: Speech-to-text input

---

## Success Metrics

### User Adoption
- Target: 60% of active users try the agent within 1 month
- Target: 40% use it at least once per week

### User Satisfaction
- Target: Average rating of 4+ out of 5
- Target: <5% error rate on queries

### Efficiency Gains
- Target: 30% reduction in time to find observations
- Target: 50% reduction in report generation time

### Accuracy
- Target: >95% of queries answered correctly
- Target: <1% data leakage incidents (RBAC violations)

---

## Appendix

### A. Example Conversations

**Example 1: Basic Question**
```
User: "How many observations do I have?"

Agent: Let me check your observations.
[Calls get_observation_stats with groupBy='approvalStatus']

Based on the data:
- Draft: 12 observations
- Submitted: 5 observations
- Approved: 23 observations
- Rejected: 2 observations

Total: 42 observations
```

**Example 2: Filtered Query**
```
User: "Show me high-risk observations from the last month"

Agent: I'll fetch high-risk observations from the last 30 days.
[Calls get_my_observations with risk='A', startDate='2024-01-15']

Found 7 high-risk (Category A) observations:

1. Plant: Mumbai Factory
   Observation: Inadequate segregation of duties in procurement
   Status: Submitted for approval
   Created: Jan 18, 2024

2. Plant: Delhi Warehouse
   Observation: Missing audit trail in inventory system
   Status: Approved
   Created: Jan 22, 2024

[... continues ...]

Would you like more details on any specific observation?
```

**Example 3: Complex Analysis**
```
User: "Give me a summary of compliance-related observations by status"

Agent: I'll analyze your compliance observations.
[Calls get_my_observations with process='O2C']
[Calls get_observation_stats with groupBy='currentStatus']

Compliance (O2C process) observations summary:

Current Status Breakdown:
- Pending Management Response: 8
- Under Review: 3
- Finalized: 12
- Resolved: 5

Total: 28 compliance observations

Key Findings:
- 8 observations awaiting management response (oldest from Jan 5)
- 5 observations successfully resolved
- Most common issues: Documentation gaps, process controls

Would you like to see details on the pending responses?
```

---

### B. Error Handling Scenarios

**Scenario 1: Invalid Observation ID**
```
User: "Show me details for observation XYZ123"

Agent: [Calls get_observation_details with observationId='XYZ123']
I couldn't find an observation with ID "XYZ123". This could mean:
- The ID doesn't exist
- You don't have permission to view it
- The observation has been deleted

Would you like to search for observations instead?
```

**Scenario 2: No Access**
```
User (AUDITOR): "Show me all observations for Plant ABC"

Agent: [Calls get_my_observations with plantId='ABC']
I found that you don't have access to observations from Plant ABC. As an AUDITOR, you can only view observations from audits you're assigned to.

Your current audit assignments:
- Audit #1: Mumbai Factory (12 observations)
- Audit #2: Delhi Warehouse (8 observations)

Would you like to see observations from one of these audits?
```

---

### C. Development Checklist

#### Phase 1: RBAC Queries
- [ ] Create `src/lib/rbac-queries.ts`
- [ ] Implement `buildObservationWhereClause()`
- [ ] Implement `buildAuditWhereClause()`
- [ ] Implement `getObservationsForUser()`
- [ ] Implement `getAuditsForUser()`
- [ ] Implement `getObservationStats()`
- [ ] Implement `canAccessObservation()`
- [ ] Implement `canAccessAudit()`
- [ ] Create `src/lib/types/agent.ts`
- [ ] Refactor `src/app/api/v1/observations/route.ts`
- [ ] Refactor `src/app/api/v1/audits/route.ts`
- [ ] Test RBAC functions for each role

#### Phase 2: MCP Server
- [ ] Install `@anthropic-ai/claude-agent-sdk`
- [ ] Create `src/agent/mcp-server.ts`
- [ ] Implement `get_my_observations` tool
- [ ] Implement `get_my_audits` tool
- [ ] Implement `get_observation_stats` tool
- [ ] Implement `search_observations` tool
- [ ] Implement `get_observation_details` tool
- [ ] Implement `get_audit_details` tool
- [ ] Test each tool individually

#### Phase 3: Agent API
- [ ] Create `src/app/api/v1/agent/chat/route.ts`
- [ ] Implement POST handler with authentication
- [ ] Implement streaming response
- [ ] Test streaming with different queries
- [ ] Test error handling
- [ ] Test session validation

#### Phase 4: Chat UI
- [ ] Create `src/app/(dashboard)/agent-chat/page.tsx`
- [ ] Create `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`
- [ ] Implement message list
- [ ] Implement streaming display
- [ ] Implement input form
- [ ] Implement stop generation
- [ ] Implement clear chat
- [ ] Update `src/components/NavBar.tsx`
- [ ] Test UI on desktop
- [ ] Test UI on mobile
- [ ] Test UI on tablet

#### Phase 5: Testing & Deployment
- [ ] Write unit tests for RBAC queries
- [ ] Write integration tests for agent flow
- [ ] Test with each role (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- [ ] Test RBAC enforcement
- [ ] Test error scenarios
- [ ] Performance testing
- [ ] Deploy to staging
- [ ] Internal QA
- [ ] Production deployment

---

## Summary

This plan provides a complete, secure, and scalable implementation of an AI conversational agent for the audit platform. Key highlights:

1. **Security-First**: All data access respects RBAC at runtime
2. **Reusable Architecture**: Shared query functions used by both agent and REST API
3. **Modern Stack**: Claude Agent SDK + MCP tools + streaming responses
4. **Great UX**: Real-time streaming chat interface
5. **Comprehensive**: Handles all user roles and use cases
6. **Production-Ready**: Includes testing, monitoring, and rollout plan

**Estimated Development Time**: 2-3 weeks for full implementation

**Total New Code**: ~1,400 lines across 8 new files + modifications to 3 existing files
