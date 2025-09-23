import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdminOrAuditor } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; checklistId: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  await prisma.auditChecklist.deleteMany({
    where: { auditId: params.id, checklistId: params.checklistId }
  });

  return NextResponse.json({ ok: true });
}