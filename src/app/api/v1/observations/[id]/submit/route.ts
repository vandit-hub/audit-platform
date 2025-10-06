import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

  // Check if auditor is assigned to this audit
  if (session!.user.role === "AUDITOR") {
    const obs = await prisma.observation.findUnique({ where: { id }, select: { auditId: true } });
    if (!obs) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const assignment = await prisma.auditAssignment.findFirst({
      where: {
        auditId: obs.auditId,
        auditorId: session!.user.id
      }
    });
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }

  const o = await prisma.observation.update({
    where: { id },
    data: { approvalStatus: "SUBMITTED" }
  });

  await prisma.approval.create({
    data: { observationId: o.id, status: "SUBMITTED", actorId: session!.user.id }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: o.id,
    action: "SUBMIT",
    actorId: session!.user.id
  });

  return NextResponse.json({ ok: true });
}