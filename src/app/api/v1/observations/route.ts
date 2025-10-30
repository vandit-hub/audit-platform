import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAuditorOrAuditHead, isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { Prisma } from "@prisma/client";
import { buildScopeWhere, getUserScope } from "@/lib/scope";

const createSchema = z.object({
  auditId: z.string().min(1),
  observationText: z.string().min(1),
  risksInvolved: z.string().optional(),
  riskCategory: z.enum(["A", "B", "C"]).optional(),
  likelyImpact: z.enum(["LOCAL", "ORG_WIDE"]).optional(),
  concernedProcess: z.enum(["O2C", "P2P", "R2R", "INVENTORY"]).optional(),
  auditorPerson: z.string().optional(),
  auditeePersonTier1: z.string().optional(),
  auditeePersonTier2: z.string().optional()
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const auditId = searchParams.get("auditId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const risk = searchParams.get("risk") || undefined;
  const process = searchParams.get("process") || undefined;
  const status = searchParams.get("status") || undefined;
  const published = searchParams.get("published"); // "1" | "0" | null
  const q = (searchParams.get("q") || "").trim();

  // Sorting parameters
  const allowedSortFields = ["createdAt", "updatedAt", "riskCategory", "currentStatus", "approvalStatus"];
  const sortBy = allowedSortFields.includes(searchParams.get("sortBy") || "")
    ? (searchParams.get("sortBy") as string)
    : "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  // Build base filters
  const filters: Prisma.ObservationWhereInput[] = [];
  if (plantId) filters.push({ plantId });
  if (auditId) filters.push({ auditId });
  if (risk) filters.push({ riskCategory: risk as any });
  if (process) filters.push({ concernedProcess: process as any });
  if (status) filters.push({ currentStatus: status as any });

  // Date range filter (audit period overlap logic)
  if (startDate || endDate) {
    const auditDateFilter: Prisma.AuditWhereInput = {};
    if (startDate && endDate) {
      // Audit period overlaps with filter range if:
      // - Audit visitStartDate within range OR
      // - Audit visitEndDate within range OR
      // - Audit period encompasses the filter range
      auditDateFilter.OR = [
        { visitStartDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { visitEndDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { AND: [{ visitStartDate: { lte: new Date(startDate) } }, { visitEndDate: { gte: new Date(endDate) } }] }
      ];
    } else if (startDate) {
      // Only start date provided - audit visit must start on or after this date
      auditDateFilter.visitStartDate = { gte: new Date(startDate) };
    } else if (endDate) {
      // Only end date provided - audit visit must end on or before this date
      auditDateFilter.visitEndDate = { lte: new Date(endDate) };
    }
    filters.push({ audit: auditDateFilter });
  }

  if (q) {
    filters.push({
      OR: [
        { observationText: { contains: q, mode: "insensitive" } },
        { risksInvolved: { contains: q, mode: "insensitive" } },
        { auditeeFeedback: { contains: q, mode: "insensitive" } },
        { auditorResponseToAuditee: { contains: q, mode: "insensitive" } }
      ]
    });
  }
  let where: Prisma.ObservationWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  // CFO and CXO_TEAM can see all observations
  if (isCFO(session.user.role) || isCXOTeam(session.user.role)) {
    if (published === "1") where = { AND: [where, { isPublished: true }] };
    else if (published === "0") where = { AND: [where, { isPublished: false }] };
  }
  // AUDIT_HEAD can see observations from audits where they are the audit head OR assigned as auditor
  else if (isAuditHead(session.user.role)) {
    const auditHeadFilter: Prisma.ObservationWhereInput = {
      audit: {
        OR: [
          { auditHeadId: session.user.id }, // Audits where they are the audit head
          { assignments: { some: { auditorId: session.user.id } } } // Audits where they're assigned as auditor
        ]
      }
    };
    where = { AND: [where, auditHeadFilter] };

    // Audit heads can also filter by published flag
    if (published === "1") where = { AND: [where, { isPublished: true }] };
    else if (published === "0") where = { AND: [where, { isPublished: false }] };
  }
  // AUDITOR can see observations from audits they're assigned to
  else if (isAuditor(session.user.role)) {
    const auditorFilter: Prisma.ObservationWhereInput = {
      audit: {
        assignments: {
          some: {
            auditorId: session.user.id
          }
        }
      }
    };
    where = { AND: [where, auditorFilter] };

    // Auditors can also filter by published flag
    if (published === "1") where = { AND: [where, { isPublished: true }] };
    else if (published === "0") where = { AND: [where, { isPublished: false }] };
  }
  // AUDITEE can see only observations they're assigned to via ObservationAssignment
  else if (isAuditee(session.user.role)) {
    const auditeeFilter: Prisma.ObservationWhereInput = {
      assignments: {
        some: {
          auditeeId: session.user.id
        }
      }
    };
    where = { AND: [where, auditeeFilter] };
  }
  // GUEST: restrict by published+approved, plus any scoped access
  else if (isGuest(session.user.role)) {
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    where = { AND: [where, { OR: or }] };
  }
  // Defensive default: if role is missing/unknown, deny access
  else {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const obs = await prisma.observation.findMany({
    where,
    include: {
      plant: true,
      audit: { select: { id: true, title: true, visitStartDate: true, visitEndDate: true } },
      attachments: true
    },
    orderBy: { [sortBy]: sortOrder }
  });

  const shaped = obs.map((o) => ({
    id: o.id,
    plant: o.plant,
    audit: o.audit,
    riskCategory: o.riskCategory,
    concernedProcess: o.concernedProcess,
    currentStatus: o.currentStatus,
    approvalStatus: o.approvalStatus,
    isPublished: o.isPublished,
    createdAt: o.createdAt,
    title: o.observationText.slice(0, 120),
    annexures: o.attachments.filter((a) => a.kind === "ANNEXURE").length,
    mgmtDocs: o.attachments.filter((a) => a.kind === "MGMT_DOC").length
  }));

  return NextResponse.json({ ok: true, observations: shaped });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  assertAuditorOrAuditHead(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const audit = await prisma.audit.findUnique({ where: { id: input.auditId } });
  if (!audit) return NextResponse.json({ ok: false, error: "Audit not found" }, { status: 404 });

  const obs = await prisma.observation.create({
    data: {
      auditId: input.auditId,
      plantId: audit.plantId,
      createdById: session!.user.id,
      observationText: input.observationText,
      risksInvolved: input.risksInvolved ?? null,
      riskCategory: input.riskCategory as any,
      likelyImpact: input.likelyImpact as any,
      concernedProcess: input.concernedProcess as any,
      auditorPerson: input.auditorPerson ?? null,
      auditeePersonTier1: input.auditeePersonTier1 ?? null,
      auditeePersonTier2: input.auditeePersonTier2 ?? null
    }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: obs.id,
    action: "CREATE",
    actorId: session!.user.id,
    diff: input
  });

  return NextResponse.json({ ok: true, observation: obs });
}