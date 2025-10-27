/**
 * AI Agent Chat API Endpoint
 *
 * This endpoint bridges the frontend UI with the Claude Agent SDK and MCP server.
 * Implementation uses Server-Sent Events (SSE) for real-time streaming responses.
 *
 * Flow:
 * 1. Authenticate user via NextAuth session
 * 2. Validate request (message must be non-empty string)
 * 3. Create user context for RBAC enforcement
 * 4. Configure Claude Agent SDK with MCP server
 * 5. Stream response chunks via SSE as they arrive
 * 6. Return metadata and completion signal
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
    description: 'AI Agent chat endpoint with Server-Sent Events streaming'
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

    // Validate user email exists
    if (!session.user.email) {
      return NextResponse.json(
        { error: 'Invalid session: user email is required' },
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
      email: session.user.email, // Guaranteed to exist after validation above
      name: session.user.name || session.user.email
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

Available Tools (6 tools):
1. get_my_observations - List observations you have access to with filters (audit, status, risk, etc.)
2. get_observation_stats - Get aggregated counts by status, risk, or other fields
3. search_observations - Search across observation text using keywords (full-text search)
4. get_my_audits - List audits you're involved in or responsible for (with filters)
5. get_observation_details - Get complete details of a specific observation (ID required)
6. get_audit_details - Get complete details of a specific audit (ID required)

USE CASES:
- "Show me my observations" → use get_my_observations
- "How many observations are in draft?" → use get_observation_stats
- "Search for observations about inventory" → use search_observations
- "What audits am I assigned to?" → use get_my_audits
- "Tell me about observation ABC123" → use get_observation_details
- "Give me details on audit XYZ789" → use get_audit_details

IMPORTANT:
- You only see data you have permission to access based on your role
- If a tool returns an error about permissions, explain this to the user
- Observation IDs and Audit IDs are required for detail views
- All data is already filtered by RBAC - never make up data

Guidelines:
1. Be conversational and helpful
2. Always use the tools to get real data - never make up numbers
3. When showing observation lists, display key details (risk, status, plant)
4. Format statistics clearly (use bullet points or simple tables)
5. If the user has no observations matching their query, say so politely
6. For simple "how many total" questions, use get_my_observations with no filters and count the results
7. For breakdown questions (by status, risk, etc), use get_observation_stats with appropriate groupBy
8. For keyword searches, use search_observations (case-insensitive)
9. Keep responses concise but informative`
        },
        allowedTools: [
          'test_connection',
          'get_my_observations',
          'get_observation_stats',
          'search_observations',
          'get_my_audits',
          'get_observation_details',
          'get_audit_details'
        ],
        permissionMode: 'bypassPermissions',
        model: 'claude-haiku-4-5-20251001',
        includePartialMessages: false
      }
    });

    // 6. Stream response via Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          for await (const msg of agentQuery) {
            if (msg.type === 'assistant') {
              // Stream text blocks as they arrive
              for (const block of msg.message.content) {
                if (block.type === 'text') {
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`
                  ));
                }
              }
            }

            if (msg.type === 'result') {
              // Send final metadata
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'metadata',
                  usage: msg.usage,
                  cost: msg.total_cost_usd || 0
                })}\n\n`
              ));

              console.log(`[Agent] Response generated. Cost: $${(msg.total_cost_usd || 0).toFixed(4)}`);
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          // Stream error to client
          console.error('[Agent] Streaming error:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
          ));
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
