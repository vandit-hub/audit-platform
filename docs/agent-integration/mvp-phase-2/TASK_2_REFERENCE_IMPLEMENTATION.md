# TASK 2 - Reference Implementation

This file contains the complete implementation code for the 4 new MCP tools. Use this as a reference when adding the tools to `src/agent/mcp-server.ts`.

## Prerequisites

Add these imports at the top of `src/agent/mcp-server.ts`:

```typescript
import {
  getObservationsForUser,
  getObservationStats,
  getAuditsForUser,
  canAccessObservation,
  canAccessAudit
} from '@/lib/rbac-queries';
import { prisma } from '@/server/db';
```

## Tool Implementations

Add these tools inside the `createContextualMcpServer()` function, after the existing tools.

### Tool 3: search_observations

```typescript
// TOOL 3: search_observations
const searchObservationsTool = tool(
  'search_observations',
  'Search across observation text, risks, and feedback using keywords. Returns matching observations with truncated text.',
  {
    query: z.string().min(1).describe('Search query to find in observations'),
    limit: z.number().optional().describe('Maximum results (default: 20, max: 20)')
  },
  async (args) => {
    try {
      if (!args.query || !args.query.trim()) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: 'Search query cannot be empty or whitespace-only',
              observations: [],
              count: 0
            }, null, 2)
          }],
          isError: true
        } as CallToolResult;
      }

      const limit = Math.min((args.limit as number) || 20, 20);
      const observations = await getObservationsForUser(
        userContext.userId,
        userContext.role,
        { searchQuery: args.query, limit },
        {
          include: {
            audit: { select: { id: true, title: true } },
            plant: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      ) as any;

      const summary = observations.map((obs: any) => ({
        id: obs.id,
        observationText: obs.observationText.length > 200
          ? obs.observationText.slice(0, 200) + '...'
          : obs.observationText,
        riskCategory: obs.riskCategory,
        concernedProcess: obs.concernedProcess,
        currentStatus: obs.currentStatus,
        approvalStatus: obs.approvalStatus,
        isPublished: obs.isPublished,
        createdAt: obs.createdAt.toISOString(),
        audit: obs.audit ? {
          id: obs.audit.id,
          title: obs.audit.title
        } : null,
        plant: obs.plant ? {
          id: obs.plant.id,
          name: obs.plant.name
        } : null
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query: args.query,
            observations: summary,
            count: observations.length,
            totalShown: summary.length,
            hasMore: observations.length === limit
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in search_observations:', error);
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
```

### Tool 4: get_my_audits

```typescript
// TOOL 4: get_my_audits
const getMyAuditsTool = tool(
  'get_my_audits',
  'Fetch audits you have access to based on your role. Returns audit summaries with plant info, assignments, and observation counts.',
  {
    plantId: z.string().optional().describe('Filter by plant ID'),
    status: z.enum(['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF']).optional()
      .describe('Filter by audit status'),
    limit: z.number().optional().describe('Maximum results (default: 50, max: 100)')
  },
  async (args) => {
    try {
      const limit = Math.min((args.limit as number) || 50, 100);
      const audits = await getAuditsForUser(
        userContext.userId,
        userContext.role,
        { plantId: args.plantId as string, status: args.status as any, limit }
      ) as any;

      const summary = audits.map((audit: any) => {
        const observations = audit.observations || [];
        const observationCounts = {
          total: observations.length,
          byApprovalStatus: {
            DRAFT: observations.filter((o: any) => o.approvalStatus === 'DRAFT').length,
            SUBMITTED: observations.filter((o: any) => o.approvalStatus === 'SUBMITTED').length,
            APPROVED: observations.filter((o: any) => o.approvalStatus === 'APPROVED').length,
            REJECTED: observations.filter((o: any) => o.approvalStatus === 'REJECTED').length
          },
          byRisk: {
            A: observations.filter((o: any) => o.riskCategory === 'A').length,
            B: observations.filter((o: any) => o.riskCategory === 'B').length,
            C: observations.filter((o: any) => o.riskCategory === 'C').length
          }
        };

        return {
          id: audit.id,
          title: audit.title,
          status: audit.status,
          plant: audit.plant || null,
          auditHead: audit.auditHead || null,
          isLeadAuditor: audit.auditHeadId === userContext.userId,
          auditors: (audit.assignments || []).map((a: any) => ({
            id: a.auditor?.id,
            name: a.auditor?.name
          })),
          observationCounts,
          createdAt: audit.createdAt.toISOString()
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            audits: summary,
            count: audits.length,
            totalShown: summary.length,
            hasMore: audits.length === limit,
            filters: {
              plantId: args.plantId,
              status: args.status
            }
          }, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in get_my_audits:', error);
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
```

### Tool 5: get_observation_details

```typescript
// TOOL 5: get_observation_details
const getObservationDetailsTool = tool(
  'get_observation_details',
  'Fetch complete details of a specific observation including attachments, approvals, and action plans. Requires permission to access the observation.',
  {
    observationId: z.string().describe('The ID of the observation to fetch')
  },
  async (args) => {
    try {
      const hasAccess = await canAccessObservation(
        userContext.userId,
        userContext.role,
        args.observationId as string
      );

      if (!hasAccess) {
        return {
          content: [{
            type: 'text',
            text: 'You do not have permission to access this observation'
          }],
          isError: true
        } as CallToolResult;
      }

      const observation = await prisma.observation.findUnique({
        where: { id: args.observationId as string },
        include: {
          plant: { select: { id: true, name: true, location: true } },
          audit: { select: { id: true, title: true, status: true } },
          attachments: true,
          approvals: {
            include: {
              actor: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
          },
          assignments: {
            include: {
              auditee: { select: { id: true, name: true, email: true } }
            }
          },
          actionPlans: true,
          changeRequests: {
            include: {
              requester: { select: { id: true, name: true } },
              decidedBy: { select: { id: true, name: true } }
            }
          }
        }
      });

      if (!observation) {
        return {
          content: [{
            type: 'text',
            text: 'Observation not found'
          }],
          isError: true
        } as CallToolResult;
      }

      const details = {
        id: observation.id,
        observationText: observation.observationText,
        risksInvolved: observation.risksInvolved,
        auditeeFeedback: observation.auditeeFeedback,
        auditorResponseToAuditee: observation.auditorResponseToAuditee,
        riskCategory: observation.riskCategory,
        concernedProcess: observation.concernedProcess,
        currentStatus: observation.currentStatus,
        approvalStatus: observation.approvalStatus,
        isPublished: observation.isPublished,
        createdAt: observation.createdAt.toISOString(),
        updatedAt: observation.updatedAt.toISOString(),
        plant: observation.plant,
        audit: observation.audit,
        attachments: observation.attachments.map((att: any) => ({
          id: att.id,
          fileName: att.fileName,
          fileSize: att.fileSize,
          kind: att.kind,
          uploadedAt: att.uploadedAt.toISOString()
        })),
        approvals: observation.approvals.map((app: any) => ({
          id: app.id,
          decision: app.decision,
          comments: app.comments,
          actor: app.actor,
          createdAt: app.createdAt.toISOString()
        })),
        assignments: observation.assignments.map((asg: any) => ({
          id: asg.id,
          auditee: asg.auditee
        })),
        actionPlans: observation.actionPlans.map((ap: any) => ({
          id: ap.id,
          actionDescription: ap.actionDescription,
          targetDate: ap.targetDate ? ap.targetDate.toISOString() : null,
          status: ap.status
        })),
        changeRequests: observation.changeRequests.map((cr: any) => ({
          id: cr.id,
          requestType: cr.requestType,
          requestReason: cr.requestReason,
          status: cr.status,
          requester: cr.requester,
          decidedBy: cr.decidedBy,
          createdAt: cr.createdAt.toISOString()
        }))
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in get_observation_details:', error);
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
```

### Tool 6: get_audit_details

```typescript
// TOOL 6: get_audit_details
const getAuditDetailsTool = tool(
  'get_audit_details',
  'Fetch complete details of a specific audit including plant, assignments, checklists, and observation statistics. Requires permission to access the audit.',
  {
    auditId: z.string().describe('The ID of the audit to fetch')
  },
  async (args) => {
    try {
      const hasAccess = await canAccessAudit(
        userContext.userId,
        userContext.role,
        args.auditId as string
      );

      if (!hasAccess) {
        return {
          content: [{
            type: 'text',
            text: 'You do not have permission to access this audit'
          }],
          isError: true
        } as CallToolResult;
      }

      const audit = await prisma.audit.findUnique({
        where: { id: args.auditId as string },
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
              checklist: { select: { id: true, name: true } }
            }
          },
          observations: {
            select: {
              id: true,
              approvalStatus: true,
              currentStatus: true,
              riskCategory: true
            }
          }
        }
      });

      if (!audit) {
        return {
          content: [{
            type: 'text',
            text: 'Audit not found'
          }],
          isError: true
        } as CallToolResult;
      }

      const observationCounts = {
        total: audit.observations.length,
        byApprovalStatus: {
          DRAFT: audit.observations.filter((o: any) => o.approvalStatus === 'DRAFT').length,
          SUBMITTED: audit.observations.filter((o: any) => o.approvalStatus === 'SUBMITTED').length,
          APPROVED: audit.observations.filter((o: any) => o.approvalStatus === 'APPROVED').length,
          REJECTED: audit.observations.filter((o: any) => o.approvalStatus === 'REJECTED').length
        },
        byCurrentStatus: {
          PENDING_MR: audit.observations.filter((o: any) => o.currentStatus === 'PENDING_MR').length,
          MR_UNDER_REVIEW: audit.observations.filter((o: any) => o.currentStatus === 'MR_UNDER_REVIEW').length,
          REFERRED_BACK: audit.observations.filter((o: any) => o.currentStatus === 'REFERRED_BACK').length,
          OBSERVATION_FINALISED: audit.observations.filter((o: any) => o.currentStatus === 'OBSERVATION_FINALISED').length,
          RESOLVED: audit.observations.filter((o: any) => o.currentStatus === 'RESOLVED').length
        },
        byRisk: {
          A: audit.observations.filter((o: any) => o.riskCategory === 'A').length,
          B: audit.observations.filter((o: any) => o.riskCategory === 'B').length,
          C: audit.observations.filter((o: any) => o.riskCategory === 'C').length
        }
      };

      const details = {
        id: audit.id,
        title: audit.title,
        status: audit.status,
        visitStartDate: audit.visitStartDate ? audit.visitStartDate.toISOString() : null,
        visitEndDate: audit.visitEndDate ? audit.visitEndDate.toISOString() : null,
        plant: audit.plant,
        auditHead: audit.auditHead,
        assignments: audit.assignments.map((asg: any) => ({
          id: asg.id,
          auditor: asg.auditor
        })),
        checklists: audit.auditChecklists.map((ac: any) => ({
          id: ac.id,
          checklist: ac.checklist
        })),
        observationCounts,
        createdAt: audit.createdAt.toISOString(),
        updatedAt: audit.updatedAt.toISOString()
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(details, null, 2)
        }]
      } as CallToolResult;
    } catch (error: any) {
      console.error('Error in get_audit_details:', error);
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
```

## Update Server Configuration

After adding all tools, update the `createSdkMcpServer` call at the end of `createContextualMcpServer()`:

```typescript
return createSdkMcpServer({
  name: 'audit-data-mvp',
  version: '2.0.0', // Increment version for Phase 2
  tools: [
    testTool,
    getMyObservationsToolWithContext,
    getObservationStatsToolWithContext,
    // NEW Phase 2 tools
    searchObservationsTool,
    getMyAuditsTool,
    getObservationDetailsTool,
    getAuditDetailsTool
  ]
});
```

## TypeScript Issues

If you encounter TypeScript errors with the `tool()` function schema parameter, you have several options:

### Option 1: Use @ts-ignore (Quick Fix)
```typescript
// @ts-ignore - SDK type compatibility issue with Zod schemas
const searchObservationsTool = tool(
  // ... rest of implementation
);
```

### Option 2: Cast Parameters
```typescript
// Cast args properties to correct types in the handler
const limit = Math.min((args.limit as number) || 20, 20);
const plantId = args.plantId as string | undefined;
```

### Option 3: Plain Objects Instead of Zod
```typescript
// Use plain object instead of z.object()
const searchObservationsTool = tool(
  'search_observations',
  'Description...',
  {
    query: { type: 'string', description: 'Search query' },
    limit: { type: 'number', optional: true, description: 'Maximum results' }
  },
  async (args) => {
    // implementation
  }
);
```

## Testing

Once implemented, test each tool with different user roles:

1. **Search Test**: `"Search for observations about inventory"`
2. **Audits Test**: `"What audits am I assigned to?"`
3. **Observation Details Test**: `"Tell me about observation [ID]"`
4. **Audit Details Test**: `"Give me details on audit [ID]"`

Test with these user accounts:
- CFO: cfo@example.com / cfo123
- Auditor: auditor@example.com / auditor123
- Auditee: auditee@example.com / auditee123
- Guest: guest@example.com / guest123
