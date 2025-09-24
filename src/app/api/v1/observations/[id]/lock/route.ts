import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  fields: z.array(z.string()),
  lock: z.boolean()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdmin(session?.user?.role);

  const input = schema.parse(await req.json());

  const o = await prisma.observation.findUnique({
    where: { id },
    select: { lockedFields: true }
  });

  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  let lockedFields = (o.lockedFields as string[]) || [];

  if (input.lock) {
    // Add fields to locked list
    lockedFields = [...new Set([...lockedFields, ...input.fields])];
  } else {
    // Remove fields from locked list
    lockedFields = lockedFields.filter(f => !input.fields.includes(f));
  }

  await prisma.observation.update({
    where: { id },
    data: { lockedFields }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: input.lock ? "LOCK_FIELDS" : "UNLOCK_FIELDS",
    actorId: session!.user.id,
    diff: { fields: input.fields, lockedFields }
  });

  return NextResponse.json({ ok: true });
}