import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor, isAuditee } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

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
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const risk = searchParams.get("risk") || undefined;
  const process = searchParams.get("process") || undefined;
  const status = searchParams.get("status") || undefined;
  const published = searchParams.get("published") || undefined;

  const where: any = {
    plantId: plantId ?? undefined,
    riskCategory: risk ?? undefined,
    concernedProcess: process ?? undefined,
    currentStatus: status ?? undefined
  };

  // Auditee can only see approved & published observations
  if (isAuditee(session.user.role)) {
    where.approvalStatus = "APPROVED";
    where.isPublished = true;
  } else if (published != null) {
    where.isPublished = published === "1";
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
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

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