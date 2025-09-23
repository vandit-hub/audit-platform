import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  result: z.enum(["PASS", "FAIL"]),
  implementationDate: z.string().datetime().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const input = schema.parse(await req.json());

  const data: any = {
    reTestResult: input.result as any
  };

  if (input.result === "PASS") {
    data.currentStatus = "RESOLVED";
    data.implementationDate = input.implementationDate ? new Date(input.implementationDate) : new Date();
  }

  await prisma.observation.update({
    where: { id: params.id },
    data
  });

  await writeAuditEvent({
    entityType: "OBSERVATION",
    entityId: params.id,
    action: "RETEST",
    actorId: session!.user.id,
    diff: data
  });

  return NextResponse.json({ ok: true });
}