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
  const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)));

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
  const published = searchParams.get("published") || "";

  // Build observation-level where clause for RBAC/scope (aligned with /api/v1/observations)
  const role = session.user.role;
  const userId = session.user.id;
  let observationWhere: Prisma.ObservationWhereInput = {};

  if (isCFO(role) || isCXOTeam(role)) {
    // All observations
  } else if (isAuditHead(role)) {
    observationWhere = {
      audit: {
        OR: [
          { auditHeadId: userId },
          { assignments: { some: { auditorId: userId } } }
        ]
      }
    };
  } else if (isAuditor(role)) {
    observationWhere = {
      audit: {
        assignments: { some: { auditorId: userId } }
      }
    };
  } else if (isAuditee(role)) {
    observationWhere = {
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
    observationWhere = { OR: or };
  } else {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // Build filter where clauses for observation
  const observationFilters: Prisma.ObservationWhereInput[] = [];

  if (plantId) {
    observationFilters.push({ audit: { plantId } });
  }

  if (auditId) {
    observationFilters.push({ auditId });
  }

  if (startDate || endDate) {
    const auditDateFilter: any = {};
    if (startDate && endDate) {
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
    observationFilters.push({ audit: auditDateFilter });
  }

  if (risk) {
    observationFilters.push({ riskCategory: risk as any });
  }

  if (process) {
    observationFilters.push({ concernedProcess: process as any });
  }

  if (status) {
    observationFilters.push({ currentStatus: status as any });
  }

  if (published) {
    observationFilters.push({ isPublished: published === "1" });
  }

  // Combine RBAC where, filters, and RESOLVED exclusion
  const combinedObservationWhere: Prisma.ObservationWhereInput = {
    AND: [
      observationWhere,
      { currentStatus: { not: "RESOLVED" } },
      ...observationFilters
    ]
  };

  // Base where for ActionPlan: must have targetDate
  const baseWhere: Prisma.ActionPlanWhereInput = {
    targetDate: { not: null },
    observation: combinedObservationWhere
  };

  const overdue = await prisma.actionPlan.findMany({
    where: {
      AND: [
        baseWhere,
        { targetDate: { lt: now } }
      ]
    },
    include: {
      observation: {
        include: { plant: true }
      }
    },
    orderBy: { targetDate: "asc" },
    take: limit
  });

  const dueSoon = await prisma.actionPlan.findMany({
    where: {
      AND: [
        baseWhere,
        { targetDate: { gte: now, lte: soon } }
      ]
    },
    include: {
      observation: {
        include: { plant: true }
      }
    },
    orderBy: { targetDate: "asc" },
    take: limit
  });

  return NextResponse.json({
    ok: true,
    overdue: overdue.map((ap) => ({
      id: ap.id,
      observationId: ap.observationId,
      plan: ap.plan,
      owner: ap.owner,
      targetDate: ap.targetDate,
      status: ap.status,
      retest: ap.retest,
      plant: ap.observation.plant,
      observationStatus: ap.observation.currentStatus
    })),
    dueSoon: dueSoon.map((ap) => ({
      id: ap.id,
      observationId: ap.observationId,
      plan: ap.plan,
      owner: ap.owner,
      targetDate: ap.targetDate,
      status: ap.status,
      retest: ap.retest,
      plant: ap.observation.plant,
      observationStatus: ap.observation.currentStatus
    }))
  });
}