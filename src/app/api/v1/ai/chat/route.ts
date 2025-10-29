import { NextRequest } from "next/server";
import { cerebras } from "@ai-sdk/cerebras";
import { streamText, tool, stepCountIs, convertToModelMessages } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
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
- Help users query and understand their audit observations and audits data
- Provide concise, factual answers based on the tools available to you
- Always use tools to fetch real data rather than making assumptions
- Be aware that users have different permission levels (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)

Guidelines:
- Keep answers brief and to the point unless asked for more detail
- When a tool returns "allowed: false", politely explain the RBAC limitation
- If filters are ambiguous, ask one clarifying question
- Present counts and lists clearly
- Use bullet points or numbered lists for multiple items
- When listing observations, include key details like approval status, risk, and audit title

Tool usage rules:
- Always call a tool to answer data questions.
- For requests like "how many" or "count", use observations_count or audits_count.
- For requests like "list" or "show", use observations_list or audits_list with appropriate filters (e.g. risk=A).

Role Permissions Context:
- CFO and CXO_TEAM: Can see all audits and observations
- AUDIT_HEAD: Can see audits they lead and observations from their audits
- AUDITOR: Can see audits they're assigned to and observations from those audits
- AUDITEE: Can only see observations they're assigned to (no audit listing access)
- GUEST: Read-only access to published and approved content only

Available observation statuses:
- Approval Status: DRAFT, SUBMITTED, APPROVED, REJECTED
- Current Status: OPEN, IN_PROGRESS, RESOLVED, CLOSED

Risk Categories: A (high), B (medium), C (low)
Processes: O2C (Order to Cash), P2P (Procure to Pay), R2R (Record to Report), INVENTORY`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: cerebras(process.env.AI_MODEL || "gpt-oss-120b"),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    // One tool call + one summarization step keeps responses crisp
    stopWhen: stepCountIs(3),
    tools: {
      // ========================================================================
      // TOOL 1: Count observations with filters
      // ========================================================================
      observations_count: tool({
        description:
          "Count the number of observations the user can access. Supports filtering by approval status (DRAFT/SUBMITTED/APPROVED/REJECTED), current status (OPEN/IN_PROGRESS/RESOLVED/CLOSED), audit ID, plant ID, risk category (A/B/C), process (O2C/P2P/R2R/INVENTORY), and text search query.",
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

          // Build base filters from arguments
          const filters: Prisma.ObservationWhereInput[] = [];
          if (args.approvalStatus)
            filters.push({ approvalStatus: args.approvalStatus });
          if (args.currentStatus)
            filters.push({ currentStatus: args.currentStatus as any });
          if (args.auditId) filters.push({ auditId: args.auditId });
          if (args.plantId) filters.push({ plantId: args.plantId });
          if (args.risk) filters.push({ riskCategory: args.risk as any });
          if (args.process)
            filters.push({ concernedProcess: args.process as any });
          if (args.q) {
            filters.push({
              OR: [
                { observationText: { contains: args.q, mode: "insensitive" } },
                { risksInvolved: { contains: args.q, mode: "insensitive" } },
                { auditeeFeedback: { contains: args.q, mode: "insensitive" } },
              ],
            });
          }

          let where: Prisma.ObservationWhereInput =
            filters.length > 0 ? { AND: filters } : {};

          // Apply RBAC filtering (same logic as GET /api/v1/observations)
          if (isCFO(role) || isCXOTeam(role)) {
            // CFO and CXO_TEAM see all observations
          } else if (isAuditHead(role)) {
            // AUDIT_HEAD sees observations from audits where they are audit head OR assigned as auditor
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
            // AUDITOR sees observations from audits they're assigned to
            const auditorFilter: Prisma.ObservationWhereInput = {
              audit: {
                assignments: { some: { auditorId: userId } },
              },
            };
            where = { AND: [where, auditorFilter] };
          } else if (isAuditee(role)) {
            // AUDITEE sees only observations they're assigned to
            const auditeeFilter: Prisma.ObservationWhereInput = {
              assignments: { some: { auditeeId: userId } },
            };
            where = { AND: [where, auditeeFilter] };
          } else if (isGuest(role)) {
            // GUEST sees only published+approved or scoped observations
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

          // Build base filters (same logic as observations_count)
          const filters: Prisma.ObservationWhereInput[] = [];
          if (args.approvalStatus)
            filters.push({ approvalStatus: args.approvalStatus });
          if (args.currentStatus)
            filters.push({ currentStatus: args.currentStatus as any });
          if (args.auditId) filters.push({ auditId: args.auditId });
          if (args.plantId) filters.push({ plantId: args.plantId });
          if (args.risk) filters.push({ riskCategory: args.risk as any });
          if (args.process)
            filters.push({ concernedProcess: args.process as any });
          if (args.q) {
            filters.push({
              OR: [
                { observationText: { contains: args.q, mode: "insensitive" } },
                { risksInvolved: { contains: args.q, mode: "insensitive" } },
                { auditeeFeedback: { contains: args.q, mode: "insensitive" } },
              ],
            });
          }

          let where: Prisma.ObservationWhereInput =
            filters.length > 0 ? { AND: filters } : {};

          // Apply RBAC filtering
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

          // AUDITEE and GUEST have no access to audit listing
          if (isAuditee(role) || isGuest(role)) {
            return {
              allowed: false,
              reason:
                "Your role (AUDITEE/GUEST) does not have access to audit listings. You can only view observations assigned to you.",
            };
          }

          // Build where clause
          const where: any = {
            plantId: args.plantId,
            status: args.status,
          };

          // Apply role-based filtering
          if (isCFO(role) || isCXOTeam(role)) {
            // See all audits
          } else if (isAuditHead(role)) {
            // See audits they lead or assigned audits
            where.OR = [
              { auditHeadId: userId },
              { assignments: { some: { auditorId: userId } } },
            ];
          } else if (isAuditor(role)) {
            // See assigned audits
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

          // AUDITEE and GUEST have no access
          if (isAuditee(role) || isGuest(role)) {
            return {
              allowed: false,
              reason:
                "Your role (AUDITEE/GUEST) does not have access to audit listings.",
            };
          }

          // Build where clause
          const where: any = {
            plantId: args.plantId,
            status: args.status,
          };

          // Apply role-based filtering (same as audits GET route)
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

          // Apply visibility rules for AUDIT_HEAD and AUDITOR
          let filteredAudits = audits;
          if (isAuditHead(role) || isAuditor(role)) {
            filteredAudits = audits.filter((audit) => {
              // If user is assigned, always show
              if (isAuditHead(role) && audit.auditHeadId === userId)
                return true;
              if (
                isAuditor(role) &&
                audit.assignments.some((a) => a.auditorId === userId)
              )
                return true;

              // Otherwise check visibility rules
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

          // Get progress counts
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
              resolved.set(
                g.auditId,
                (resolved.get(g.auditId) ?? 0) + g._count._all
              );
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
              assignedAuditors: audit.assignments.map((a) => ({
                name: a.auditor.name,
                email: a.auditor.email,
              })),
              progress: {
                total: totals.get(audit.id) ?? 0,
                resolved: resolved.get(audit.id) ?? 0,
              },
            })),
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}

