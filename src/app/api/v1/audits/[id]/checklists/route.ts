import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAuditorOrAuditHead } from "@/lib/rbac";

const schema = z.object({
  checklistId: z.string().min(1)
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          auditor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }
    }
  });
  if (!audit) return NextResponse.json({ ok: false, error: "Audit not found" }, { status: 404 });

  const auditChecklists = await prisma.auditChecklist.findMany({
    where: { auditId: id },
    include: {
      checklist: {
        include: {
          items: true
        }
      },
      items: true
    }
  });

  // Get assigned auditors
  const assignedAuditors = audit.assignments.map(a => a.auditor);

  // Calculate progress for each checklist
  const checklists = auditChecklists.map((ac, index) => {
    const totalItems = ac.items.length;
    const completedItems = ac.items.filter(item => item.status === "DONE").length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Determine status based on progress
    let status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    if (progress === 100) {
      status = "COMPLETED";
    } else if (progress > 0) {
      status = "IN_PROGRESS";
    } else {
      status = "NOT_STARTED";
    }

    // Distribute auditors across checklists (round-robin for simplicity)
    const assignedAuditor = assignedAuditors.length > 0
      ? assignedAuditors[index % assignedAuditors.length]
      : null;

    return {
      id: ac.id,
      checklistId: ac.checklistId,
      name: ac.checklist.name,
      description: ac.checklist.description,
      status,
      progress,
      totalItems,
      completedItems,
      assignedAuditor,
      createdAt: ac.createdAt
    };
  });

  return NextResponse.json({ ok: true, checklists });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAuditorOrAuditHead(session?.user?.role);

  const body = await req.json();
  const input = schema.parse(body);

  const audit = await prisma.audit.findUnique({ where: { id } });
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
    where: { auditId_checklistId: { auditId: id, checklistId: input.checklistId } },
    update: {},
    create: { auditId: id, checklistId: input.checklistId }
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