import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";

const schema = z.object({
  text: z.string().min(1)
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const notes = await prisma.runningNote.findMany({
    where: { observationId: params.id },
    include: { actor: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ ok: true, notes });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const input = schema.parse(await req.json());

  const note = await prisma.runningNote.create({
    data: {
      observationId: params.id,
      actorId: session.user.id,
      text: input.text
    },
    include: { actor: { select: { id: true, email: true, name: true} } }
  });

  return NextResponse.json({ ok: true, note });
}