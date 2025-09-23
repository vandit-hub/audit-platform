import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdmin } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  assertAdmin(session?.user?.role);

  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || undefined;

  const users = await prisma.user.findMany({
    where: { role: role ? (role as any) : undefined, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: "asc" }
  });

  return NextResponse.json({ ok: true, users });
}