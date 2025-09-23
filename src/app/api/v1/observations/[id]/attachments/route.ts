import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { writeAuditEvent } from "@/server/auditTrail";

const schema = z.object({
  kind: z.enum(["ANNEXURE", "MGMT_DOC"]),
  key: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().optional(),
  size: z.number().int().positive().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const input = schema.parse(await req.json());

  const rec = await prisma.observationAttachment.create({
    data: {
      observationId: params.id,
      kind: input.kind as any,
      key: input.key,
      fileName: input.fileName,
      contentType: input.contentType ?? null,
      size: input.size ?? null
    }
  });

  await writeAuditEvent({
    entityType: "ATTACHMENT",
    entityId: rec.id,
    action: "CREATE",
    actorId: session!.user.id,
    diff: rec
  });

  return NextResponse.json({ ok: true, attachment: rec });
}