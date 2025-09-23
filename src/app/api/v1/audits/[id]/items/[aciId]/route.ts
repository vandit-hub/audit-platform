import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/server/db";
import { z } from "zod";
import { assertAdminOrAuditor } from "@/lib/rbac";

const schema = z.object({
  status: z.enum(["PENDING", "DONE"]).optional(),
  toggle: z.boolean().optional()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; aciId: string } }) {
  const session = await getServerSession(authOptions);
  assertAdminOrAuditor(session?.user?.role);

  const body = await req.json().catch(() => ({}));
  const input = schema.parse(body);

  const item = await prisma.auditChecklistItem.findUnique({
    where: { id: params.aciId },
    include: { auditChecklist: { select: { auditId: true } } }
  });
  if (!item || item.auditChecklist.auditId !== params.id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  let newStatus = item.status;
  if (input.toggle) {
    newStatus = item.status === "DONE" ? "PENDING" : "DONE";
  } else if (input.status) {
    newStatus = input.status;
  }

  await prisma.auditChecklistItem.update({
    where: { id: params.aciId },
    data: { status: newStatus }
  });

  return NextResponse.json({ ok: true, status: newStatus });
}