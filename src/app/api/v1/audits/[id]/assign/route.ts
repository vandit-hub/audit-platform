import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdmin } from "@/lib/rbac";

const schema = z.object({
  userId: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const body = await req.json();
  const input = schema.parse(body);

  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || user.role !== "AUDITOR") {
    return NextResponse.json({ ok: false, error: "User must be an AUDITOR" }, { status: 400 });
  }

  await prisma.auditAssignment.upsert({
    where: { auditId_auditorId: { auditId: params.id, auditorId: input.userId } },
    update: {},
    create: { auditId: params.id, auditorId: input.userId }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });

  await prisma.auditAssignment.deleteMany({
    where: { auditId: params.id, auditorId: userId }
  });

  return NextResponse.json({ ok: true });
}