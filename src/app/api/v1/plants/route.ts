import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120)
});

export async function POST(req: NextRequest) {
  const session = await auth();
  assertCFOOrCXOTeam(session?.user?.role);

  const body = await req.json();
  const input = createSchema.parse(body);

  const plant = await prisma.plant.create({
    data: { code: input.code, name: input.name }
  });

  await writeAuditEvent({
    entityType: "PLANT",
    entityId: plant.id,
    action: "CREATE_PLANT",
    actorId: session?.user.id,
    diff: input
  });

  return NextResponse.json({ ok: true, plant });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const role = session.user.role;
  const userId = session.user.id;

  // CFO & CXO_TEAM: all plants
  if (role === "CFO" || role === "CXO_TEAM") {
    const plants = await prisma.plant.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, plants });
  }

  // AUDIT_HEAD or AUDITOR: plants from audits they lead/are assigned to
  if (role === "AUDIT_HEAD" || role === "AUDITOR") {
    const audits = await prisma.audit.findMany({
      where:
        role === "AUDIT_HEAD"
          ? { OR: [{ auditHeadId: userId }, { assignments: { some: { auditorId: userId } } }] }
          : { assignments: { some: { auditorId: userId } } },
      select: { plantId: true },
    });
    const plantIds = Array.from(new Set(audits.map((a) => a.plantId).filter(Boolean) as string[]));
    const plants = plantIds.length
      ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, orderBy: { name: "asc" } })
      : [];
    return NextResponse.json({ ok: true, plants });
  }

  // AUDITEE: plants from observations assigned to them
  if (role === "AUDITEE") {
    const obs = await prisma.observation.findMany({
      where: { assignments: { some: { auditeeId: userId } } },
      select: { plantId: true },
    });
    const plantIds = Array.from(new Set(obs.map((o) => o.plantId).filter(Boolean) as string[]));
    const plants = plantIds.length
      ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, orderBy: { name: "asc" } })
      : [];
    return NextResponse.json({ ok: true, plants });
  }

  // GUEST or unknown roles: no access (guests don’t need plants listing)
  return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
}