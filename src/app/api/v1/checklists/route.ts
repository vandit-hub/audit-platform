import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const checklists = await prisma.checklist.findMany({
    include: {
      items: { select: { id: true } },
      applicable: { select: { plantId: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const shaped = checklists.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    itemsCount: c.items.length,
    applicablePlantIds: c.applicable.map((a) => a.plantId)
  }));

  return NextResponse.json({ ok: true, checklists: shaped });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const c = await prisma.checklist.create({
    data: { name: input.name, description: input.description ?? null }
  });

  return NextResponse.json({ ok: true, checklist: c });
}