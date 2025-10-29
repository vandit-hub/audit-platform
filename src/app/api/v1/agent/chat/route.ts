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
import { agentConfig } from '@/lib/config/agent';
import { writeAuditEvent } from '@/server/auditTrail';
import { categorizeError } from '@/lib/errors/agent-errors';
import { prisma } from '@/server/db';

/**
 * Rate Limiting
 *
 * In-memory rate limiting to prevent abuse of expensive agent queries.
 * Uses a Map to track requests per user with automatic cleanup.
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check if user has exceeded rate limit
 *
 * @param userId - User ID to check
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds
 * @returns true if request allowed, false if rate limit exceeded
 */
function checkRateLimit(
  userId: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  // No entry or window expired - create new window
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  // Within window - check count
  if (entry.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  // Increment count and allow
  entry.count++;
  return true;
}

/**
 * Cleanup expired rate limit entries
 * Runs every 60 seconds to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  const windowMs = agentConfig.rateLimit.windowMs;

  for (const [userId, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > windowMs) {
      rateLimitMap.delete(userId);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Audit Logging
 *
 * Functions for logging agent queries to the audit trail for compliance and analytics.
 */

/**
 * Extract tool names from agent messages
 *
 * @param agentMessages - Messages from the agent SDK query
 * @returns Array of unique tool names used
 */
function extractToolsCalled(agentMessages: any[]): string[] {
  const tools = new Set<string>();

  for (const msg of agentMessages) {
    if (msg.type === 'assistant' && msg.message?.content) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_use' && block.name) {
          tools.add(block.name);
        }
      }
    }
  }

  return Array.from(tools);
}

/**
 * Log agent query to audit trail
 *
 * Logs all queries for compliance and analytics.
 * Never throws errors - wrapped in try-catch.
 *
 * @param session - User session
 * @param message - User query text
 * @param responseText - Agent response text
 * @param usage - Token usage statistics
 * @param cost - Query cost in USD
 * @param toolsCalled - Array of tool names used
 */
async function logAuditEvent(
  session: any,
  message: string,
  responseText: string,
  usage: any,
  cost: number,
  toolsCalled: string[]
): Promise<void> {
  // Check feature flag
  if (!agentConfig.features.auditLogging) {
    return;
  }

  try {
    await writeAuditEvent({
      entityType: 'AGENT_QUERY',
      entityId: session.user.id,
      action: 'QUERY',
      actorId: session.user.id,
      diff: {
        query: message.slice(0, 500), // Truncate long queries
        responseLength: responseText.length,
        toolsCalled,
        usage: {
          inputTokens: usage?.input_tokens || 0,
          outputTokens: usage?.output_tokens || 0,
          totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0)
        },
        cost,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Never throw - just log the error
    console.error('[Agent] Failed to write audit event:', error);
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
  const startTime = Date.now();
  let session: any = null;

  try {
    // 1. Authenticate user
    session = await auth();
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

    // Check rate limit
    const rateLimitAllowed = checkRateLimit(
      session.user.id,
      agentConfig.rateLimit.requests,
      agentConfig.rateLimit.windowMs
    );

    if (!rateLimitAllowed) {
      const waitTimeSeconds = Math.ceil(agentConfig.rateLimit.windowMs / 1000);

      console.log(JSON.stringify({
        level: 'WARN',
        type: 'rate_limit_exceeded',
        userId: session.user.id,
        role: session.user.role,
        maxRequests: agentConfig.rateLimit.requests,
        windowMs: agentConfig.rateLimit.windowMs,
        timestamp: new Date().toISOString()
      }));

      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can make up to ${agentConfig.rateLimit.requests} requests per minute. Please wait ${waitTimeSeconds} seconds and try again.`
        },
        { status: 429 }
      );
    }

    // 2. Parse request
    const body = await req.json();
    const { message, sessionId, conversationId } = body;

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

    // Log query start with structured JSON
    console.log(JSON.stringify({
      level: 'INFO',
      type: 'agent_query_started',
      userId: userContext.userId,
      role: userContext.role,
      email: userContext.email,
      query: message.slice(0, 100), // Truncate for logs
      conversationId: conversationId || null,
      timestamp: new Date().toISOString()
    }));

    // 3a. Handle conversation management (if not a guest)
    let currentConversationId = conversationId;

    if (session.user.role !== 'GUEST') {
      if (!currentConversationId) {
        // Create new conversation with title from user message
        const newConversation = await prisma.agentConversation.create({
          data: {
            userId: session.user.id,
            ...(sessionId && { sessionId }), // Only include if sessionId exists
            title: message.slice(0, 60)
          }
        });
        currentConversationId = newConversation.id;

        // Check conversation count and delete oldest if >= 50
        const count = await prisma.agentConversation.count({
          where: { userId: session.user.id }
        });

        if (count > 50) {
          const oldest = await prisma.agentConversation.findFirst({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'asc' }
          });

          if (oldest && oldest.id !== currentConversationId) {
            await prisma.agentConversation.delete({
              where: { id: oldest.id }
            });
          }
        }
      } else {
        // Verify conversation belongs to user
        const conversation = await prisma.agentConversation.findUnique({
          where: { id: currentConversationId }
        });

        if (!conversation || conversation.userId !== session.user.id) {
          return NextResponse.json(
            { error: 'Invalid conversation ID' },
            { status: 403 }
          );
        }
      }

      // Save user message to database
      await prisma.agentMessage.create({
        data: {
          conversationId: currentConversationId,
          role: 'user',
          content: message
        }
      });
    }

    // 4. Create per-request MCP server instance with user context
    // The SDK MCP server needs to be created per-request to inject user context
    const { createContextualMcpServer } = await import('@/agent/mcp-server');
    const contextualServer = createContextualMcpServer(userContext);

    // 5. Call Claude Agent SDK with SECURITY LOCKDOWN
    // Security Fix: Restrict to audit data only - no file system access
    const allowedMcpTools = [
      'mcp__audit-data__test_connection',
      'mcp__audit-data__get_my_observations',
      'mcp__audit-data__get_observation_stats',
      'mcp__audit-data__search_observations',
      'mcp__audit-data__get_my_audits',
      'mcp__audit-data__get_observation_details',
      'mcp__audit-data__get_audit_details'
    ];

    const agentQuery = query({
      prompt: message,
      options: {
        // Resume previous session if sessionId provided, otherwise start new session
        ...(sessionId ? { resume: sessionId } : {}),
        mcpServers: {
          'audit-data': {
            type: 'sdk',
            name: 'audit-data-mvp',
            instance: contextualServer.instance
          }
        },
        // SECURITY: Custom system prompt (NO claude_code preset)
        systemPrompt: `You are an AI assistant for an internal audit platform. You help users understand and analyze their observation data.

IMPORTANT SECURITY BOUNDARIES:
- You can ONLY access audit data through the provided tools
- You CANNOT read files, access code, or run system commands
- You CANNOT access environment variables, configuration, or credentials
- If asked to do something outside audit data, politely redirect the user

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

Available Tools (6 audit data tools):
1. get_my_observations - List observations you have access to with filters (audit, status, risk, etc.)
2. get_observation_stats - Get aggregated counts by status, risk, or other fields **[USE THIS FOR COUNTING/HOW MANY QUESTIONS]**
3. search_observations - Search across observation text using keywords (full-text search)
4. get_my_audits - List audits you're involved in or responsible for (with filters)
5. get_observation_details - Get complete details of a specific observation (ID required)
6. get_audit_details - Get complete details of a specific audit (ID required)

CRITICAL TOOL SELECTION RULES:
- For ANY "how many" or counting questions → ALWAYS use get_observation_stats (it returns accurate database counts)
- NEVER manually count observations from get_my_observations - this is error-prone and inconsistent
- Use get_my_observations only when user wants to SEE/LIST individual observations

HELP TOPICS YOU CAN ASSIST WITH:
- How to submit an observation
- What the different observation statuses mean (DRAFT, SUBMITTED, APPROVED, REJECTED, PUBLISHED)
- How the approval workflow works
- What information to include in observations
- How to search and filter your data
- Understanding risk categories (HIGH, MEDIUM, LOW)
- Audit lifecycle and processes
- How to use the platform effectively

USE CASES:
- "Show me my observations" → use get_my_observations
- "How many observations are in draft?" → use get_observation_stats
- "Search for observations about inventory" → use search_observations
- "What audits am I assigned to?" → use get_my_audits
- "Tell me about observation ABC123" → use get_observation_details
- "Give me details on audit XYZ789" → use get_audit_details
- "How do I submit an observation?" → explain the submission process

INVALID REQUESTS - Politely Redirect:
If user asks for:
- File contents, code, or system information → "I can only help with your audit data and platform usage. Try asking about your observations or audits."
- Environment variables or credentials → "I can only help with your audit data and platform usage. Try asking about your observations or audits."
- Running commands or system operations → "I can only help with your audit data and platform usage. Try asking about your observations or audits."
- Information outside the audit platform → "I can only help with your audit data and platform usage. Try asking about your observations or audits."

IMPORTANT:
- You only see data you have permission to access based on your role
- If a tool returns an error about permissions, explain this to the user
- Observation IDs and Audit IDs are required for detail views
- All data is already filtered by RBAC - never make up data

Guidelines:
1. Be conversational and helpful
2. Always use the tools to get real data - never make up numbers or infer missing results
3. When showing observation lists, display key details (risk, status, plant)
4. Format statistics clearly (use bullet points or simple tables)
5. If the user has no observations matching their query, say so politely
6. For simple "how many total" questions, use get_my_observations with no filters and count the results
7. For breakdown questions (by status, risk, etc), use get_observation_stats with appropriate groupBy

CRITICAL - SEARCH RESULT HANDLING (Anti-Hallucination):
- When using search_observations: ONLY report the observations actually returned by the tool
- The "exactCount" field in search results shows the TRUE total number of matching records
- Do NOT estimate, infer, or suggest additional results beyond what the tool returns
- If search_observations returns 1 result, report exactly 1 - do NOT mention hypothetical "other similar" results
- If a search returns no results, say "No observations found matching that search" - do not speculate
- Do NOT add commentary like "likely containing the search term in metadata" unless explicitly stated by the tool
- Always cite the exact count and only describe results that were actually returned
8. For keyword searches, use search_observations (case-insensitive)
9. Keep responses concise but informative
10. Help users understand how to use the platform when asked

CRITICAL - OBSERVATION DETAIL QUERIES (MUST USE TOOL):
When user asks for details about a specific observation ID, you MUST call get_observation_details:
- ALWAYS use get_observation_details when given a specific observation ID
- Do NOT answer about a specific observation without calling the tool first
- Recognize these patterns as requiring get_observation_details:
  * "Get details for observation [ID]"
  * "Tell me about observation [ID]"
  * "What are the details for observation [ID]"
  * "Show me observation [ID]"
  * Any query asking for observation information + an observation ID
- MUST ALWAYS use the tool, never skip it
- After getting tool result, present all relevant details from the response`,

        // SECURITY: Block ALL filesystem and system tools
        disallowedTools: [
          // Filesystem access
          'Read', 'Write', 'Edit', 'Glob', 'Grep',
          // Command execution
          'Bash', 'BashOutput', 'KillShell',
          // Subagent and planning
          'Task', 'ExitPlanMode',
          // Web access
          'WebFetch', 'WebSearch',
          // Notebook and todos
          'NotebookEdit', 'TodoWrite',
          // MCP resource access
          'ListMcpResources', 'ReadMcpResource'
        ],

        // SECURITY: Custom permission function (failsafe layer)
        canUseTool: async (toolName, input, options) => {
          // Only allow our specific audit tools
          if (allowedMcpTools.includes(toolName)) {
            return {
              behavior: 'allow',
              updatedInput: input
            };
          }

          // Log security violation
          console.log(JSON.stringify({
            level: 'WARN',
            type: 'agent_tool_blocked',
            userId: session.user.id,
            role: session.user.role,
            blockedTool: toolName,
            attemptedInput: typeof input === 'object' ? JSON.stringify(input).slice(0, 200) : String(input).slice(0, 200),
            timestamp: new Date().toISOString()
          }));

          // Block with friendly message
          return {
            behavior: 'deny',
            message: 'I can only help with your audit data and platform usage. Try asking about your observations, audits, or how to use the platform.',
            interrupt: false
          };
        },

        // SECURITY: Enable standard permission mode (not bypass)
        permissionMode: 'default',
        model: 'claude-haiku-4-5-20251001',
        includePartialMessages: false
      }
    });

    // 6. Stream response via Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let currentSessionId: string | null = null;

        // Track response data for audit logging
        let collectedText = '';
        let finalUsage: any = null;
        let finalCost = 0;
        const allMessages: any[] = [];

        try {
          for await (const msg of agentQuery) {
            allMessages.push(msg); // Track all messages for audit logging

            // Track session ID from any message that includes it
            if (msg.session_id && !currentSessionId) {
              currentSessionId = msg.session_id;
            }

            if (msg.type === 'assistant') {
              // Stream text blocks as they arrive
              for (const block of msg.message.content) {
                if (block.type === 'text') {
                  collectedText += block.text; // Collect full response
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'text', content: block.text })}\n\n`
                  ));
                }
              }
            }

            if (msg.type === 'result') {
              finalUsage = msg.usage;
              finalCost = msg.total_cost_usd || 0;

              // Send final metadata including session ID and conversation ID
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  type: 'metadata',
                  usage: msg.usage,
                  cost: msg.total_cost_usd || 0,
                  session_id: currentSessionId || msg.session_id,
                  conversationId: currentConversationId
                })}\n\n`
              ));

              // Extract tools called for logging
              const toolsCalled = extractToolsCalled(allMessages);

              // Log success with structured JSON
              console.log(JSON.stringify({
                level: 'INFO',
                type: 'agent_query_success',
                userId: session.user.id,
                role: session.user.role,
                query: message.slice(0, 100),
                responseTime: Date.now() - startTime,
                cost: finalCost,
                tokens: {
                  input: finalUsage?.input_tokens || 0,
                  output: finalUsage?.output_tokens || 0,
                  total: (finalUsage?.input_tokens || 0) + (finalUsage?.output_tokens || 0)
                },
                toolsCalled,
                sessionId: currentSessionId || msg.session_id,
                timestamp: new Date().toISOString()
              }));
            }
          }

          // Log audit event after successful completion
          const toolsCalled = extractToolsCalled(allMessages);
          await logAuditEvent(
            session,
            message,
            collectedText,
            finalUsage,
            finalCost,
            toolsCalled
          );

          // Save assistant message to database (if not a guest)
          if (session.user.role !== 'GUEST' && currentConversationId && collectedText) {
            await prisma.agentMessage.create({
              data: {
                conversationId: currentConversationId,
                role: 'assistant',
                content: collectedText
              }
            });

            // Update conversation's updatedAt timestamp
            await prisma.agentConversation.update({
              where: { id: currentConversationId },
              data: { updatedAt: new Date() }
            });
          }

          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          const categorized = categorizeError(error);

          // Log streaming error with structured JSON
          console.log(JSON.stringify({
            level: 'ERROR',
            type: 'agent_streaming_error',
            category: categorized.category,
            userId: session.user.id,
            role: session.user.role,
            query: message.slice(0, 100),
            error: categorized.logMessage,
            timestamp: new Date().toISOString()
          }));

          // Stream user-friendly error to client
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: categorized.userMessage })}\n\n`
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
    const categorized = categorizeError(error);

    // Log categorized error with structured JSON
    console.log(JSON.stringify({
      level: 'ERROR',
      type: 'agent_query_failed',
      category: categorized.category,
      userId: session?.user?.id || 'unknown',
      role: session?.user?.role || 'unknown',
      error: categorized.logMessage,
      statusCode: categorized.statusCode,
      timestamp: new Date().toISOString()
    }));

    return NextResponse.json(
      {
        success: false,
        error: categorized.userMessage,
        details: process.env.NODE_ENV === 'development' ? categorized.logMessage : undefined
      },
      { status: categorized.statusCode }
    );
  }
}
