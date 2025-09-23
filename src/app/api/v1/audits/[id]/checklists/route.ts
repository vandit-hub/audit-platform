import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";

const schema = z.object({
  checklistId: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const body = await req.json();
  const input = schema.parse(body);

  const audit = await prisma.audit.findUnique({ where: { id: params.id } });
  if (!audit) return NextResponse.json({ ok: false, error: "Audit not found" }, { status: 404 });

  // Ensure checklist is applicable to the plant
  const applicable = await prisma.checklistApplicability.findUnique({
    where: { checklistId_plantId: { checklistId: input.checklistId, plantId: audit.plantId } }
  });
  if (!applicable) {
    return NextResponse.json(
      { ok: false, error: "Checklist is not applicable to this plant" },
      { status: 400 }
    );
  }

  const link = await prisma.auditChecklist.upsert({
    where: { auditId_checklistId: { auditId: params.id, checklistId: input.checklistId } },
    update: {},
    create: { auditId: params.id, checklistId: input.checklistId }
  });

  // Seed per-audit items if none exist
  const count = await prisma.auditChecklistItem.count({ where: { auditChecklistId: link.id } });
  if (count === 0) {
    const items = await prisma.checklistItem.findMany({ where: { checklistId: input.checklistId } });
    if (items.length > 0) {
      await prisma.auditChecklistItem.createMany({
        data: items.map((it) => ({
          auditChecklistId: link.id,
          checklistItemId: it.id,
          title: it.title
        }))
      });
    }
  }

  return NextResponse.json({ ok: true });
}