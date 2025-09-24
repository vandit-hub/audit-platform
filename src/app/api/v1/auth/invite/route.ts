import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { assertAdmin } from "@/lib/rbac";
import crypto from "crypto";
import { writeAuditEvent } from "@/server/auditTrail";
import { Role, Prisma } from "@prisma/client";

const schema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.GUEST),
  expiresInDays: z.number().int().min(1).max(30).default(7),
  scope: z
    .object({
      observationIds: z.array(z.string()).optional(),
      auditIds: z.array(z.string()).optional()
    })
    .partial()
    .optional()
});

export async function POST(req: NextRequest) {
  const session = await auth();
  assertAdmin(session?.user?.role);

  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json();
  const input = schema.parse(body);

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
        role: input.role,
        status: "INVITED"
      }
    });
  }

  const invite = await prisma.guestInvite.create({
    data: {
      email: input.email,
      role: input.role,
      token,
      expiresAt,
      scope: (input.scope ?? {}) as Prisma.InputJsonValue,
      invitedById: userId
    }
  });

  await writeAuditEvent({
    entityType: "INVITE",
    entityId: invite.id,
    action: "CREATE_INVITE",
    actorId: userId,
    diff: { email: input.email, role: input.role, expiresAt }
  });

  // For MVP we just return the token (in real life send email)
  return NextResponse.json({
    ok: true,
    token,
    inviteId: invite.id
  });
}
