import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";
import zxcvbn from "zxcvbn";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  token: z.string().min(10),
  name: z.string().min(1),
  password: z.string().min(8)
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const input = schema.parse(body);

  const invite = await prisma.guestInvite.findUnique({ where: { token: input.token } });
  if (!invite) {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
  }
  if (invite.redeemedAt) {
    return NextResponse.json({ ok: false, error: "Invite already used" }, { status: 400 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ ok: false, error: "Invite expired" }, { status: 400 });
  }

  const strength = zxcvbn(input.password);
  if (strength.score < 3) {
    return NextResponse.json(
      { ok: false, error: "Weak password. Use a longer passphrase with symbols and numbers." },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  // If user exists, update; else create
  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  const user =
    existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            passwordHash,
            role: invite.role,
            status: "ACTIVE"
          }
        })
      : await prisma.user.create({
          data: {
            email: invite.email,
            name: input.name,
            passwordHash,
            role: invite.role,
            status: "ACTIVE"
          }
        });

  await prisma.guestInvite.update({
    where: { id: invite.id },
    data: {
      redeemedAt: new Date(),
      redeemedById: user.id
    }
  });

  await writeAuditEvent({
    entityType: "INVITE",
    entityId: invite.id,
    action: "INVITE_REDEEMED",
    actorId: user.id
  });

  return NextResponse.json({ ok: true });
}