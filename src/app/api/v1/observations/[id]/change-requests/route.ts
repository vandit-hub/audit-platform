import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { canAuthorObservations, isAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  patch: z.record(z.string(), z.any()),
  comment: z.string().optional()
});

const AUDITOR_FIELDS = new Set([
  "observationText",
  "risksInvolved",
  "riskCategory",
  "likelyImpact",
  "concernedProcess",
  "auditorPerson"
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!canAuthorObservations(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const list = await prisma.observationChangeRequest.findMany({
    where: { observationId: id },
    include: {
      requester: { select: { email: true, name: true } },
      decidedBy: { select: { email: true, name: true} }
    },
    orderBy: { createdAt: "desc" }
  });

  const shaped = list.map(cr => ({
    id: cr.id,
    patch: cr.patch as Record<string, unknown>,
    comment: cr.comment ?? null,
    status: cr.status,
    requester: cr.requester,
    decidedBy: cr.decidedBy,
    decidedAt: cr.decidedAt ? cr.decidedAt.toISOString() : null,
    decisionComment: cr.decisionComment ?? null,
    createdAt: cr.createdAt.toISOString()
  }));

  return NextResponse.json({ ok: true, requests: shaped });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  if (!canAuthorObservations(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const userIsAuditor = isAuditor(session.user.role);

  const obs = await prisma.observation.findUnique({ where: { id } });
  if (!obs) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (obs.approvalStatus !== "APPROVED" && userIsAuditor) {
    return NextResponse.json({ ok: false, error: "Change request only for approved observations" }, { status: 400 });
  }

  const { patch, comment } = createSchema.parse(await req.json());

  // Restrict patch keys for auditors
  if (userIsAuditor) {
    for (const k of Object.keys(patch)) {
      if (!AUDITOR_FIELDS.has(k)) {
        return NextResponse.json({ ok: false, error: `Field "${k}" not allowed in change request` }, { status: 400 });
      }
    }
  }

  const cr = await prisma.observationChangeRequest.create({
    data: {
      observationId: id,
      requesterId: session.user.id,
      patch: patch as any,
      comment: comment ?? null
    }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "CHANGE_REQUEST_CREATE",
    actorId: session.user.id,
    diff: { requestId: cr.id, patch, comment: comment ?? null }
  });

  return NextResponse.json({ ok: true, requestId: cr.id });
}