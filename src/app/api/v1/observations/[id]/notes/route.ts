import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { getUserScope, isObservationInScope } from "@/lib/scope";

const schema = z.object({
  text: z.string().min(1),
  visibility: z.enum(["INTERNAL", "ALL"]).optional()
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const where: any = { observationId: id };
  if (isAuditee(session.user.role) || isGuest(session.user.role)) {
    where.visibility = "ALL";
  }

  const notes = await prisma.runningNote.findMany({
    where,
    include: { actor: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ ok: true, notes });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const input = schema.parse(await req.json());

  // Load obs and check scope for auditee/guest if they want to collaborate
  const obs = await prisma.observation.findUnique({
    where: { id },
    select: { id: true, auditId: true }
  });
  if (!obs) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (isAuditee(session.user.role) || isGuest(session.user.role)) {
    const scope = await getUserScope(session.user.id);
    if (!isObservationInScope(obs, scope)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const visibility =
    isAdminOrAuditor(session.user.role) ? (input.visibility ?? "ALL") : "ALL";

  const note = await prisma.runningNote.create({
    data: {
      observationId: id,
      actorId: session.user.id,
      text: input.text,
      visibility
    },
    include: { actor: { select: { id: true, email: true, name: true } } }
  });

  return NextResponse.json({ ok: true, note });
}