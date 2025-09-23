import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  approve: z.boolean(),
  comment: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const input = schema.parse(await req.json());

  const status = input.approve ? "APPROVED" : "REJECTED";

  const o = await prisma.observation.update({
    where: { id: params.id },
    data: { approvalStatus: status as any }
  });

  await prisma.approval.create({
    data: { observationId: o.id, status: status as any, comment: input.comment ?? null, actorId: session!.user.id }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: o.id,
    action: input.approve ? "APPROVE" : "REJECT",
    actorId: session!.user.id,
    diff: { comment: input.comment ?? null }
  });

  return NextResponse.json({ ok: true });
}