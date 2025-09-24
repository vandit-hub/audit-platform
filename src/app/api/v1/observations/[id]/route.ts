import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdmin, isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { getUserScope, isObservationInScope } from "@/lib/scope";
import { Prisma } from "@prisma/client";

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;

  const noteWhere: Prisma.RunningNoteWhereInput | undefined =
    isAuditee(role) || isGuest(role) ? { visibility: "ALL" } : undefined;

  const o = await prisma.observation.findUnique({
    where: { id },
    include: {
      plant: true,
      audit: { select: { id: true, startDate: true, endDate: true } },
      attachments: true,
      approvals: {
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "desc" }
      },
      notes: {
        where: noteWhere,
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "asc" }
      },
      actionPlans: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (isAuditee(role) || isGuest(role)) {
    const scope = await getUserScope(session.user.id);
    const allowed = isObservationInScope({ id: o.id, auditId: o.audit.id }, scope) ||
      (o.approvalStatus === "APPROVED" && o.isPublished);
    if (!allowed) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true, observation: o });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const input = updateSchema.parse(body);

  const orig = await prisma.observation.findUnique({ where: { id } });
  if (!orig) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Determine role-based allowed fields
  const allowed = isAdmin(session.user.role)
    ? new Set([...AUDITOR_FIELDS, ...AUDITEE_FIELDS])
    : isAdminOrAuditor(session.user.role)
    ? AUDITOR_FIELDS
    : AUDITEE_FIELDS;

  const updates: Prisma.ObservationUpdateInput = {};

  if (allowed.has("observationText") && input.observationText !== undefined) {
    updates.observationText = input.observationText;
  }
  if (allowed.has("risksInvolved") && input.risksInvolved !== undefined) {
    updates.risksInvolved = input.risksInvolved;
  }
  if (allowed.has("riskCategory") && input.riskCategory !== undefined) {
    updates.riskCategory = input.riskCategory;
  }
  if (allowed.has("likelyImpact") && input.likelyImpact !== undefined) {
    updates.likelyImpact = input.likelyImpact;
  }
  if (allowed.has("concernedProcess") && input.concernedProcess !== undefined) {
    updates.concernedProcess = input.concernedProcess;
  }
  if (allowed.has("auditorPerson") && input.auditorPerson !== undefined) {
    updates.auditorPerson = input.auditorPerson;
  }
  if (allowed.has("auditeePersonTier1") && input.auditeePersonTier1 !== undefined) {
    updates.auditeePersonTier1 = input.auditeePersonTier1;
  }
  if (allowed.has("auditeePersonTier2") && input.auditeePersonTier2 !== undefined) {
    updates.auditeePersonTier2 = input.auditeePersonTier2;
  }
  if (allowed.has("auditeeFeedback") && input.auditeeFeedback !== undefined) {
    updates.auditeeFeedback = input.auditeeFeedback;
  }
  if (allowed.has("hodActionPlan") && input.hodActionPlan !== undefined) {
    updates.hodActionPlan = input.hodActionPlan;
  }
  if (allowed.has("targetDate") && input.targetDate !== undefined) {
    updates.targetDate = input.targetDate === null ? null : new Date(input.targetDate);
  }
  if (allowed.has("personResponsibleToImplement") && input.personResponsibleToImplement !== undefined) {
    updates.personResponsibleToImplement = input.personResponsibleToImplement;
  }
  if (allowed.has("currentStatus") && input.currentStatus !== undefined) {
    updates.currentStatus = input.currentStatus;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: false, error: "No permitted fields to update" }, { status: 400 });
  }

  const updated = await prisma.observation.update({
    where: { id },
    data: updates
  });

  const diffPayload = Object.fromEntries(
    Object.entries(updates).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value
    ])
  );

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "FIELD_UPDATE",
    actorId: session.user.id,
    diff: diffPayload
  });

  return NextResponse.json({ ok: true, observation: updated });
}
