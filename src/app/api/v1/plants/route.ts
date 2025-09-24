import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const plant = await prisma.plant.create({
    data: { code: input.code, name: input.name }
  });

  await writeAuditEvent({
    entityType: "PLANT",
    entityId: plant.id,
    action: "CREATE_PLANT",
    actorId: session?.user.id,
    diff: input
  });

  return NextResponse.json({ ok: true, plant });
}

export async function GET() {
  // simple list for testing
  const plants = await prisma.plant.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ ok: true, plants });
}