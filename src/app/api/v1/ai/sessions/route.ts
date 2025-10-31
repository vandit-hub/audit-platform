import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createSessionForUser, listSessionsForUser } from "@/server/ai-chat/store";
import { isAuditee, isGuest } from "@/lib/rbac";

const createSessionSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || typeof (session.user as any).id !== "string" || !(session.user as any).id) {
    return errorResponse("Unauthorized", 401);
  }

  // Block Auditee and Guest roles from accessing AI Assistant
  const role = session.user.role;
  if (isAuditee(role) || isGuest(role)) {
    return errorResponse("Forbidden. Your role does not have access to the AI Assistant.", 403);
  }

  const sessions = await listSessionsForUser((session.user as any).id);
  return Response.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || typeof (session.user as any).id !== "string" || !(session.user as any).id) {
    return errorResponse("Unauthorized", 401);
  }

  // Block Auditee and Guest roles from accessing AI Assistant
  const role = session.user.role;
  if (isAuditee(role) || isGuest(role)) {
    return errorResponse("Forbidden. Your role does not have access to the AI Assistant.", 403);
  }

  const payload = await req.json().catch(() => ({}));
  const parsed = createSessionSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return errorResponse("Invalid payload", 400);
  }

  const created = await createSessionForUser((session.user as any).id, parsed.data.title ?? null);

  return Response.json({
    session: {
      id: created.id,
      title: created.title,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      lastMessageAt: created.lastMessageAt ? created.lastMessageAt.toISOString() : null,
    },
  });
}

