import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAuditHead, isCFO } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { notifyObservationUpdate } from "@/websocket/broadcast";

const schema = z.object({ published: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  const isCfoUser = isCFO(role);
  if (!isCfoUser) {
    assertAuditHead(role);
  }

  const { published } = schema.parse(await req.json());

  const o = await prisma.observation.findUnique({
    where: { id },
    include: {
      audit: {
        select: {
          auditHeadId: true,
          isLocked: true
        }
      }
    }
  });
  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (!isCfoUser) {
    if (o.audit?.auditHeadId !== session.user.id) {
      return NextResponse.json({
        ok: false,
        error: "Only the audit head for this audit can change publication status"
      }, { status: 403 });
    }

    if (o.audit?.isLocked) {
      return NextResponse.json({
        ok: false,
        error: "Audit is locked. Cannot change publication status."
      }, { status: 403 });
    }
  }

  if (published && o.approvalStatus !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Observation not approved" }, { status: 400 });
  }

  if (published && o.isPublished) {
    return NextResponse.json({ ok: false, error: "Observation is already published" }, { status: 400 });
  }

  if (!published && !o.isPublished) {
    return NextResponse.json({ ok: false, error: "Observation is already unpublished" }, { status: 400 });
  }

  const updated = await prisma.observation.update({
    where: { id },
    data: { isPublished: published }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: published ? "PUBLISH" : "UNPUBLISH",
    actorId: session.user.id,
    diff: {
      isPublished: {
        from: o.isPublished,
        to: published
      }
    }
  });

  notifyObservationUpdate(id, {
    isPublished: published,
    updatedBy: session.user.email
  });

  return NextResponse.json({ ok: true, observation: updated });
}