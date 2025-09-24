import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor, isAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { Prisma, RiskCategory, Process, ObservationStatus } from "@prisma/client";
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
  const risk = searchParams.get("risk") || undefined;
  const process = searchParams.get("process") || undefined;
  const status = searchParams.get("status") || undefined;
  const published = searchParams.get("published"); // "1" | "0" | null
  const q = (searchParams.get("q") || "").trim();

  // Build base filters
  const filters: Prisma.ObservationWhereInput[] = [];
  if (plantId) filters.push({ plantId });
  if (risk && isRiskCategory(risk)) filters.push({ riskCategory: risk });
  if (process && isProcess(process)) filters.push({ concernedProcess: process });
  if (status && isObservationStatus(status)) filters.push({ currentStatus: status });
  if (q) {
    filters.push({
      OR: [
        { observationText: { contains: q, mode: "insensitive" } },
        { risksInvolved: { contains: q, mode: "insensitive" } },
        { auditeeFeedback: { contains: q, mode: "insensitive" } },
        { hodActionPlan: { contains: q, mode: "insensitive" } }
      ]
    });
  }
  let where: Prisma.ObservationWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  if (isAdminOrAuditor(session.user.role)) {
    // Admin/auditor can filter by published flag explicitly
    if (published === "1") where = { AND: [where, { isPublished: true }] };
    else if (published === "0") where = { AND: [where, { isPublished: false }] };
  } else {
    // Auditee/Guest: restrict by published+approved, plus any scoped access
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);

    where = { AND: [where, { OR: or }] };
  }

  const obs = await prisma.observation.findMany({
    where,
    include: {
      plant: true,
      audit: { select: { id: true, startDate: true, endDate: true } },
      attachments: true
    },
    orderBy: { createdAt: "desc" }
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
  assertAdminOrAuditor(session?.user?.role);

  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const input = createSchema.parse(body);

  const audit = await prisma.audit.findUnique({ where: { id: input.auditId } });
  if (!audit) return NextResponse.json({ ok: false, error: "Audit not found" }, { status: 404 });

  const obs = await prisma.observation.create({
    data: {
      auditId: input.auditId,
      plantId: audit.plantId,
      createdById: userId,
      observationText: input.observationText,
      risksInvolved: input.risksInvolved ?? null,
      riskCategory: input.riskCategory ?? null,
      likelyImpact: input.likelyImpact ?? null,
      concernedProcess: input.concernedProcess ?? null,
      auditorPerson: input.auditorPerson ?? null,
      auditeePersonTier1: input.auditeePersonTier1 ?? null,
      auditeePersonTier2: input.auditeePersonTier2 ?? null
    }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: obs.id,
    action: "CREATE",
    actorId: userId,
    diff: input
  });

  return NextResponse.json({ ok: true, observation: obs });
}

function isRiskCategory(value: string): value is RiskCategory {
  return (Object.values(RiskCategory) as string[]).includes(value);
}

function isProcess(value: string): value is Process {
  return (Object.values(Process) as string[]).includes(value);
}

function isObservationStatus(value: string): value is ObservationStatus {
  return (Object.values(ObservationStatus) as string[]).includes(value);
}
