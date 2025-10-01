import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";

const updateSchema = z.object({
  title: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  visitStartDate: z.string().datetime().nullable().optional(),
  visitEndDate: z.string().datetime().nullable().optional(),
  visitDetails: z.string().nullable().optional(),
  managementResponseDate: z.string().datetime().nullable().optional(),
  finalPresentationDate: z.string().datetime().nullable().optional(),
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
      assignments: { include: { auditor: { select: { id: true, name: true, email: true, role: true } } } }
    }
  });

  if (!audit) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const [total, done] = await Promise.all([
    prisma.observation.count({ where: { auditId: id } }),
    prisma.observation.count({ where: { auditId: id, currentStatus: "RESOLVED" } })
  ]);

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
      title: input.title === undefined ? undefined : input.title,
      purpose: input.purpose === undefined ? undefined : input.purpose,
      visitStartDate: input.visitStartDate === undefined ? undefined : input.visitStartDate ? new Date(input.visitStartDate) : null,
      visitEndDate: input.visitEndDate === undefined ? undefined : input.visitEndDate ? new Date(input.visitEndDate) : null,
      visitDetails: input.visitDetails === undefined ? undefined : input.visitDetails,
      managementResponseDate: input.managementResponseDate === undefined ? undefined : input.managementResponseDate ? new Date(input.managementResponseDate) : null,
      finalPresentationDate: input.finalPresentationDate === undefined ? undefined : input.finalPresentationDate ? new Date(input.finalPresentationDate) : null,
      status: input.status,
      reportSubmittedAt:
        input.reportSubmittedAt === undefined ? undefined : input.reportSubmittedAt ? new Date(input.reportSubmittedAt) : null,
      signOffAt:
        input.signOffAt === undefined ? undefined : input.signOffAt ? new Date(input.signOffAt) : null
    }
  });

  return NextResponse.json({ ok: true, audit: updated });
}