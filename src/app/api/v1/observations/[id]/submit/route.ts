import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

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