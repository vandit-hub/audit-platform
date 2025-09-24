import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor, isAdminOrAuditor, isAuditee, isGuest } from "@/lib/rbac";
import { presignPutUrl } from "@/lib/s3";
import { getUserScope, isObservationInScope } from "@/lib/scope";

const schema = z.object({
  kind: z.enum(["ANNEXURE", "MGMT_DOC"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

  const { kind, fileName, contentType } = schema.parse(await req.json());

  const obs = await prisma.observation.findUnique({
    where: { id },
    select: { id: true, auditId: true }
  });
  if (!obs) return NextResponse.json({ ok: false, error: "Observation not found" }, { status: 404 });

  if (isAdminOrAuditor(session.user.role)) {
    // ok
  } else if (isAuditee(session.user.role)) {
    if (kind !== "MGMT_DOC") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    const scope = await getUserScope(session.user.id);
    if (!isObservationInScope(obs, scope)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  } else if (isGuest(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  const key = `observations/${obs.id}/${kind}/${Date.now()}_${safeName}`;
  const { url, bucket, key: k } = await presignPutUrl(key, contentType, 300);

  return NextResponse.json({ ok: true, url, bucket, key: k });
}