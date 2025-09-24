import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdminOrAuditor } from "@/lib/rbac";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; checklistId: string }> }) {
  const { id, checklistId } = await params;
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

  await prisma.auditChecklist.deleteMany({
    where: { auditId: id, checklistId }
  });

  return NextResponse.json({ ok: true });
}