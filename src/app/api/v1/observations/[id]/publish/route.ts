import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({ published: z.boolean() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const { published } = schema.parse(await req.json());

  const o = await prisma.observation.findUnique({ where: { id: params.id } });
  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (o.approvalStatus !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Observation not approved" }, { status: 400 });
  }

  await prisma.observation.update({
    where: { id: params.id },
    data: { isPublished: published }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: params.id,
    action: published ? "PUBLISH" : "UNPUBLISH",
    actorId: session!.user.id
  });

  return NextResponse.json({ ok: true });
}