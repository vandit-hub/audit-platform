import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  riskCategory: z.enum(["A", "B", "C"]).optional(),
  process: z.enum(["O2C", "P2P", "R2R", "INVENTORY"]).optional(),
  isMandatory: z.boolean().optional()
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const items = await prisma.checklistItem.findMany({
    where: { checklistId: params.id },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const item = await prisma.checklistItem.create({
    data: {
      checklistId: params.id,
      title: input.title,
      description: input.description ?? null,
      riskCategory: input.riskCategory as any,
      process: input.process as any,
      isMandatory: input.isMandatory ?? false
    }
  });

  return NextResponse.json({ ok: true, item });
}