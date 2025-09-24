import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdmin } from "@/lib/rbac";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role);

  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role");
  const role = roleParam && isRole(roleParam) ? roleParam : undefined;

  const users = await prisma.user.findMany({
    where: { role, status: "ACTIVE" },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { email: "asc" }
  });

  return NextResponse.json({ ok: true, users });
}

function isRole(value: string): value is Role {
  return (Object.values(Role) as string[]).includes(value);
}
