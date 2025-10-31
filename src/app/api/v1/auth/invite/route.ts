import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertCFOOrCXOTeam, isCFO } from "@/lib/rbac";
import crypto from "crypto";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  email: z.string().email(),
  role: z.enum(["GUEST", "AUDITEE", "AUDITOR", "CXO_TEAM", "AUDIT_HEAD"]).default("GUEST"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  scope: z.any().optional()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  assertCFOOrCXOTeam(session?.user?.role);

  const body = await req.json();
  const input = schema.parse(body);

  // Only CFO can create CXO_TEAM and AUDIT_HEAD roles
  if ((input.role === "CXO_TEAM" || input.role === "AUDIT_HEAD") && !isCFO(session?.user?.role)) {
    return NextResponse.json(
      { ok: false, message: "Only CFO can create CXO_TEAM and AUDIT_HEAD users" },
      { status: 403 }
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  // Upsert placeholder user in INVITED status if not exists (optional)
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: input.email,
        name: "",
        passwordHash: crypto.randomBytes(32).toString("hex"), // placeholder; will be replaced
        role: input.role as any,
        status: "INVITED"
      }
    });
  }

  const invite = await prisma.guestInvite.create({
    data: {
      email: input.email,
      role: input.role as any,
      token,
      expiresAt,
      scope: input.scope ?? {},
      invitedById: session?.user.id
    }
  });

  await writeAuditEvent({
    entityType: "INVITE",
    entityId: invite.id,
    action: "CREATE_INVITE",
    actorId: session?.user.id,
    diff: { email: input.email, role: input.role, expiresAt }
  });

  // For MVP we just return the token (in real life send email)
  return NextResponse.json({
    ok: true,
    token,
    inviteId: invite.id
  });
}