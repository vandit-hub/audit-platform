/**
 * MCP Server for AI Agent MVP
 *
 * Provides 2 tools for the agent to query observation data:
 * 1. get_my_observations - Fetch observations with basic filters
 * 2. get_observation_stats - Get aggregated counts
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { getObservationsForUser, getObservationStats } from '@/lib/rbac-queries';
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

  const getObservationStatsToolWithContext = tool(
    'get_observation_stats',
    'Returns aggregated observation counts grouped by a specified field (approvalStatus, currentStatus, or riskCategory). Use this to get summary statistics.',
    z.object({
      groupBy: z.enum(['approvalStatus', 'currentStatus', 'riskCategory'])
        .describe('Field to group observations by'),
      auditId: z.string().optional()
        .describe('Optional: Filter stats to specific audit ID')
    }).strict(),
    async (args) => {
      try {
        const stats = await getObservationStats(
          userContext.userId,
          userContext.role,
          args.groupBy,
          {
            auditId: args.auditId
          }
        );

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

  return createSdkMcpServer({
    name: 'audit-data-mvp',
    version: '1.0.0',
    tools: [
      testTool,
      getMyObservationsToolWithContext,
      getObservationStatsToolWithContext
    ]
  });
}
