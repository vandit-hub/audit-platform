import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdmin, isAdminOrAuditor, isAuditee } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const updateSchema = z.object({
  // Auditor-editable
  observationText: z.string().optional(),
  risksInvolved: z.string().nullable().optional(),
  riskCategory: z.enum(["A", "B", "C"]).nullable().optional(),
  likelyImpact: z.enum(["LOCAL", "ORG_WIDE"]).nullable().optional(),
  concernedProcess: z.enum(["O2C", "P2P", "R2R", "INVENTORY"]).nullable().optional(),
  auditorPerson: z.string().nullable().optional(),

  // Auditee-editable
  auditeePersonTier1: z.string().nullable().optional(),
  auditeePersonTier2: z.string().nullable().optional(),
  auditeeFeedback: z.string().nullable().optional(),
  hodActionPlan: z.string().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  personResponsibleToImplement: z.string().nullable().optional(),
  currentStatus: z.enum(["PENDING", "IN_PROGRESS", "RESOLVED"]).optional()
});

const AUDITOR_FIELDS = new Set([
  "observationText",
  "risksInvolved",
  "riskCategory",
  "likelyImpact",
  "concernedProcess",
  "auditorPerson"
]);

const AUDITEE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "hodActionPlan",
  "targetDate",
  "personResponsibleToImplement",
  "currentStatus"
]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const o = await prisma.observation.findUnique({
    where: { id: params.id },
    include: {
      plant: true,
      audit: { select: { id: true, startDate: true, endDate: true } },
      attachments: true,
      approvals: {
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "desc" }
      },
      notes: {
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (isAuditee(session.user.role) && !(o.approvalStatus === "APPROVED" && o.isPublished)) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, observation: o });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const input = updateSchema.parse(body);

  const orig = await prisma.observation.findUnique({ where: { id: params.id } });
  if (!orig) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Determine role-based allowed fields
  const allowed = isAdmin(session.user.role)
    ? new Set([...AUDITOR_FIELDS, ...AUDITEE_FIELDS])
    : isAdminOrAuditor(session.user.role)
    ? AUDITOR_FIELDS
    : AUDITEE_FIELDS;

  const data: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (allowed.has(k)) {
      if (k === "targetDate") data[k] = v === null ? null : v ? new Date(v as string) : undefined;
      else data[k] = v;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No permitted fields to update" }, { status: 400 });
  }

  const updated = await prisma.observation.update({
    where: { id: params.id },
    data
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: params.id,
    action: "FIELD_UPDATE",
    actorId: session.user.id,
    diff: { before: orig, after: updated }
  });

  return NextResponse.json({ ok: true, observation: updated });
}