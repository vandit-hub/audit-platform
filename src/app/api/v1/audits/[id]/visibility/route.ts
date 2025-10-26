import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { z } from "zod";

const visibilitySchema = z.union([
  z.literal("show_all"),
  z.literal("hide_all"),
  z.literal("last_12m"),
  z.object({
    explicit: z.object({
      auditIds: z.array(z.string())
    })
  })
]);

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

  // Parse and validate request body
  const body = await req.json();
  const { rules } = body;

  let validatedRules;
  try {
    validatedRules = visibilitySchema.parse(rules);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid visibility rules format" },
      { status: 400 }
    );
  }

  // Check if audit exists
  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { id: true }
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  // Update visibility rules
  const updated = await prisma.audit.update({
    where: { id },
    data: {
      visibilityRules: validatedRules as any
    }
  });

  // Log audit trail
  await writeAuditEvent({
    entityType: 'AUDIT',
    entityId: id,
    action: 'VISIBILITY_UPDATED',
    actorId: session!.user.id,
    diff: { visibilityRules: validatedRules }
  });

  return NextResponse.json({ ok: true, audit: updated });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id },
    select: { visibilityRules: true }
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    visibilityRules: audit.visibilityRules
  });
}
