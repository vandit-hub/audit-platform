import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, isObservationInScope } from "@/lib/scope";
import { writeAuditEvent } from "@/server/auditTrail";

const updateSchema = z.object({
  plan: z.string().optional(),
  owner: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  status: z.string().nullable().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; actionId: string }> }) {
  const { id, actionId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  if (isGuest(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  if (isAuditee(session.user.role)) {
    const obs = await prisma.observation.findUnique({
      where: { id },
      select: { id: true, auditId: true }
    });
    const scoped = obs && isObservationInScope(obs, await getUserScope(session.user.id));
    if (!scoped) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const input = updateSchema.parse(await req.json());

  const updated = await prisma.actionPlan.update({
    where: { id: actionId },
    data: {
      plan: input.plan === undefined ? undefined : input.plan,
      owner: input.owner === undefined ? undefined : input.owner,
      targetDate:
        input.targetDate === undefined
          ? undefined
          : input.targetDate
          ? new Date(input.targetDate)
          : null,
      status: input.status === undefined ? undefined : input.status
    }
  });

  await writeAuditEvent({
    entityType: "ACTION_PLAN",
    entityId: updated.id,
    action: "UPDATE",
    actorId: session.user.id,
    diff: updated
  });

  return NextResponse.json({ ok: true, action: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; actionId: string }> }) {
  const { id, actionId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  // Allow delete by Admin/Auditor only
  if (!isAdminOrAuditor(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  await prisma.actionPlan.delete({ where: { id: actionId } });

  await writeAuditEvent({
    entityType: "ACTION_PLAN",
    entityId: actionId,
    action: "DELETE",
    actorId: session.user.id
  });

  return NextResponse.json({ ok: true });
}