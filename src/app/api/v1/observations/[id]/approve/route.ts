import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { ApprovalStatus } from "@prisma/client";

const schema = z.object({
  approve: z.boolean(),
  comment: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdmin(session?.user?.role);

  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const input = schema.parse(await req.json());

  const status = input.approve ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;

  const o = await prisma.observation.update({
    where: { id },
    data: { approvalStatus: status }
  });

  await prisma.approval.create({
    data: {
      observationId: o.id,
      status,
      comment: input.comment ?? null,
      actorId: userId
    }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: o.id,
    action: input.approve ? "APPROVE" : "REJECT",
    actorId: userId,
    diff: { comment: input.comment ?? null }
  });

  return NextResponse.json({ ok: true });
}
