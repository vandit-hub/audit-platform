import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { isCFO, isCXOTeam, isAuditHead, isAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { buildScopeWhere, getUserScope } from "@/lib/scope";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.max(1, Math.min(60, parseInt(searchParams.get("days") || "14", 10)));
  const now = new Date();
  const soon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Extract filter parameters
  const plantId = searchParams.get("plantId") || "";
  const auditId = searchParams.get("auditId") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const risk = searchParams.get("risk") || "";
  const process = searchParams.get("process") || "";
  const status = searchParams.get("status") || "";
  const publishedFilter = searchParams.get("published") || "";

  // Base where (role-aware, aligned with /api/v1/observations RBAC)
  const role = session.user.role;
  const userId = session.user.id;
  let baseWhere: Prisma.ObservationWhereInput = {};

  if (isCFO(role) || isCXOTeam(role)) {
    // CFO and CXO_TEAM see all observations
  } else if (isAuditHead(role)) {
    baseWhere = {
      audit: {
        OR: [
          { auditHeadId: userId },
          { assignments: { some: { auditorId: userId } } }
        ]
      }
    };
  } else if (isAuditor(role)) {
    baseWhere = {
      audit: {
        assignments: { some: { auditorId: userId } }
      }
    };
  } else if (isAuditee(role)) {
    baseWhere = {
      assignments: { some: { auditeeId: userId } }
    };
  } else if (isGuest(role)) {
    const scope = await getUserScope(userId);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);
    baseWhere = { OR: or };
  } else {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Build filter where clauses
  const filterClauses: Prisma.ObservationWhereInput[] = [];

  if (plantId) {
    filterClauses.push({ audit: { plantId } });
  }

  if (auditId) {
    filterClauses.push({ auditId });
  }

  if (startDate || endDate) {
    const auditDateFilter: any = {};
    if (startDate && endDate) {
      // Audit period overlaps with filter range
      auditDateFilter.OR = [
        { visitStartDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { visitEndDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { AND: [{ visitStartDate: { lte: new Date(startDate) } }, { visitEndDate: { gte: new Date(endDate) } }] }
      ];
    } else if (startDate) {
      auditDateFilter.OR = [
        { visitStartDate: { gte: new Date(startDate) } },
        { visitEndDate: { gte: new Date(startDate) } }
      ];
    } else if (endDate) {
      auditDateFilter.OR = [
        { visitStartDate: { lte: new Date(endDate) } },
        { visitEndDate: { lte: new Date(endDate) } }
      ];
    }
    filterClauses.push({ audit: auditDateFilter });
  }

  if (risk) {
    filterClauses.push({ riskCategory: risk as any });
  }

  if (process) {
    filterClauses.push({ concernedProcess: process as any });
  }

  if (status) {
    filterClauses.push({ currentStatus: status as any });
  }

  if (publishedFilter) {
    filterClauses.push({ isPublished: publishedFilter === "1" });
  }

  // Combine base where with filters
  const where: Prisma.ObservationWhereInput = filterClauses.length > 0
    ? { AND: [baseWhere, ...filterClauses] }
    : baseWhere;

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
    if (o.riskCategory && o.currentStatus !== "RESOLVED") byRisk[o.riskCategory] = (byRisk[o.riskCategory] || 0) + 1;
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