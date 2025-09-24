import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  fields: z.array(z.string().min(1)).min(1),
  lock: z.boolean()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdmin(session?.user?.role);

  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const { fields, lock } = schema.parse(await req.json());
  const o = await prisma.observation.findUnique({ where: { id } });
  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const rawLocked = o.lockedFields;
  const curr = Array.isArray(rawLocked)
    ? rawLocked.filter((value): value is string => typeof value === "string")
    : [];
  const set = new Set(curr);

  if (lock) fields.forEach((f) => set.add(f));
  else fields.forEach((f) => set.delete(f));

  const next = Array.from(set);

  await prisma.observation.update({
    where: { id },
    data: { lockedFields: next }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "LOCK_FIELD",
    actorId: userId,
    diff: { fields, lock }
  });

  return NextResponse.json({ ok: true, lockedFields: next });
}
