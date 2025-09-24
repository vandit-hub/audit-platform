import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { isAdminOrAuditor } from "@/lib/rbac";
import { buildScopeWhere, getUserScope } from "@/lib/scope";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(60, parseInt(searchParams.get("days") || "14", 10)));
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));

  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  let baseWhere: Prisma.ObservationWhereInput = { targetDate: { not: null } };
  if (!isAdminOrAuditor(session.user.role)) {
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);
    baseWhere = { AND: [baseWhere, { OR: or }] };
  }

  const overdue = await prisma.observation.findMany({
    where: {
      AND: [
        baseWhere,
        { currentStatus: { not: "RESOLVED" } },
        { targetDate: { lt: now } }
      ]
    },
    include: { plant: true },
    orderBy: { targetDate: "asc" },
    take: limit
  });

  const dueSoon = await prisma.observation.findMany({
    where: {
      AND: [
        baseWhere,
        { currentStatus: { not: "RESOLVED" } },
        { targetDate: { gte: now, lte: soon } }
      ]
    },
    include: { plant: true },
    orderBy: { targetDate: "asc" },
    take: limit
  });

  return NextResponse.json({
    ok: true,
    overdue: overdue.map((o) => ({
      id: o.id,
      plant: o.plant,
      targetDate: o.targetDate,
      status: o.currentStatus,
      owner: o.personResponsibleToImplement ?? null,
      plan: o.hodActionPlan ?? null
    })),
    dueSoon: dueSoon.map((o) => ({
      id: o.id,
      plant: o.plant,
      targetDate: o.targetDate,
      status: o.currentStatus,
      owner: o.personResponsibleToImplement ?? null,
      plan: o.hodActionPlan ?? null
    }))
  });
}