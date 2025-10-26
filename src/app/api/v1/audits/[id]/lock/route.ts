import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
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

  // Check if audit exists
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { isLocked: true }
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  if (audit.isLocked) {
    return NextResponse.json({ error: "Audit is already locked" }, { status: 400 });
  }

  // Lock the audit
  const updated = await prisma.audit.update({
    where: { id },
    data: {
      isLocked: true,
      lockedAt: new Date(),
      lockedById: session!.user.id
    }
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: id,
    action: 'LOCKED',
    actorId: session!.user.id,
    diff: { isLocked: true, lockedAt: updated.lockedAt }
  });

  return NextResponse.json({ ok: true, audit: updated });
}
