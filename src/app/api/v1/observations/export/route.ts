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
  const risk = searchParams.get("risk") || undefined;
  const process = searchParams.get("process") || undefined;
  const status = searchParams.get("status") || undefined;
  const published = searchParams.get("published");
  const q = (searchParams.get("q") || "").trim();

  // Base filters
  const filters: Prisma.ObservationWhereInput[] = [];
  if (plantId) filters.push({ plantId });
  if (risk) filters.push({ riskCategory: risk as any });
  if (process) filters.push({ concernedProcess: process as any });
  if (status) filters.push({ currentStatus: status as any });
  if (q) {
    filters.push({
      OR: [
        { observationText: { contains: q, mode: "insensitive" } },
        { risksInvolved: { contains: q, mode: "insensitive" } },
        { auditeeFeedback: { contains: q, mode: "insensitive" } },
        { auditorResponseToAuditee: { contains: q, mode: "insensitive" } }
      ]
    });
  }
  let where: Prisma.ObservationWhereInput =
    filters.length > 0 ? { AND: filters } : {};

  if (isAdminOrAuditor(session.user.role)) {
    if (published === "1") where = { AND: [where, { isPublished: true }] };
    else if (published === "0") where = { AND: [where, { isPublished: false }] };
  } else {
    const scope = await getUserScope(session.user.id);
    const scopeWhere = buildScopeWhere(scope);
    const allowPublished: Prisma.ObservationWhereInput = {
      AND: [{ approvalStatus: "APPROVED" }, { isPublished: true }]
    };
    const or: Prisma.ObservationWhereInput[] = [allowPublished];
    if (scopeWhere) or.push(scopeWhere);
    where = { AND: [where, { OR: or }] };
  }

  const rows = await prisma.observation.findMany({
    where,
    include: { plant: true, audit: true },
    orderBy: { createdAt: "desc" }
  });

  const header = [
    "ID","PlantCode","PlantName","AuditId","Risk","Process","Status",
    "Approval","Published","TargetDate","Owner","Observation","Risks","AuditeeFeedback","AuditorResponse"
  ];

  const body = rows.map((o) => [
    o.id,
    o.plant.code,
    o.plant.name,
    o.auditId,
    o.riskCategory ?? "",
    o.concernedProcess ?? "",
    o.currentStatus,
    o.approvalStatus,
    o.isPublished ? "Yes" : "No",
    o.targetDate ? o.targetDate.toISOString().slice(0,10) : "",
    o.personResponsibleToImplement ?? "",
    o.observationText,
    o.risksInvolved ?? "",
    o.auditeeFeedback ?? "",
    o.auditorResponseToAuditee ?? ""
  ]);

  const csv = [header, ...body].map((r) => r.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="observations.csv"'
    }
  });
}