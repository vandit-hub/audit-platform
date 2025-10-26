import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertCFOOrCXOTeam, isCFO } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  try {
    assertCFOOrCXOTeam(session?.user?.role);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Forbidden" },
      { status: err.status || 403 }
    );
  }

  // Check if audit exists and is locked
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { isLocked: true, completedAt: true }
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (!audit.isLocked) {
    return NextResponse.json({ error: "Audit is not locked" }, { status: 400 });
  }

  // Warning for CXO_TEAM unlocking completed audits (policy, not enforcement)
  if (audit.completedAt && !isCFO(session?.user?.role)) {
    console.warn(`CXO_TEAM user ${session!.user.id} unlocking completed audit ${id}`);
  }

  // Unlock the audit
  const updated = await prisma.audit.update({
    where: { id },
    data: {
      isLocked: false,
      lockedAt: null,
      lockedById: null
    }
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: id,
    action: 'UNLOCKED',
    actorId: session!.user.id,
    diff: { isLocked: false }
  });

  return NextResponse.json({ ok: true, audit: updated });
}
