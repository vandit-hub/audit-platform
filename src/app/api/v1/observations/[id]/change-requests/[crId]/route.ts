import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const decideSchema = z.object({
  approve: z.boolean(),
  decisionComment: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; crId: string }> }) {
  const { id, crId } = await params;
  const session = await auth();
  assertAdmin(session?.user?.role);

  const { approve, decisionComment } = decideSchema.parse(await req.json());

  const cr = await prisma.observationChangeRequest.findUnique({
    where: { id: crId },
    include: { observation: true }
  });
  if (!cr || cr.observationId !== id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  if (cr.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Already decided" }, { status: 400 });
  }

  if (approve) {
    // Apply the patch. Admin bypasses locks.
    // Only allow fields that exist on Observation and are editable by our schema.
    const allowed = new Set([
      "observationText","risksInvolved","riskCategory","likelyImpact","concernedProcess","auditorPerson",
      "auditeePersonTier1","auditeePersonTier2","auditeeFeedback","hodActionPlan",
      "targetDate","personResponsibleToImplement","currentStatus"
    ]);

    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(cr.patch as Record<string, unknown>)) {
      if (!allowed.has(k)) continue;
      if (k === "targetDate") {
        data[k] = v ? new Date(String(v)) : null;
      } else {
        data[k] = v as any;
      }
    }

    const before = await prisma.observation.findUnique({ where: { id } });
    const updated = await prisma.observation.update({ where: { id }, data });

    await prisma.observationChangeRequest.update({
      where: { id: crId },
      data: {
        status: "APPROVED",
        decidedById: session!.user.id,
        decidedAt: new Date(),
        decisionComment: decisionComment ?? null
      }
    });

    await writeAuditEvent({
      entityType: "OBSERVATION",
      entityId: id,
      action: "CHANGE_REQUEST_APPROVE",
      actorId: session!.user.id,
      diff: { requestId: crId, patch: cr.patch, before, after: updated, decisionComment: decisionComment ?? null }
    });

    return NextResponse.json({ ok: true });
  } else {
    await prisma.observationChangeRequest.update({
      where: { id: crId },
      data: {
        status: "DENIED",
        decidedById: session!.user.id,
        decidedAt: new Date(),
        decisionComment: decisionComment ?? null
      }
    });

    await writeAuditEvent({
      entityType: "OBSERVATION",
      entityId: id,
      action: "CHANGE_REQUEST_DENY",
      actorId: session!.user.id,
      diff: { requestId: crId, decisionComment: decisionComment ?? null }
    });

    return NextResponse.json({ ok: true });
  }
}