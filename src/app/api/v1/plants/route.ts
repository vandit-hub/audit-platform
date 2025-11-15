import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertCFOOrCXOTeam } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const createSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(120)
});

type PlantRecord = {
  id: string;
  code: string;
  name: string;
  createdAt: Date;
};

type PlantStats = {
  audits: {
    total: number;
    active: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  observations: {
    total: number;
    byRisk: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

function createEmptyStats(): PlantStats {
  return {
    audits: {
      total: 0,
      active: 0,
      completed: 0,
      byStatus: {},
    },
    observations: {
      total: 0,
      byRisk: {},
      byStatus: {},
    },
  };
}

function ensureStats(map: Map<string, PlantStats>, plantId: string) {
  if (!map.has(plantId)) {
    map.set(plantId, createEmptyStats());
  }
  return map.get(plantId)!;
}

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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const withStats = searchParams.get("withStats") === "1";

  const role = session.user.role;
  const userId = session.user.id;

  let plants: PlantRecord[] = [];
  let statsMap: Map<string, PlantStats> | null = null;

  if (role === "CFO" || role === "CXO_TEAM") {
    plants = await prisma.plant.findMany({ orderBy: { createdAt: "desc" } });

    if (withStats && plants.length) {
      const plantIds = plants.map((plant) => plant.id);
      statsMap = new Map<string, PlantStats>();

      const [auditGroups, observationRiskGroups, observationStatusGroups] = await Promise.all([
        prisma.audit.groupBy({
          by: ["plantId", "status"],
          where: { plantId: { in: plantIds } },
          _count: { _all: true },
        }),
        prisma.observation.groupBy({
          by: ["plantId", "riskCategory"],
          where: { plantId: { in: plantIds } },
          _count: { _all: true },
        }),
        prisma.observation.groupBy({
          by: ["plantId", "currentStatus"],
          where: { plantId: { in: plantIds } },
          _count: { _all: true },
        }),
      ]);

      for (const group of auditGroups) {
        const stats = ensureStats(statsMap, group.plantId);
        const count = group._count._all;
        const status = group.status ?? "UNKNOWN";
        stats.audits.total += count;
        stats.audits.byStatus[status] = (stats.audits.byStatus[status] ?? 0) + count;
        if (status === "SIGNED_OFF") {
          stats.audits.completed += count;
        } else {
          stats.audits.active += count;
        }
      }

      for (const group of observationRiskGroups) {
        const stats = ensureStats(statsMap, group.plantId);
        const count = group._count._all;
        const riskKey = group.riskCategory ?? "UNSPECIFIED";
        stats.observations.byRisk[riskKey] = count;
        stats.observations.total += count;
      }

      for (const group of observationStatusGroups) {
        const stats = ensureStats(statsMap, group.plantId);
        const statusKey = group.currentStatus ?? "UNKNOWN";
        stats.observations.byStatus[statusKey] =
          (stats.observations.byStatus[statusKey] ?? 0) + group._count._all;
      }
    }
  } else if (role === "AUDIT_HEAD" || role === "AUDITOR") {
    const auditAccessFilter: Prisma.AuditWhereInput =
      role === "AUDIT_HEAD"
        ? {
            OR: [
              { auditHeadId: userId },
              { assignments: { some: { auditorId: userId } } },
            ],
          }
        : { assignments: { some: { auditorId: userId } } };

    const audits = await prisma.audit.findMany({
      where: auditAccessFilter,
      select: { id: true, plantId: true, status: true },
    });

    const plantIds = Array.from(new Set(audits.map((a) => a.plantId)));
    plants = plantIds.length
      ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, orderBy: { name: "asc" } })
      : [];

    if (withStats && plantIds.length) {
      statsMap = new Map<string, PlantStats>();

      for (const audit of audits) {
        const stats = ensureStats(statsMap, audit.plantId);
        const status = audit.status ?? "UNKNOWN";
        stats.audits.total += 1;
        stats.audits.byStatus[status] = (stats.audits.byStatus[status] ?? 0) + 1;
        if (status === "SIGNED_OFF") {
          stats.audits.completed += 1;
        } else {
          stats.audits.active += 1;
        }
      }

      const observationAccessFilter: Prisma.ObservationWhereInput =
        role === "AUDIT_HEAD"
          ? {
              AND: [
                { plantId: { in: plantIds } },
                {
                  OR: [
                    { audit: { auditHeadId: userId } },
                    { audit: { assignments: { some: { auditorId: userId } } } },
                  ],
                },
              ],
            }
          : {
              AND: [
                { plantId: { in: plantIds } },
                { audit: { assignments: { some: { auditorId: userId } } } },
              ],
            };

      const observations = await prisma.observation.findMany({
        where: observationAccessFilter,
        select: { plantId: true, riskCategory: true, currentStatus: true },
      });

      for (const observation of observations) {
        const stats = ensureStats(statsMap, observation.plantId);
        stats.observations.total += 1;
        const riskKey = observation.riskCategory ?? "UNSPECIFIED";
        stats.observations.byRisk[riskKey] =
          (stats.observations.byRisk[riskKey] ?? 0) + 1;
        const statusKey = observation.currentStatus ?? "UNKNOWN";
        stats.observations.byStatus[statusKey] =
          (stats.observations.byStatus[statusKey] ?? 0) + 1;
      }
    }
  } else if (role === "AUDITEE") {
    const observationAssignments = await prisma.observation.findMany({
      where: { assignments: { some: { auditeeId: userId } } },
      select: { plantId: true, auditId: true, riskCategory: true, currentStatus: true },
    });

    const plantIds = Array.from(new Set(observationAssignments.map((o) => o.plantId)));
    plants = plantIds.length
      ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, orderBy: { name: "asc" } })
      : [];

    if (withStats && observationAssignments.length) {
      statsMap = new Map<string, PlantStats>();

      for (const observation of observationAssignments) {
        const stats = ensureStats(statsMap, observation.plantId);
        stats.observations.total += 1;
        const riskKey = observation.riskCategory ?? "UNSPECIFIED";
        stats.observations.byRisk[riskKey] =
          (stats.observations.byRisk[riskKey] ?? 0) + 1;
        const statusKey = observation.currentStatus ?? "UNKNOWN";
        stats.observations.byStatus[statusKey] =
          (stats.observations.byStatus[statusKey] ?? 0) + 1;
      }

      const auditIds = Array.from(
        new Set(
          observationAssignments
            .map((obs) => obs.auditId)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      if (auditIds.length) {
        const audits = await prisma.audit.findMany({
          where: { id: { in: auditIds } },
          select: { plantId: true, status: true },
        });

        for (const audit of audits) {
          const stats = ensureStats(statsMap, audit.plantId);
          const status = audit.status ?? "UNKNOWN";
          stats.audits.total += 1;
          stats.audits.byStatus[status] = (stats.audits.byStatus[status] ?? 0) + 1;
          if (status === "SIGNED_OFF") {
            stats.audits.completed += 1;
          } else {
            stats.audits.active += 1;
          }
        }
      }
    }
  } else {
    // Guests or unknown roles do not have access
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const payload = withStats
    ? plants.map((plant) => ({
        ...plant,
        stats: statsMap?.get(plant.id) ?? createEmptyStats(),
      }))
    : plants;

  return NextResponse.json({ ok: true, plants: payload });
}
