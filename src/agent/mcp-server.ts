/**
 * MCP Server for AI Agent MVP - Phase 2
 *
 * Provides 6 tools for the agent to query audit platform data:
 * 1. get_my_observations - Fetch observations with basic filters
 * 2. get_observation_stats - Get aggregated counts
 * 3. search_observations - Full-text search across observations
 * 4. get_my_audits - Fetch audits user has access to
 * 5. get_observation_details - Complete observation info with relations
 * 6. get_audit_details - Complete audit info with observation stats
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import {
  getObservationsForUser,
  getObservationStats,
  getAuditsForUser,
  canAccessObservation,
  canAccessAudit
} from '@/lib/rbac-queries';
import { prisma } from '@/server/db';
import type { AgentUserContext } from '@/lib/types/agent';

/**
 * CallToolResult type definition
 * This matches the MCP SDK's expected return type for tool handlers
 */
type CallToolResult = {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
};

/**
 * Tool 1: get_my_observations
 *
 * Fetches observations the user has access to based on their role.
 * Supports basic filtering by audit, status, and risk category.
 */
const getMyObservationsTool = tool(
  'get_my_observations',
  'Fetches observations the user has access to. Supports filtering by audit ID, approval status, risk category, and current status. Returns a list of observations with basic details.',
  z.object({
    auditId: z.string().optional().describe('Filter by specific audit ID'),
    approvalStatus: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional()
      .describe('Filter by approval status'),
    riskCategory: z.enum(['A', 'B', 'C']).optional()
      .describe('Filter by risk category (A=High, B=Medium, C=Low)'),
    currentStatus: z.enum(['PENDING_MR', 'MR_UNDER_REVIEW', 'REFERRED_BACK', 'OBSERVATION_FINALISED', 'RESOLVED']).optional()
      .describe('Filter by current observation status'),
    limit: z.number().optional()
      .describe('Maximum number of observations to return (default: 20, max: 50)')
  }).strict(),
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
      ) as any; // Type assertion needed because include affects return type

      // Transform to summary format (truncate long text)
      const summary = observations.map((obs: any) => ({
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
        audit: obs.audit ? {
          id: obs.audit.id,
          title: obs.audit.title
        } : null,
        plant: obs.plant ? {
          id: obs.plant.id,
          name: obs.plant.name,
          code: obs.plant.code || null
        } : null
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
  z.object({
    groupBy: z.enum(['approvalStatus', 'currentStatus', 'riskCategory'])
      .describe('Field to group observations by'),
    auditId: z.string().optional()
      .describe('Optional: Filter stats to specific audit ID')
  }).strict(),
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
 * Create and export the MCP server instance (default - no context)
 */
export const auditDataMcpServer = createSdkMcpServer({
  name: 'audit-data-mvp',
  version: '1.0.0',
  tools: [
    getMyObservationsTool,
    getObservationStatsTool
  ]
});

/**
 * Create a contextual MCP server with user context injected
 *
 * This function creates MCP tools with the user context bound to them,
 * allowing the tools to access the current user's information for RBAC.
 *
 * @param userContext - The user context to inject into tools
 * @returns MCP server instance with context-bound tools
 */
export function createContextualMcpServer(userContext: AgentUserContext) {
  console.log('🚀 createContextualMcpServer called for user:', userContext.userId, userContext.role);
  // Simple test tool with no parameters
  const testTool = tool(
    'test_connection',
    'A simple test tool to verify MCP connection is working. Returns user info and a test message.',
    {},
    async () => {
      try {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'MCP connection is working!',
              user: {
                email: userContext.email,
                role: userContext.role,
                name: userContext.name
              },
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        } as CallToolResult;
      } catch (error: any) {
        console.error('Error in test_connection:', error);
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        } as CallToolResult;
      }
    }
  );

  // Create context-aware versions of the tools by wrapping them
  const getMyObservationsToolWithContext = tool(
    'get_my_observations',
    'Fetches observations the user has access to. Supports filtering by audit ID, approval status, risk category, and current status. Returns a list of observations with basic details.',
    z.object({
      auditId: z.string().optional().describe('Filter by specific audit ID'),
      approvalStatus: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional()
        .describe('Filter by approval status'),
      riskCategory: z.enum(['A', 'B', 'C']).optional()
        .describe('Filter by risk category (A=High, B=Medium, C=Low)'),
      currentStatus: z.enum(['PENDING_MR', 'MR_UNDER_REVIEW', 'REFERRED_BACK', 'OBSERVATION_FINALISED', 'RESOLVED']).optional()
        .describe('Filter by current observation status'),
      limit: z.number().optional()
        .describe('Maximum number of observations to return (default: 20, max: 50)')
    }).strict(),
    async (args) => {
      try {
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
        ) as any;

        const summary = observations.map((obs: any) => ({
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
          audit: obs.audit ? {
            id: obs.audit.id,
            title: obs.audit.title
          } : null,
          plant: obs.plant ? {
            id: obs.plant.id,
            name: obs.plant.name,
            code: obs.plant.code || null
          } : null
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

  console.log('🔧 Registering get_observation_stats tool...');
  const getObservationStatsToolWithContext = tool(
    'get_observation_stats',
    'Returns aggregated observation counts grouped by a specified field (approvalStatus, currentStatus, or riskCategory). Use this to get summary statistics. IMPORTANT: Always provide groupBy parameter.',
    {},  // Empty schema - SDK has enum compatibility issues
    async (args) => {
      console.log('=== get_observation_stats tool called ===');
      console.log('Args:', args);

      // Default groupBy to riskCategory if not provided or invalid
      const validGroupBy = ['approvalStatus', 'currentStatus', 'riskCategory'];
      let groupBy = args.groupBy as string;
      if (!groupBy || !validGroupBy.includes(groupBy)) {
        groupBy = 'riskCategory';  // Default
      }
      try {
        const stats = await getObservationStats(
          userContext.userId,
          userContext.role,
          groupBy as any,
          {
            auditId: args.auditId as string
          }
        );

        const formattedStats = stats.map(stat => ({
          [groupBy]: stat[groupBy] || 'null',
          count: stat._count._all
        }));

        const totalCount = formattedStats.reduce((sum, stat) => sum + stat.count, 0);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              groupBy: groupBy,
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
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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

  // TOOL 3: search_observations
  console.log('🔧 Registering search_observations tool...');
  // @ts-ignore - SDK type compatibility issue with Zod schemas
  const searchObservationsTool = tool(
    'search_observations',
    'Search across observation text, risks, and feedback using keywords. Returns matching observations with truncated text.',
    {},  // Empty schema - SDK compatibility issue with Zod validation
    async (args) => {
      console.log('=== search_observations tool called ===');
      console.log('Args:', args);

      try {
        // Manual validation for query parameter
        const query = args.query as string;
        if (!query || !query.trim()) {
          console.log('Search query is empty or invalid');
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

        // Manual validation for limit parameter with default
        const limit = Math.min((args.limit as number) || 20, 20);
        console.log('Searching with query:', query, 'limit:', limit);
        const observations = await getObservationsForUser(
          userContext.userId,
          userContext.role,
          { searchQuery: query, limit },
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
              query: query,
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

  // TOOL 4: get_my_audits
  console.log('🔧 Registering get_my_audits tool...');
  // @ts-ignore - SDK type compatibility issue with Zod schemas
  const getMyAuditsTool = tool(
    'get_my_audits',
    'Fetch audits you have access to based on your role. Returns audit summaries with plant info, assignments, and observation counts. Optional filters: plantId (string), status (PLANNED|IN_PROGRESS|SUBMITTED|SIGNED_OFF), limit (number, default 50, max 100).',
    {},  // Empty schema - SDK compatibility issue with Zod validation
    async (args) => {
      console.log('=== get_my_audits tool called ===');
      console.log('Args:', args);
      console.log('User context:', userContext);
      try {
        console.log('Starting to fetch audits...');

        // Manual validation for optional parameters
        const plantId = args.plantId as string | undefined;
        const statusArg = args.status as string | undefined;
        const limitArg = args.limit as number | undefined;

        // Validate and set limit (default 50, max 100)
        const limit = limitArg ? Math.min(Math.max(1, limitArg), 100) : 50;

        // Validate status if provided
        const validStatuses = ['PLANNED', 'IN_PROGRESS', 'SUBMITTED', 'SIGNED_OFF'];
        let status: string | undefined = undefined;
        if (statusArg) {
          if (validStatuses.includes(statusArg)) {
            status = statusArg;
          } else {
            console.log('Invalid status provided:', statusArg, '- ignoring');
          }
        }

        // Build filters object
        const filters: any = { limit };
        if (plantId) filters.plantId = plantId;
        if (status) filters.status = status;

        console.log('Calling getAuditsForUser with filters:', filters);
        const audits = await getAuditsForUser(
          userContext.userId,
          userContext.role,
          filters,  // Use the complete filters object with plantId, status, and limit
          {
            include: {
              plant: true,
              auditHead: { select: { id: true, name: true, email: true } },
              assignments: {
                include: {
                  auditor: { select: { id: true, name: true, email: true } }
                }
              },
              observations: true  // FIX: Include observations so we can count them
            }
          }
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
              hasMore: audits.length === limit
            }, null, 2)
          }]
        } as CallToolResult;
      } catch (error: any) {
        console.error('Error in get_my_audits:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));
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

  // TOOL 5: get_observation_details
  console.log('🔧 Registering get_observation_details tool...');
  // @ts-ignore - SDK type compatibility issue with Zod schemas
  const getObservationDetailsTool = tool(
    'get_observation_details',
    'Fetch complete details of a specific observation including attachments, approvals, and action plans. Requires permission to access the observation.',
    {},  // Empty schema - SDK compatibility issue with Zod validation
    async (args) => {
      console.log('=== get_observation_details tool called ===');
      console.log('Args:', args);

      try {
        // Manual validation for observationId parameter
        const observationId = args.observationId as string;
        if (!observationId || !observationId.trim()) {
          console.log('Observation ID is missing or invalid');
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'observationId is required and cannot be empty'
              }, null, 2)
            }],
            isError: true
          } as CallToolResult;
        }
        const hasAccess = await canAccessObservation(
          userContext.userId,
          userContext.role,
          observationId
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
          where: { id: observationId },
          include: {
            plant: { select: { id: true, name: true, code: true } },
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

  // TOOL 6: get_audit_details
  console.log('🔧 Registering get_audit_details tool...');
  // @ts-ignore - SDK type compatibility issue with Zod schemas
  const getAuditDetailsTool = tool(
    'get_audit_details',
    'Fetch complete details of a specific audit including plant, assignments, checklists, and observation statistics. Requires permission to access the audit.',
    {},  // Empty schema - SDK compatibility issue with Zod validation
    async (args) => {
      console.log('=== get_audit_details tool called ===');
      console.log('Args:', args);

      try {
        // Manual validation for auditId parameter
        const auditId = args.auditId as string;
        if (!auditId || !auditId.trim()) {
          console.log('Audit ID is missing or invalid');
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: 'auditId is required and cannot be empty'
              }, null, 2)
            }],
            isError: true
          } as CallToolResult;
        }
        const hasAccess = await canAccessAudit(
          userContext.userId,
          userContext.role,
          auditId
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
          where: { id: auditId },
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

  return createSdkMcpServer({
    name: 'audit-data-mvp',
    version: '2.0.0', // Phase 2: Expanded MCP Tools
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
}
