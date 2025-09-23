import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";
import { presignPutUrl } from "@/lib/s3";

const schema = z.object({
  kind: z.enum(["ANNEXURE", "MGMT_DOC"]),
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const { kind, fileName, contentType } = schema.parse(await req.json());

  const obs = await prisma.observation.findUnique({ where: { id: params.id } });
  if (!obs) return NextResponse.json({ ok: false, error: "Observation not found" }, { status: 404 });

  const safeName = fileName.replace(/[^\w.\-]/g, "_");
  const key = `observations/${obs.id}/${kind}/${Date.now()}_${safeName}`;
  const { url, bucket, key: k } = await presignPutUrl(key, contentType, 300);

  return NextResponse.json({ ok: true, url, bucket, key: k });
}