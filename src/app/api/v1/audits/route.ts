import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";

const createSchema = z.object({
  plantId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  visitDetails: z.string().optional()
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const plantId = searchParams.get("plantId") || undefined;
  const status = searchParams.get("status") || undefined;

  const audits = await prisma.audit.findMany({
    where: {
      plantId,
      status: status ? (status as any) : undefined
    },
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true } } } },
      auditChecklists: {
        include: { items: true, checklist: { select: { id: true, name: true } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const shaped = audits.map((a) => {
    const total = a.auditChecklists.reduce((acc, ac) => acc + ac.items.length, 0);
    const done = a.auditChecklists.reduce(
      (acc, ac) => acc + ac.items.filter((i) => i.status === "DONE").length,
      0
    );
    return {
      id: a.id,
      plant: a.plant,
      startDate: a.startDate,
      endDate: a.endDate,
      status: a.status,
      createdAt: a.createdAt,
      assignments: a.assignments.map((as) => as.auditor),
      progress: { done, total }
    };
  });

  return NextResponse.json({ ok: true, audits: shaped });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const audit = await prisma.audit.create({
    data: {
      plantId: input.plantId,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      visitDetails: input.visitDetails ?? null,
      createdById: session!.user.id
    },
    include: { plant: true }
  });

  return NextResponse.json({ ok: true, audit });
}