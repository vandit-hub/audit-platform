import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdmin, isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { getUserScope, isObservationInScope } from "@/lib/scope";
import { notifyObservationUpdate } from "@/websocket/broadcast";

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
  auditorResponseToAuditee: z.string().nullable().optional(),
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
  "auditorPerson",
  "auditorResponseToAuditee"
]);

const AUDITEE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "targetDate",
  "personResponsibleToImplement",
  "currentStatus"
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;

  const noteWhere =
    isAuditee(role) || isGuest(role) ? { visibility: "ALL" as const } : undefined;

  const o = await prisma.observation.findUnique({
    where: { id },
    include: {
      plant: true,
      audit: { select: { id: true, visitStartDate: true, visitEndDate: true } },
      attachments: true,
      approvals: {
        include: { actor: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: "desc" }
      },
      notes: {
        where: noteWhere as any,
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

  // If auditor and observation already approved -> block direct edits
  if (!isAdmin(session.user.role) && isAdminOrAuditor(session.user.role) && orig.approvalStatus === "APPROVED") {
    return NextResponse.json({ ok: false, error: "Observation is approved. Please submit a change request." }, { status: 403 });
  }

  // Determine role-based allowed fields
  const allowed = isAdmin(session.user.role)
    ? new Set([...AUDITOR_FIELDS, ...AUDITEE_FIELDS])
    : isAdminOrAuditor(session.user.role)
    ? AUDITOR_FIELDS
    : AUDITEE_FIELDS;

  const locked = new Set<string>(Array.isArray((orig.lockedFields as any) ?? []) ? ((orig.lockedFields as any) as string[]) : []);
  const isAdminUser = isAdmin(session.user.role);

  const data: any = {};
  for (const [k, v] of Object.entries(input)) {
    if (allowed.has(k)) {
      if (!isAdminUser && locked.has(k)) {
        return NextResponse.json({ ok: false, error: `Field "${k}" is locked` }, { status: 403 });
      }
      if (k === "targetDate") data[k] = v === null ? null : v ? new Date(v as string) : undefined;
      else data[k] = v;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "No permitted fields to update" }, { status: 400 });
  }

  const updated = await prisma.observation.update({
    where: { id },
    data
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "FIELD_UPDATE",
    actorId: session.user.id,
    diff: { before: orig, after: updated }
  });

  // Broadcast WebSocket update
  notifyObservationUpdate(id, { fields: Object.keys(data), updatedBy: session.user.email });

  return NextResponse.json({ ok: true, observation: updated });
}