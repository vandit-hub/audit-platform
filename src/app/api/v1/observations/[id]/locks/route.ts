import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  fields: z.array(z.string().min(1)).min(1),
  lock: z.boolean()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const { fields, lock } = schema.parse(await req.json());
  const o = await prisma.observation.findUnique({ where: { id: params.id } });
  if (!o) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const curr = Array.isArray((o.lockedFields as any) ?? []) ? ((o.lockedFields as any) as string[]) : [];
  const set = new Set(curr);

  if (lock) fields.forEach((f) => set.add(f));
  else fields.forEach((f) => set.delete(f));

  const next = Array.from(set);

  await prisma.observation.update({
    where: { id: params.id },
    data: { lockedFields: next as any }
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: params.id,
    action: "LOCK_FIELD",
    actorId: session!.user.id,
    diff: { fields, lock }
  });

  return NextResponse.json({ ok: true, lockedFields: next });
}