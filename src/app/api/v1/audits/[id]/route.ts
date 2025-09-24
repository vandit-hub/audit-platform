import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor, assertAdmin } from "@/lib/rbac";

const updateSchema = z.object({
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  visitDetails: z.string().nullable().optional(),
  status: z.enum(["PLANNED", "IN_PROGRESS", "SUBMITTED", "SIGNED_OFF"]).optional(),
  reportSubmittedAt: z.string().datetime().nullable().optional(),
  signOffAt: z.string().datetime().nullable().optional()
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      plant: true,
      assignments: { include: { auditor: { select: { id: true, name: true, email: true, role: true } } } },
      auditChecklists: {
        include: {
          checklist: true,
          items: { orderBy: { createdAt: "asc" } }
        }
      }
    }
  });

  if (!audit) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const total = audit.auditChecklists.reduce((acc, ac) => acc + ac.items.length, 0);
  const done = audit.auditChecklists.reduce(
    (acc, ac) => acc + ac.items.filter((i) => i.status === "DONE").length,
    0
  );

  return NextResponse.json({
    ok: true,
    audit,
    progress: { done, total }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

  const body = await req.json();
  const input = updateSchema.parse(body);

  const updated = await prisma.audit.update({
    where: { id },
    data: {
      startDate: input.startDate === undefined ? undefined : input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate === undefined ? undefined : input.endDate ? new Date(input.endDate) : null,
      visitDetails: input.visitDetails === undefined ? undefined : input.visitDetails,
      status: input.status,
      reportSubmittedAt:
        input.reportSubmittedAt === undefined ? undefined : input.reportSubmittedAt ? new Date(input.reportSubmittedAt) : null,
      signOffAt:
        input.signOffAt === undefined ? undefined : input.signOffAt ? new Date(input.signOffAt) : null
    }
  });

  return NextResponse.json({ ok: true, audit: updated });
}