import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isCFO, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { getUserScope, isObservationInScope } from "@/lib/scope";

const schema = z.object({
  kind: z.enum(["ANNEXURE", "MGMT_DOC"]),
  key: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().optional(),
  size: z.number().int().positive().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const input = schema.parse(await req.json());

  const obs = await prisma.observation.findUnique({
    where: { id },
    select: { id: true, auditId: true }
  });
  if (!obs) return NextResponse.json({ ok: false, error: "Observation not found" }, { status: 404 });

  // CFO can upload any attachment
  if (isCFO(session.user.role)) {
    // No checks needed - CFO has full access
  }
  // AUDIT_HEAD and AUDITOR can upload if assigned to the audit
  else if (isAuditHead(session.user.role) || isAuditor(session.user.role)) {
    const assignment = await prisma.auditAssignment.findFirst({
      where: {
        auditId: obs.auditId,
        auditorId: session.user.id
      }
    });
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }
  // AUDITEE can only upload MGMT_DOC for assigned observations
  else if (isAuditee(session.user.role)) {
    if (input.kind !== "MGMT_DOC") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const scope = await getUserScope(session.user.id);
    if (!isObservationInScope(obs, scope)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }
  // GUEST and others cannot upload
  else {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const rec = await prisma.observationAttachment.create({
    data: {
      observationId: id,
      kind: input.kind as any,
      key: input.key,
      fileName: input.fileName,
      contentType: input.contentType ?? null,
      size: input.size ?? null
    }
  });

  await writeAuditEvent({
    entityType: "ATTACHMENT",
    entityId: rec.id,
    action: "CREATE",
    actorId: session!.user.id,
    diff: rec
  });

  return NextResponse.json({ ok: true, attachment: rec });
}