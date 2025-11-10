import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const updateSchema = z.object({
  code: z.string().min(1).max(32).optional(),
  name: z.string().min(1).max(120).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  assertCFOOrCXOTeam(session?.user?.role);

  const { id } = await params;
  const body = await req.json();
  const input = updateSchema.parse(body);

  const plant = await prisma.plant.findUnique({
    where: { id },
  });

  if (!plant) {
    return NextResponse.json(
      { ok: false, error: "Plant not found" },
      { status: 404 }
    );
  }

  const updatedPlant = await prisma.plant.update({
    where: { id },
    data: {
      ...(input.code !== undefined && { code: input.code }),
      ...(input.name !== undefined && { name: input.name }),
    },
  });

  await writeAuditEvent({
    entityType: "PLANT",
    entityId: plant.id,
    action: "UPDATE_PLANT",
    actorId: session?.user.id,
    diff: input,
  });

  return NextResponse.json({ ok: true, plant: updatedPlant });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  assertCFOOrCXOTeam(session?.user?.role);

  const { id } = await params;

  const plant = await prisma.plant.findUnique({
    where: { id },
  });

  if (!plant) {
    return NextResponse.json(
      { ok: false, error: "Plant not found" },
      { status: 404 }
    );
  }

  await prisma.plant.delete({
    where: { id },
  });

  await writeAuditEvent({
    entityType: "PLANT",
    entityId: plant.id,
    action: "DELETE_PLANT",
    actorId: session?.user.id,
    diff: { code: plant.code, name: plant.name },
  });

  return NextResponse.json({ ok: true });
}

