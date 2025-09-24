import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { buildScopeWhere, getUserScope } from "@/lib/scope";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(60, parseInt(searchParams.get("days") || "14", 10)));
  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Base where (role-aware)
  let where: Prisma.ObservationWhereInput = {};
  if (!isAdminOrAuditor(session.user.role)) {
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);
    where = { OR: or };
  }

  const obs = await prisma.observation.findMany({
    where,
    select: {
      id: true,
      riskCategory: true,
      currentStatus: true,
      approvalStatus: true,
      isPublished: true,
      targetDate: true
    }
  });

  const total = obs.length;
  const statusCounts = { PENDING: 0, IN_PROGRESS: 0, RESOLVED: 0 } as Record<string, number>;
  const approvalCounts = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>;
  const byRisk = { A: 0, B: 0, C: 0 } as Record<string, number>;

  let published = 0, unpublished = 0, overdue = 0, dueSoon = 0;

  for (const o of obs) {
    if (o.currentStatus) statusCounts[o.currentStatus] = (statusCounts[o.currentStatus] || 0) + 1;
    if (o.approvalStatus) approvalCounts[o.approvalStatus] = (approvalCounts[o.approvalStatus] || 0) + 1;
    if (o.riskCategory) byRisk[o.riskCategory] = (byRisk[o.riskCategory] || 0) + 1;
    if (o.isPublished) published++; else unpublished++;
    if (o.targetDate && o.currentStatus !== "RESOLVED") {
      if (o.targetDate < now) overdue++;
      else if (o.targetDate <= soon) dueSoon++;
    }
  }

  return NextResponse.json({
    ok: true,
    total,
    statusCounts,
    approvalCounts,
    byRisk,
    published: { published, unpublished },
    due: { overdue, dueSoon, windowDays: days }
  });
}