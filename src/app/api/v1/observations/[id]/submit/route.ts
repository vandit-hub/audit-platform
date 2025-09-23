import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const o = await prisma.observation.update({
    where: { id: params.id },
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