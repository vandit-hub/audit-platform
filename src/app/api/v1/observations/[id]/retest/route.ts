import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";
import { Prisma, ReTestResult, ObservationStatus } from "@prisma/client";

const schema = z.object({
  result: z.enum(["PASS", "FAIL"]),
  implementationDate: z.string().datetime().optional()
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  assertAdminOrAuditor(session?.user?.role);

  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const input = schema.parse(await req.json());

  const updateData: Prisma.ObservationUpdateInput = {
    reTestResult: input.result
  };

  if (input.result === ReTestResult.PASS) {
    updateData.currentStatus = ObservationStatus.RESOLVED;
    updateData.implementationDate = input.implementationDate
      ? new Date(input.implementationDate)
      : new Date();
  }

  await prisma.observation.update({
    where: { id },
    data: updateData
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: id,
    action: "RETEST",
    actorId: userId,
    diff: {
      reTestResult: input.result,
      currentStatus: updateData.currentStatus ?? null,
      implementationDate:
        updateData.implementationDate instanceof Date
          ? updateData.implementationDate.toISOString()
          : null
    }
  });

  return NextResponse.json({ ok: true });
}
