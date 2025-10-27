/**
 * AI Agent Chat API Endpoint
 *
 * This endpoint bridges the frontend UI with the Claude Agent SDK and MCP server.
 * Implementation follows a simple request/response pattern (no streaming) for MVP.
 *
 * Flow:
 * 1. Authenticate user via NextAuth session
 * 2. Validate request (message must be non-empty string)
 * 3. Create user context for RBAC enforcement
 * 4. Configure Claude Agent SDK with MCP server
 * 5. Collect complete response (no streaming)
 * 6. Return JSON with response text and metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import { auth } from '@/lib/auth';
import { auditDataMcpServer } from '@/agent/mcp-server';
import type { AgentUserContext } from '@/lib/types/agent';

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

/**
 * POST /api/v1/agent/chat
 *
 * Main agent chat endpoint
 *
 * Request body:
 * {
 *   "message": "How many observations do I have?"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "response": "Based on the data, you have X observations...",
 *   "metadata": {
 *     "usage": { input_tokens: 123, output_tokens: 456 },
 *     "cost": 0.0045
 *   }
 * }
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
      email: session.user.email || '',
      name: session.user.name || session.user.email || 'Unknown User'
    };

    console.log(`[Agent] User ${userContext.email} (${userContext.role}) asked: "${message}"`);

    // 4. Create per-request MCP server instance with user context
    // The SDK MCP server needs to be created per-request to inject user context
    const { createContextualMcpServer } = await import('@/agent/mcp-server');
    const contextualServer = createContextualMcpServer(userContext);

    // 5. Call Claude Agent SDK
    const agentQuery = query({
      prompt: message,
      options: {
        mcpServers: {
          'audit-data': {
            type: 'sdk',
            name: 'audit-data-mvp',
            instance: contextualServer.instance
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
You have 3 tools available:
1. test_connection - A simple test tool to verify the connection is working (no parameters needed)
2. get_my_observations - Fetches observations with optional filters (audit, status, risk)
3. get_observation_stats - Returns aggregated counts grouped by a field

IMPORTANT: The data returned by these tools is already filtered based on the user's role. You will only see observations the user is authorized to access.

Guidelines:
1. Be conversational and helpful
2. Always use the tools to get real data - never make up numbers
3. When showing observation lists, display key details (risk, status, plant)
4. Format statistics clearly (use bullet points or simple tables)
5. If the user has no observations matching their query, say so politely
6. For simple "how many total" questions, use get_my_observations with no filters and count the results
7. For breakdown questions (by status, risk, etc), use get_observation_stats with appropriate groupBy
8. Only fetch full observation details if the user wants to see specific observations
9. Keep responses concise but informative`
        },
        allowedTools: [
          'test_connection',
          'get_my_observations',
          'get_observation_stats'
        ],
        permissionMode: 'bypassPermissions',
        model: 'claude-haiku-4-5-20251001',
        includePartialMessages: false
      }
    });

    // 6. Collect complete response (no streaming in MVP)
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

    // 7. Return complete response
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
