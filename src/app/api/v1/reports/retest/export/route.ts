import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { isAdminOrAuditor } from "@/lib/rbac";
import { buildScopeWhere, getUserScope } from "@/lib/scope";
import { Prisma } from "@prisma/client";

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const auditId = searchParams.get("auditId") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const risk = searchParams.get("risk") || undefined;
  const process = searchParams.get("process") || undefined;
  const status = searchParams.get("status") || undefined;
  const published = searchParams.get("published");

  // Build observation filters for RBAC and user-provided filters
  const observationFilters: Prisma.ObservationWhereInput[] = [];
  if (plantId) observationFilters.push({ plantId });
  if (auditId) observationFilters.push({ auditId });
  if (risk) observationFilters.push({ riskCategory: risk as any });
  if (process) observationFilters.push({ concernedProcess: process as any });
  if (status) observationFilters.push({ currentStatus: status as any });

  // Date range filter (audit period overlap logic)
  if (startDate || endDate) {
    const auditDateFilter: Prisma.AuditWhereInput = {};
    if (startDate && endDate) {
      auditDateFilter.OR = [
        { visitStartDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { visitEndDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { AND: [{ visitStartDate: { lte: new Date(startDate) } }, { visitEndDate: { gte: new Date(endDate) } }] }
      ];
    } else if (startDate) {
      auditDateFilter.visitStartDate = { gte: new Date(startDate) };
    } else if (endDate) {
      auditDateFilter.visitEndDate = { lte: new Date(endDate) };
    }
    observationFilters.push({ audit: auditDateFilter });
  }

  let observationWhere: Prisma.ObservationWhereInput =
    observationFilters.length > 0 ? { AND: observationFilters } : {};

  // RBAC filtering at observation level
  if (isAdminOrAuditor(session.user.role)) {
    if (published === "1") observationWhere = { AND: [observationWhere, { isPublished: true }] };
    else if (published === "0") observationWhere = { AND: [observationWhere, { isPublished: false }] };
  } else {
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);
    observationWhere = { AND: [observationWhere, { OR: or }] };
  }

  // Query action plans with retest status
  const actionPlans = await prisma.actionPlan.findMany({
    where: {
      retest: { not: null },
      observation: observationWhere
    },
    include: {
      observation: {
        include: {
          plant: true,
          audit: true
        }
      }
    },
    orderBy: { targetDate: "asc" }
  });

  const header = [
    "ObservationID",
    "ObservationTitle",
    "PlantCode",
    "PlantName",
    "AuditTitle",
    "ActionPlan",
    "Owner",
    "TargetDate",
    "RetestStatus",
    "ObservationStatus"
  ];

  const body = actionPlans.map((ap) => [
    ap.observation.id,
    ap.observation.observationText.substring(0, 100) + (ap.observation.observationText.length > 100 ? "..." : ""),
    ap.observation.plant.code,
    ap.observation.plant.name,
    ap.observation.audit.title ?? "",
    ap.plan,
    ap.owner,
    ap.targetDate ? ap.targetDate.toISOString().slice(0, 10) : "",
    ap.retest ?? "",
    ap.observation.currentStatus
  ]);

  const csv = [header, ...body].map((r) => r.map(csvEscape).join(",")).join("\n");

  // Generate filename
  let filename = "retest-report";
  if (startDate && endDate) {
    filename = `retest-report-${startDate}-to-${endDate}.csv`;
  } else if (startDate) {
    filename = `retest-report-from-${startDate}.csv`;
  } else if (endDate) {
    filename = `retest-report-until-${endDate}.csv`;
  } else {
    filename = "retest-report.csv";
  }

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`
    }
  });
}
