import { NextRequest } from "next/server";
import { cerebras } from "@ai-sdk/cerebras";
import {
  streamText,
  tool,
  stepCountIs,
  convertToModelMessages,
  validateUIMessages,
  createIdGenerator,
  UIMessage,
} from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import {
  appendMessagesToSession,
  getSessionWithMessages,
} from "@/server/ai-chat/store";
import {
  isCFO,
  isCXOTeam,
  isAuditHead,
  isAuditor,
  isAuditee,
  isGuest,
} from "@/lib/rbac";
import { Prisma } from "@prisma/client";
import { buildScopeWhere, getUserScope } from "@/lib/scope";

export const maxDuration = 30;

function logToolUsage(toolName: string, userId: string | undefined, payload: unknown) {
  try {
    console.log(
      `[AI Tool] ${toolName} user=${userId ?? "unknown"} payload=${JSON.stringify(payload)}`
    );
  } catch (err) {
    console.log(`[AI Tool] ${toolName} user=${userId ?? "unknown"} payload=[unserializable]`);
  }
}

// System prompt that guides the AI assistant
const SYSTEM_PROMPT = `You are the EZAudit AI Assistant, a helpful conversational agent for an internal audit management platform.

Your role:
- Help users (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST) query and understand audits and observations.
- Provide concise, factual answers based on the tools available to you.
- Always use tools to fetch real data rather than making assumptions.

Guidelines:
- Keep answers brief and to the point unless asked for more detail.
- When a tool returns "allowed: false", politely explain the RBAC limitation.
- If filters are ambiguous, ask one clarifying question ONLY when necessary.
- Present counts and lists clearly. Use compact tables for rankings.
- When listing observations, include approval status, risk, process, audit title, and plant.

Session awareness and defaults:
- You have access to the authenticated user's role and ID on the server. Do NOT ask the user what their role is.
- Tools already enforce RBAC and personal assignment scoping based on the authenticated user.
- When the user says "my" or "assigned to me" (e.g., "What audits am I assigned to?"), default to results for the current user without asking for clarification.
- When the user asks broadly (e.g., "Show audits"), default to audits they can access under RBAC without asking for their role.
- Only ask clarifying questions when a filter is critical and cannot be reasonably defaulted (e.g., a requested plant name is ambiguous or missing).

Tool usage and multi-tool reasoning:
- Prefer general-purpose tools that can be composed: observations_find, audits_find, observations_similar.
- Use multiple tools in one answer if needed (e.g., overview with audits_find + drill-down via observations_find).
- Avoid count-only answers unless explicitly requested ("how many"). If a count is requested, add 1–2 lines of useful context.
- Keep tool inputs simple; provide only the minimum filters required.

Examples:
- "What audits am I assigned to?" → audits_find(metrics=per_audit) with RBAC defaults.
- "List my observations with risk A" → observations_find(risk=A).
- "Similar to observation X?" → observations_similar(observationId=X), then summarize.

Overall summary policy:
- For broad requests like "Give me an overall summary", first call audits_find(metrics=per_audit, limit=50) to list recent audits with plant and per-audit metrics.
- Then call observations_find({ aggregationBy: "plant", limit: 1 }) to get counts per plant (risk/status mix if useful).
- Optionally call audits_find(metrics=per_auditor) when the user asks about auditors’ performance.
- Synthesize a plant → audits → observations view with 3–5 bullet insights, a compact table (Plant | #Audits | #Obs | A-risk open | Resolution %), and 2–3 recommended next steps.

Role Permissions Context:
- CFO and CXO_TEAM: Can see all audits and observations.
- AUDIT_HEAD: Can see audits they lead and observations from their audits.
- AUDITOR: Can see audits they're assigned to and observations from those audits.
- AUDITEE: Can only see observations they're assigned to (no audit listing access).
- GUEST: Read-only access to published and approved content only.

Available observation statuses:
- Approval Status: DRAFT, SUBMITTED, APPROVED, REJECTED
- Current Status: PENDING_MR, MR_UNDER_REVIEW, REFERRED_BACK, OBSERVATION_FINALISED, RESOLVED

Risk Categories: A (high), B (medium), C (low)
Processes: O2C (Order to Cash), P2P (Procure to Pay), R2R (Record to Report), INVENTORY`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { chatId, message, messages: messageList } = body as {
    chatId?: string;
    message?: UIMessage;
    messages?: UIMessage[];
  };

  if (!chatId || typeof chatId !== "string") {
    return Response.json({ error: "chatId is required" }, { status: 400 });
  }

  const sessionData = await getSessionWithMessages(session.user.id, chatId);
  if (!sessionData) {
    return Response.json({ error: "Chat session not found" }, { status: 404 });
  }

  const existingMessages = sessionData.messages;
  const incomingMessages: UIMessage[] = [];

  if (message && typeof message === "object") {
    incomingMessages.push(message);
  }

  if (incomingMessages.length === 0 && Array.isArray(messageList)) {
    const knownIds = new Set(existingMessages.map((msg) => msg.id));
    for (const msg of messageList) {
      if (msg && typeof msg === "object" && msg.id && !knownIds.has(msg.id)) {
        incomingMessages.push(msg);
      }
    }
  }

  if (incomingMessages.length === 0) {
    return Response.json({ error: "No new message provided" }, { status: 400 });
  }

  const combinedMessages = [...existingMessages, ...incomingMessages];

  const tools = {
    // ========================================================================
    // TOOL 1: Count observations with filters
    // ========================================================================
    observations_count: tool({
      description:
        "Count the number of observations the user can access. Supports filtering by approval status (DRAFT/SUBMITTED/APPROVED/REJECTED), current status (PENDING_MR/MR_UNDER_REVIEW/REFERRED_BACK/OBSERVATION_FINALISED/RESOLVED), audit ID, plant ID, risk category (A/B/C), process (O2C/P2P/R2R/INVENTORY), and text search query.",
      inputSchema: z.object({
        approvalStatus: z
          .enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"])
          .optional()
          .describe("Filter by approval status"),
        currentStatus: z
          .string()
          .optional()
          .describe("Filter by current status"),
        auditId: z.string().optional().describe("Filter by specific audit ID"),
        plantId: z
          .string()
          .optional()
          .describe("Filter by specific plant ID"),
        risk: z
          .enum(["A", "B", "C"])
          .optional()
          .describe("Filter by risk category"),
        process: z
          .enum(["O2C", "P2P", "R2R", "INVENTORY"])
          .optional()
          .describe("Filter by concerned process"),
        q: z.string().optional().describe("Text search query"),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const isKnownRole =
          isCFO(role) ||
          isCXOTeam(role) ||
          isAuditHead(role) ||
          isAuditor(role) ||
          isAuditee(role) ||
          isGuest(role);
        if (!isKnownRole) return { allowed: false, reason: "Forbidden" };

        // Build base filters from arguments
        const filters: Prisma.ObservationWhereInput[] = [];
        if (args.approvalStatus) filters.push({ approvalStatus: args.approvalStatus });
        if (args.currentStatus) filters.push({ currentStatus: args.currentStatus as any });
        if (args.auditId) filters.push({ auditId: args.auditId });
        if (args.plantId) filters.push({ plantId: args.plantId });
        if (args.risk) filters.push({ riskCategory: args.risk as any });
        if (args.process) filters.push({ concernedProcess: args.process as any });
        if (args.q) {
          filters.push({
            OR: [
              { observationText: { contains: args.q, mode: "insensitive" } },
              { risksInvolved: { contains: args.q, mode: "insensitive" } },
              { auditeeFeedback: { contains: args.q, mode: "insensitive" } },
            ],
          });
        }

        let where: Prisma.ObservationWhereInput = filters.length > 0 ? { AND: filters } : {};

        // Apply RBAC filtering (same logic as GET /api/v1/observations)
        if (isCFO(role) || isCXOTeam(role)) {
          // CFO and CXO_TEAM see all observations
        } else if (isAuditHead(role)) {
          const auditHeadFilter: Prisma.ObservationWhereInput = {
            audit: {
              OR: [
                { auditHeadId: userId },
                { assignments: { some: { auditorId: userId } } },
              ],
            },
          };
          where = { AND: [where, auditHeadFilter] };
        } else if (isAuditor(role)) {
          const auditorFilter: Prisma.ObservationWhereInput = {
            audit: {
              assignments: { some: { auditorId: userId } },
            },
          };
          where = { AND: [where, auditorFilter] };
        } else if (isAuditee(role)) {
          const auditeeFilter: Prisma.ObservationWhereInput = {
            assignments: { some: { auditeeId: userId } },
          };
          where = { AND: [where, auditeeFilter] };
        } else if (isGuest(role)) {
          const scope = await getUserScope(userId);
          const scopeWhere = buildScopeWhere(scope);
          const allowPublished: Prisma.ObservationWhereInput = {
            AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }],
          };
          const or: Prisma.ObservationWhereInput[] = [allowPublished];
          if (scopeWhere) or.push(scopeWhere);
          where = { AND: [where, { OR: or }] };
        }

        const count = await prisma.observation.count({ where });

        logToolUsage("observations_count", session.user.id, {
          count,
          filters_applied: {
            approvalStatus: args.approvalStatus || "none",
            currentStatus: args.currentStatus || "none",
            auditId: args.auditId || "none",
            plantId: args.plantId || "none",
            risk: args.risk || "none",
            process: args.process || "none",
            search: args.q || "none",
          },
        });

        return {
          allowed: true,
          count,
          filters_applied: {
            approvalStatus: args.approvalStatus || "none",
            currentStatus: args.currentStatus || "none",
            auditId: args.auditId || "none",
            plantId: args.plantId || "none",
            risk: args.risk || "none",
            process: args.process || "none",
            search: args.q || "none",
          },
        };
      },
    }),

    // ========================================================================
    // TOOL 2: List observations with filters and pagination
    // ========================================================================
    observations_list: tool({
      description:
        "List observations the user can access with pagination. Returns observation ID, title (first 120 chars), approval status, current status, risk, process, and audit title. Supports same filters as observations_count plus a limit parameter.",
      inputSchema: z.object({
        approvalStatus: z
          .enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"])
          .optional()
          .describe("Filter by approval status"),
        currentStatus: z
          .string()
          .optional()
          .describe("Filter by current status"),
        auditId: z.string().optional().describe("Filter by specific audit ID"),
        plantId: z
          .string()
          .optional()
          .describe("Filter by specific plant ID"),
        risk: z
          .enum(["A", "B", "C"])
          .optional()
          .describe("Filter by risk category"),
        process: z
          .enum(["O2C", "P2P", "R2R", "INVENTORY"])
          .optional()
          .describe("Filter by concerned process"),
        q: z.string().optional().describe("Text search query"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results (default 10)"),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const isKnownRole =
          isCFO(role) ||
          isCXOTeam(role) ||
          isAuditHead(role) ||
          isAuditor(role) ||
          isAuditee(role) ||
          isGuest(role);
        if (!isKnownRole) return { allowed: false, reason: "Forbidden" };

        const filters: Prisma.ObservationWhereInput[] = [];
        if (args.approvalStatus) filters.push({ approvalStatus: args.approvalStatus });
        if (args.currentStatus) filters.push({ currentStatus: args.currentStatus as any });
        if (args.auditId) filters.push({ auditId: args.auditId });
        if (args.plantId) filters.push({ plantId: args.plantId });
        if (args.risk) filters.push({ riskCategory: args.risk as any });
        if (args.process) filters.push({ concernedProcess: args.process as any });
        if (args.q) {
          filters.push({
            OR: [
              { observationText: { contains: args.q, mode: "insensitive" } },
              { risksInvolved: { contains: args.q, mode: "insensitive" } },
              { auditeeFeedback: { contains: args.q, mode: "insensitive" } },
            ],
          });
        }

        let where: Prisma.ObservationWhereInput = filters.length > 0 ? { AND: filters } : {};

        if (isCFO(role) || isCXOTeam(role)) {
          // See all
        } else if (isAuditHead(role)) {
          const auditHeadFilter: Prisma.ObservationWhereInput = {
            audit: {
              OR: [
                { auditHeadId: userId },
                { assignments: { some: { auditorId: userId } } },
              ],
            },
          };
          where = { AND: [where, auditHeadFilter] };
        } else if (isAuditor(role)) {
          const auditorFilter: Prisma.ObservationWhereInput = {
            audit: {
              assignments: { some: { auditorId: userId } },
            },
          };
          where = { AND: [where, auditorFilter] };
        } else if (isAuditee(role)) {
          const auditeeFilter: Prisma.ObservationWhereInput = {
            assignments: { some: { auditeeId: userId } },
          };
          where = { AND: [where, auditeeFilter] };
        } else if (isGuest(role)) {
          const scope = await getUserScope(userId);
          const scopeWhere = buildScopeWhere(scope);
          const allowPublished: Prisma.ObservationWhereInput = {
            AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }],
          };
          const or: Prisma.ObservationWhereInput[] = [allowPublished];
          if (scopeWhere) or.push(scopeWhere);
          where = { AND: [where, { OR: or }] };
        }

        const observations = await prisma.observation.findMany({
          where,
          take: args.limit || 10,
          orderBy: { createdAt: "desc" },
          include: {
            audit: {
              select: { id: true, title: true },
            },
            plant: {
              select: { id: true, name: true },
            },
          },
        });

        logToolUsage("observations_list", session.user.id, {
          count: observations.length,
          sample: observations.slice(0, 3).map((obs) => ({
            id: obs.id,
            approvalStatus: obs.approvalStatus,
            riskCategory: obs.riskCategory,
          })),
        });

        return {
          allowed: true,
          count: observations.length,
          observations: observations.map((obs) => ({
            id: obs.id,
            title: obs.observationText.slice(0, 120),
            approvalStatus: obs.approvalStatus,
            currentStatus: obs.currentStatus,
            riskCategory: obs.riskCategory,
            concernedProcess: obs.concernedProcess,
            auditTitle: obs.audit?.title || "Untitled Audit",
            plantName: obs.plant?.name || "Unknown Plant",
            createdAt: obs.createdAt.toISOString(),
          })),
        };
      },
    }),

    // ========================================================================
    // TOOL 3: Count audits
    // ========================================================================
    audits_count: tool({
      description:
        "Count the number of audits the user can access. AUDITEE and GUEST roles have no access to audits.",
      inputSchema: z.object({
        plantId: z.string().optional().describe("Filter by specific plant ID"),
        status: z
          .string()
          .optional()
          .describe("Filter by audit status (PLANNING/IN_PROGRESS/COMPLETED)"),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const isKnownRole =
          isCFO(role) ||
          isCXOTeam(role) ||
          isAuditHead(role) ||
          isAuditor(role) ||
          isAuditee(role) ||
          isGuest(role);
        if (!isKnownRole) return { allowed: false, reason: "Forbidden" };

        if (isAuditee(role) || isGuest(role)) {
          return {
            allowed: false,
            reason:
              "Your role (AUDITEE/GUEST) does not have access to audit listings. You can only view observations assigned to you.",
          };
        }

        const where: any = {
          plantId: args.plantId,
          status: args.status,
        };

        if (isCFO(role) || isCXOTeam(role)) {
          // See all audits
        } else if (isAuditHead(role)) {
          where.OR = [
            { auditHeadId: userId },
            { assignments: { some: { auditorId: userId } } },
          ];
        } else if (isAuditor(role)) {
          where.OR = [{ assignments: { some: { auditorId: userId } } }];
        }

        const count = await prisma.audit.count({ where });

        logToolUsage("audits_count", session.user.id, {
          count,
          filters_applied: {
            plantId: args.plantId || "none",
            status: args.status || "none",
          },
        });

        return {
          allowed: true,
          count,
          filters_applied: {
            plantId: args.plantId || "none",
            status: args.status || "none",
          },
        };
      },
    }),

    // ========================================================================
    // TOOL 4: List audits with progress
    // ========================================================================
    audits_list: tool({
      description:
        "List audits the user can access with progress information (total observations and resolved count). AUDITEE and GUEST roles have no access. Returns audit ID, title, plant name, status, visit dates, and observation progress.",
      inputSchema: z.object({
        plantId: z.string().optional().describe("Filter by specific plant ID"),
        status: z
          .string()
          .optional()
          .describe("Filter by audit status (PLANNING/IN_PROGRESS/COMPLETED)"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of results (default 10)"),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const isKnownRole =
          isCFO(role) ||
          isCXOTeam(role) ||
          isAuditHead(role) ||
          isAuditor(role) ||
          isAuditee(role) ||
          isGuest(role);
        if (!isKnownRole) return { allowed: false, reason: "Forbidden" };

        if (isAuditee(role) || isGuest(role)) {
          return {
            allowed: false,
            reason: "Your role (AUDITEE/GUEST) does not have access to audit listings.",
          };
        }

        const where: any = {
          plantId: args.plantId,
          status: args.status,
        };

        if (isCFO(role) || isCXOTeam(role)) {
          // See all
        } else if (isAuditHead(role)) {
          where.OR = [
            { auditHeadId: userId },
            { assignments: { some: { auditorId: userId } } },
          ];
        } else if (isAuditor(role)) {
          where.OR = [{ assignments: { some: { auditorId: userId } } }];
        }

        const audits = await prisma.audit.findMany({
          where,
          take: args.limit || 10,
          orderBy: { createdAt: "desc" },
          include: {
            plant: { select: { id: true, name: true } },
            assignments: {
              include: {
                auditor: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });

        let filteredAudits = audits;
        if (isAuditHead(role) || isAuditor(role)) {
          filteredAudits = audits.filter((audit) => {
            if (isAuditHead(role) && audit.auditHeadId === userId) return true;
            if (
              isAuditor(role) &&
              audit.assignments.some((assignment) => assignment.auditorId === userId)
            ) {
              return true;
            }

            const rules = audit.visibilityRules;
            if (!rules) return false;

            if (rules === "show_all") return true;
            if (rules === "hide_all") return false;
            if (rules === "last_12m") {
              const twelveMonthsAgo = new Date();
              twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
              return audit.createdAt >= twelveMonthsAgo;
            }
            if (typeof rules === "object" && "explicit" in rules) {
              const explicit = rules as { explicit: { auditIds: string[] } };
              return explicit.explicit.auditIds.includes(audit.id);
            }

            return false;
          });
        }

        const auditIds = filteredAudits.map((a) => a.id);
        const grouped = auditIds.length
          ? await prisma.observation.groupBy({
              by: ["auditId", "currentStatus"],
              where: { auditId: { in: auditIds } },
              _count: { _all: true },
            })
          : [];

        const totals = new Map<string, number>();
        const resolved = new Map<string, number>();
        for (const g of grouped) {
          totals.set(g.auditId, (totals.get(g.auditId) ?? 0) + g._count._all);
          if (g.currentStatus === "RESOLVED") {
            resolved.set(g.auditId, (resolved.get(g.auditId) ?? 0) + g._count._all);
          }
        }

        logToolUsage("audits_list", session.user.id, {
          count: filteredAudits.length,
          sample: filteredAudits.slice(0, 3).map((audit) => ({
            id: audit.id,
            status: audit.status,
            plant: audit.plant?.name,
          })),
        });

        return {
          allowed: true,
          count: filteredAudits.length,
          audits: filteredAudits.map((audit) => ({
            id: audit.id,
            title: audit.title || "Untitled Audit",
            plantName: audit.plant?.name || "Unknown Plant",
            status: audit.status,
            visitStartDate: audit.visitStartDate?.toISOString() || null,
            visitEndDate: audit.visitEndDate?.toISOString() || null,
            isLocked: audit.isLocked,
            createdAt: audit.createdAt.toISOString(),
            assignedAuditors: audit.assignments.map((assignment) => ({
              name: assignment.auditor.name,
              email: assignment.auditor.email,
            })),
            progress: {
              total: totals.get(audit.id) ?? 0,
              resolved: resolved.get(audit.id) ?? 0,
            },
          })),
        };
      },
    }),

    // ========================================================================
    // GENERAL TOOL A: Observations - flexible search with optional aggregation
    // ========================================================================
    observations_find: tool({
      description:
        "Search observations with filters and optional aggregation by a single dimension.",
      inputSchema: z.object({
        approvalStatus: z
          .enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]) // approval filter
          .nullable(),
        currentStatus: z.string().nullable().describe("Filter by current status"),
        auditId: z.string().nullable().describe("Filter by audit ID"),
        plantId: z.string().nullable().describe("Filter by plant ID"),
        risk: z.enum(["A", "B", "C"]).nullable().describe("Filter by risk"),
        process: z
          .enum(["O2C", "P2P", "R2R", "INVENTORY"]) // concerned process
          .nullable(),
        responsible: z
          .string()
          .nullable()
          .describe("Substring match on person responsible to implement"),
        q: z
          .string()
          .nullable()
          .describe("Free-text search across key observation fields"),
        limit: z.number().nullable().default(20),
        aggregationBy: z
          .enum(["plant", "process", "risk", "status", "responsible"]) // single dimension
          .nullable(),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const isKnownRole =
          isCFO(role) ||
          isCXOTeam(role) ||
          isAuditHead(role) ||
          isAuditor(role) ||
          isAuditee(role) ||
          isGuest(role);
        if (!isKnownRole) return { allowed: false, reason: "Forbidden" };

        const filters: Prisma.ObservationWhereInput[] = [];
        if (args.approvalStatus) filters.push({ approvalStatus: args.approvalStatus });
        if (args.currentStatus) filters.push({ currentStatus: args.currentStatus as any });
        if (args.auditId) filters.push({ auditId: args.auditId });
        if (args.plantId) filters.push({ plantId: args.plantId });
        if (args.risk) filters.push({ riskCategory: args.risk as any });
        if (args.process) filters.push({ concernedProcess: args.process as any });
        if (args.responsible)
          filters.push({
            personResponsibleToImplement: {
              contains: args.responsible,
              mode: "insensitive",
            },
          });
        if (args.q) {
          filters.push({
            OR: [
              { observationText: { contains: args.q, mode: "insensitive" } },
              { risksInvolved: { contains: args.q, mode: "insensitive" } },
              { auditeeFeedback: { contains: args.q, mode: "insensitive" } },
            ],
          });
        }

        let where: Prisma.ObservationWhereInput = filters.length > 0 ? { AND: filters } : {};

        // RBAC scoping
        if (isCFO(role) || isCXOTeam(role)) {
          // Full access
        } else if (isAuditHead(role)) {
          where = {
            AND: [
              where,
              {
                audit: {
                  OR: [
                    { auditHeadId: userId },
                    { assignments: { some: { auditorId: userId } } },
                  ],
                },
              },
            ],
          };
        } else if (isAuditor(role)) {
          where = {
            AND: [
              where,
              { audit: { assignments: { some: { auditorId: userId } } } },
            ],
          };
        } else if (isAuditee(role)) {
          where = {
            AND: [where, { assignments: { some: { auditeeId: userId } } }],
          };
        } else if (isGuest(role)) {
          const scope = await getUserScope(userId);
          const scopeWhere = buildScopeWhere(scope);
          const allowPublished: Prisma.ObservationWhereInput = {
            AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }],
          };
          const or: Prisma.ObservationWhereInput[] = [allowPublished];
          if (scopeWhere) or.push(scopeWhere);
          where = { AND: [where, { OR: or }] };
        }

        const take = typeof args.limit === "number" && args.limit ? args.limit : 20;

        const observations = await prisma.observation.findMany({
          where,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            audit: { select: { id: true, title: true } },
            plant: { select: { id: true, name: true } },
          },
        });

        let aggregation: any = undefined;
        if (args.aggregationBy) {
          switch (args.aggregationBy) {
            case "plant": {
              const grouped = await prisma.observation.groupBy({
                by: ["plantId"],
                where,
                _count: { _all: true },
              });
              const plantIds = grouped.map((g) => g.plantId).filter(Boolean) as string[];
              const plants = plantIds.length
                ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, select: { id: true, name: true } })
                : [];
              const idToName = new Map(plants.map((p) => [p.id, p.name] as const));
              aggregation = {
                by: "plant",
                groups: grouped.map((g) => ({ key: idToName.get(g.plantId) ?? g.plantId ?? "unknown", count: g._count._all })),
              };
              break;
            }
            case "process": {
              const grouped = await prisma.observation.groupBy({
                by: ["concernedProcess"],
                where,
                _count: { _all: true },
              });
              aggregation = {
                by: "process",
                groups: grouped.map((g) => ({ key: (g.concernedProcess as string) ?? "unknown", count: g._count._all })),
              };
              break;
            }
            case "risk": {
              const grouped = await prisma.observation.groupBy({
                by: ["riskCategory"],
                where,
                _count: { _all: true },
              });
              aggregation = {
                by: "risk",
                groups: grouped.map((g) => ({ key: (g.riskCategory as string) ?? "unknown", count: g._count._all })),
              };
              break;
            }
            case "status": {
              const grouped = await prisma.observation.groupBy({
                by: ["currentStatus"],
                where,
                _count: { _all: true },
              });
              aggregation = {
                by: "status",
                groups: grouped.map((g) => ({ key: (g.currentStatus as string) ?? "unknown", count: g._count._all })),
              };
              break;
            }
            case "responsible": {
              const grouped = await prisma.observation.groupBy({
                by: ["personResponsibleToImplement"],
                where,
                _count: { _all: true },
              });
              aggregation = {
                by: "responsible",
                groups: grouped.map((g) => ({ key: (g.personResponsibleToImplement as string) ?? "unknown", count: g._count._all })),
              };
              break;
            }
          }
        }

        logToolUsage("observations_find", session.user.id, {
          resultCount: observations.length,
          aggregation: aggregation?.by ?? null,
        });

        return {
          allowed: true,
          count: observations.length,
          observations: observations.map((obs) => ({
            id: obs.id,
            title: obs.observationText.slice(0, 160),
            approvalStatus: obs.approvalStatus,
            currentStatus: obs.currentStatus,
            riskCategory: obs.riskCategory,
            concernedProcess: obs.concernedProcess,
            auditTitle: obs.audit?.title || "Untitled Audit",
            plantName: obs.plant?.name || "Unknown Plant",
            targetDate: obs.targetDate ? obs.targetDate.toISOString() : null,
            implementationDate: obs.implementationDate ? obs.implementationDate.toISOString() : null,
            createdAt: obs.createdAt.toISOString(),
          })),
          aggregation,
        };
      },
    }),

    // ========================================================================
    // GENERAL TOOL B: Audits - flexible list with optional per-audit metrics
    // ========================================================================
    audits_find: tool({
      description: "Search audits with filters and optional metrics.",
      inputSchema: z.object({
        plantId: z.string().nullable(),
        status: z.string().nullable(),
        limit: z.number().nullable().default(10),
        metrics: z.enum(["none", "per_audit", "overall", "per_auditor"]).nullable().default("per_audit"),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        const where: any = {
          plantId: args.plantId ?? undefined,
          status: args.status ?? undefined,
        };

        if (isCFO(role) || isCXOTeam(role)) {
          // full
        } else if (isAuditHead(role)) {
          where.OR = [
            { auditHeadId: userId },
            { assignments: { some: { auditorId: userId } } },
          ];
        } else if (isAuditor(role)) {
          where.OR = [{ assignments: { some: { auditorId: userId } } }];
        } else if (isAuditee(role)) {
          // Auditee does not have audits listing access in our RBAC
          return { allowed: false, reason: "Your role does not have access to audits." };
        } else if (isGuest(role)) {
          // Guests also do not have audits listing access
          return { allowed: false, reason: "Your role does not have access to audits." };
        }

        const take = typeof args.limit === "number" && args.limit ? args.limit : 10;

        const audits = await prisma.audit.findMany({
          where,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            plant: { select: { id: true, name: true } },
            assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } },
          },
        });

        let metrics: any = undefined;
        if (args.metrics && (args.metrics === "per_audit" || args.metrics === "overall" || args.metrics === "per_auditor")) {
          const auditIds = audits.map((a) => a.id);
          const grouped = auditIds.length
            ? await prisma.observation.groupBy({
                by: ["auditId", "currentStatus"],
                where: { auditId: { in: auditIds } },
                _count: { _all: true },
              })
            : [];
          const perAuditTotals = new Map<string, { total: number; resolved: number }>();
          for (const g of grouped) {
            const entry = perAuditTotals.get(g.auditId) ?? { total: 0, resolved: 0 };
            entry.total += g._count._all;
            if (g.currentStatus === "RESOLVED") entry.resolved += g._count._all;
            perAuditTotals.set(g.auditId, entry);
          }

          if (args.metrics === "per_audit") {
            metrics = {
              kind: "per_audit",
              values: audits.map((a) => {
                const t = perAuditTotals.get(a.id) ?? { total: 0, resolved: 0 };
                const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                return { auditId: a.id, total: t.total, resolved: t.resolved, resolutionRatePct: rate };
              }),
            };
          } else if (args.metrics === "overall") {
            const totals = Array.from(perAuditTotals.values()).reduce(
              (acc, v) => ({ total: acc.total + v.total, resolved: acc.resolved + v.resolved }),
              { total: 0, resolved: 0 },
            );
            const rate = totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0;
            metrics = { kind: "overall", total: totals.total, resolved: totals.resolved, resolutionRatePct: rate };
          } else if (args.metrics === "per_auditor") {
            const auditorGrouped = audits.length
              ? await prisma.observation.groupBy({
                  by: ["auditId", "createdById"],
                  where: { auditId: { in: audits.map((a) => a.id) } },
                  _count: { _all: true },
                })
              : [];
            const auditorIds = Array.from(new Set(auditorGrouped.map((g) => g.createdById).filter(Boolean) as string[]));
            const auditors = auditorIds.length
              ? await prisma.user.findMany({ where: { id: { in: auditorIds } }, select: { id: true, name: true, email: true } })
              : [];
            const idToAuditor = new Map(auditors.map((u) => [u.id, u] as const));

            const values = audits.map((a) => {
              const rows = auditorGrouped.filter((g) => g.auditId === a.id);
              const items = rows.map((r) => ({
                auditorId: r.createdById,
                auditorName: idToAuditor.get(r.createdById)?.name ?? "Unknown",
                auditorEmail: idToAuditor.get(r.createdById)?.email ?? null,
                observationsCreated: r._count._all,
              }));
              items.sort((x, y) => y.observationsCreated - x.observationsCreated);
              return { auditId: a.id, auditors: items };
            });

            metrics = { kind: "per_auditor", values };
          }
        }

        logToolUsage("audits_find", session.user.id, { count: audits.length, metrics: metrics?.kind ?? "none" });

        return {
          allowed: true,
          count: audits.length,
          audits: audits.map((a) => ({
            id: a.id,
            title: a.title || "Untitled Audit",
            plantName: a.plant?.name || "Unknown Plant",
            status: a.status,
            visitStartDate: a.visitStartDate?.toISOString() || null,
            visitEndDate: a.visitEndDate?.toISOString() || null,
            createdAt: a.createdAt.toISOString(),
            assignedAuditors: a.assignments.map((as) => ({ id: as.auditorId, name: as.auditor.name, email: as.auditor.email })),
          })),
          metrics,
        };
      },
    }),

    // ========================================================================
    // GENERAL TOOL C: Observations similarity (lexical baseline)
    // ========================================================================
    observations_similar: tool({
      description:
        "Find observations similar to a given observation or text (lexical baseline).",
      inputSchema: z.object({
        observationId: z.string().nullable(),
        text: z.string().nullable(),
        limit: z.number().nullable().default(10),
      }),
      execute: async (args) => {
        const session = await auth();
        if (!session?.user) {
          return { allowed: false, reason: "Unauthenticated" };
        }

        const role = session.user.role;
        const userId = session.user.id;

        let baseText = args.text ?? null;
        let excludeId: string | null = null;
        if (!baseText && args.observationId) {
          const base = await prisma.observation.findFirst({ where: { id: args.observationId } });
          if (base) {
            baseText = base.observationText;
            excludeId = base.id;
          }
        }

        if (!baseText) {
          return { allowed: true, results: [], reason: "No base text or observation provided" };
        }

        // extract simple keywords
        const tokens = baseText
          .split(/[^a-zA-Z0-9]+/)
          .map((t) => t.trim())
          .filter((t) => t.length > 3)
          .slice(0, 12);
        const unique = Array.from(new Set(tokens)).slice(0, 6);

        const orClauses = unique.map((k) => ({ observationText: { contains: k, mode: "insensitive" } }));
        let where: Prisma.ObservationWhereInput = orClauses.length > 0 ? { OR: orClauses } : {};
        if (excludeId) where = { AND: [where, { id: { not: excludeId } }] };

        // Apply RBAC
        if (isCFO(role) || isCXOTeam(role)) {
          // full
        } else if (isAuditHead(role)) {
          where = {
            AND: [
              where,
              {
                audit: {
                  OR: [
                    { auditHeadId: userId },
                    { assignments: { some: { auditorId: userId } } },
                  ],
                },
              },
            ],
          };
        } else if (isAuditor(role)) {
          where = { AND: [where, { audit: { assignments: { some: { auditorId: userId } } } }] };
        } else if (isAuditee(role)) {
          where = { AND: [where, { assignments: { some: { auditeeId: userId } } }] };
        } else if (isGuest(role)) {
          const scope = await getUserScope(userId);
          const scopeWhere = buildScopeWhere(scope);
          const allowPublished: Prisma.ObservationWhereInput = {
            AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }],
          };
          const or: Prisma.ObservationWhereInput[] = [allowPublished];
          if (scopeWhere) or.push(scopeWhere);
          where = { AND: [where, { OR: or }] };
        }

        const take = typeof args.limit === "number" && args.limit ? args.limit : 10;
        const results = await prisma.observation.findMany({
          where,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            plant: { select: { name: true } },
            audit: { select: { title: true } },
          },
        });

        // simple similarity: number of keyword matches
        const lower = unique.map((k) => k.toLowerCase());
        const ranked = results
          .map((obs) => {
            const text = obs.observationText.toLowerCase();
            const score = lower.reduce((acc, k) => (text.includes(k) ? acc + 1 : acc), 0);
            return {
              id: obs.id,
              plant: obs.plant?.name || "Unknown Plant",
              auditTitle: obs.audit?.title || "Untitled Audit",
              similarity: score,
              excerpt: obs.observationText.slice(0, 160),
            };
          })
          .sort((a, b) => b.similarity - a.similarity);

        logToolUsage("observations_similar", session.user.id, { count: ranked.length });

        return { allowed: true, results: ranked };
      },
    }),
  } as const;

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: combinedMessages,
      tools,
    });
  } catch (error) {
    console.error("AI chat message validation failed", error);
    return Response.json({ error: "Unable to validate message history" }, { status: 400 });
  }

  const baseCount = existingMessages.length;

  const result = streamText({
    model: cerebras(process.env.AI_MODEL || "gpt-oss-120b"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(validatedMessages),
    temperature: 0,
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    onFinish: async ({ messages }) => {
      const newMessages = messages.slice(baseCount);
      if (newMessages.length === 0) return;

      try {
        await appendMessagesToSession(session.user.id, chatId, newMessages);
      } catch (error) {
        console.error("Failed to persist AI chat messages", error);
      }
    },
  });
}

