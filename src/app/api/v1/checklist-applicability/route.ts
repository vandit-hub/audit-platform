import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";

const schema = z.object({
  checklistId: z.string().min(1),
  plantId: z.string().min(1),
  applicable: z.boolean()
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const body = await req.json();
  const input = schema.parse(body);

  if (input.applicable) {
    await prisma.checklistApplicability.upsert({
      where: { checklistId_plantId: { checklistId: input.checklistId, plantId: input.plantId } },
      update: {},
      create: { checklistId: input.checklistId, plantId: input.plantId }
    });
  } else {
    await prisma.checklistApplicability.deleteMany({
      where: { checklistId: input.checklistId, plantId: input.plantId }
    });
  }

  return NextResponse.json({ ok: true });
}