import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, isObservationInScope } from "@/lib/scope";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  plan: z.string().min(1),
  owner: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.string().optional(),
  retest: z.enum(["RETEST_DUE", "PASS", "FAIL"]).optional()
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  // Restrict for auditee/guest: published+approved OR in scope
  const obs = await prisma.observation.findUnique({
    where: { id },
    select: { id: true, auditId: true, approvalStatus: true, isPublished: true }
  });
  if (!obs) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Check if auditor is assigned to this audit
  if (session.user.role === "AUDITOR") {
    const assignment = await prisma.auditAssignment.findFirst({
      where: {
        auditId: obs.auditId,
        auditorId: session.user.id
      }
    });
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  } else if (isAuditee(session.user.role) || isGuest(session.user.role)) {
    const scoped = isObservationInScope(obs, await getUserScope(session.user.id));
    const allowed = scoped || (obs.approvalStatus === "APPROVED" && obs.isPublished);
    if (!allowed) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const list = await prisma.actionPlan.findMany({
    where: { observationId: id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ ok: true, actions: list });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  // Admin/Auditor can always create. Auditee can create only if in scope. Guest cannot create.
  if (isGuest(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const obs = await prisma.observation.findUnique({
    where: { id },
    select: {
      id: true,
      auditId: true,
      assignments: {
        select: {
          auditeeId: true
        }
      }
    }
  });
  if (!obs) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Check if auditor is assigned to this audit
  if (session.user.role === "AUDITOR") {
    const assignment = await prisma.auditAssignment.findFirst({
      where: {
        auditId: obs.auditId,
        auditorId: session.user.id
      }
    });
    if (!assignment) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  } else if (isAuditee(session.user.role)) {
    const hasAssignment = obs.assignments.some(a => a.auditeeId === session.user.id);
    if (!hasAssignment) {
      return NextResponse.json({ ok: false, error: "You are not assigned to this observation" }, { status: 403 });
    }
  }

  const body = await req.json();
  const input = createSchema.parse(body);

  // RBAC: Only admin/auditor can set retest field
  if (input.retest && !isAdminOrAuditor(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Only admin/auditor can set retest" }, { status: 403 });
  }

  // Auto-trigger: When status is "Completed", auto-set retest to "RETEST_DUE" if not provided
  const retestValue = input.retest ?? (input.status === "Completed" ? "RETEST_DUE" : null);

  const act = await prisma.actionPlan.create({
    data: {
      observationId: id,
      plan: input.plan,
      owner: input.owner ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
      status: input.status ?? null,
      retest: retestValue
    }
  });

  await writeAuditEvent({
    entityType: "ACTION_PLAN",
    entityId: act.id,
    action: "CREATE",
    actorId: session.user.id,
    diff: act
  });

  return NextResponse.json({ ok: true, action: act });
}