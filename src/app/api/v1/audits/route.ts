import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";

const createSchema = z.object({
  plantId: z.string().min(1),
  title: z.string().optional(),
  purpose: z.string().optional(),
  visitStartDate: z.string().datetime().optional(),
  visitEndDate: z.string().datetime().optional(),
  visitDetails: z.string().optional(),
  managementResponseDate: z.string().datetime().optional(),
  finalPresentationDate: z.string().datetime().optional()
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const status = searchParams.get("status") || undefined;

  const audits = await prisma.audit.findMany({
    where: { plantId, status: status ? (status as any) : undefined },
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  // Progress from observations: group counts by auditId and status
  const auditIds = audits.map(a => a.id);
  const grouped = auditIds.length
    ? await prisma.observation.groupBy({
        by: ["auditId", "currentStatus"],
        where: { auditId: { in: auditIds } },
        _count: { _all: true }
      })
    : [];

  const totals = new Map<string, number>();
  const resolved = new Map<string, number>();
  for (const g of grouped) {
    totals.set(g.auditId, (totals.get(g.auditId) ?? 0) + g._count._all);
    if (g.currentStatus === "RESOLVED") {
      resolved.set(g.auditId, (resolved.get(g.auditId) ?? 0) + g._count._all);
    }
  }

  const shaped = audits.map((a) => ({
    id: a.id,
    plant: a.plant,
    title: a.title,
    visitStartDate: a.visitStartDate,
    visitEndDate: a.visitEndDate,
    status: a.status,
    createdAt: a.createdAt,
    assignments: a.assignments.map((as) => as.auditor),
    progress: { done: resolved.get(a.id) ?? 0, total: totals.get(a.id) ?? 0 }
  }));

  return NextResponse.json({ ok: true, audits: shaped });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const audit = await prisma.audit.create({
    data: {
      plantId: input.plantId,
      title: input.title ?? null,
      purpose: input.purpose ?? null,
      visitStartDate: input.visitStartDate ? new Date(input.visitStartDate) : null,
      visitEndDate: input.visitEndDate ? new Date(input.visitEndDate) : null,
      visitDetails: input.visitDetails ?? null,
      managementResponseDate: input.managementResponseDate ? new Date(input.managementResponseDate) : null,
      finalPresentationDate: input.finalPresentationDate ? new Date(input.finalPresentationDate) : null,
      createdById: session!.user.id
    },
    include: { plant: true }
  });

  return NextResponse.json({ ok: true, audit });
}