import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  deleteSession,
  getSessionWithMessages,
  renameSession,
} from "@/server/ai-chat/store";

const updateSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  const data = await getSessionWithMessages(session.user.id, sessionId);
  if (!data) {
    return errorResponse("Session not found", 404);
  }

  return Response.json({
    session: {
      id: data.session.id,
      title: data.session.title,
      createdAt: data.session.createdAt.toISOString(),
      updatedAt: data.session.updatedAt.toISOString(),
      lastMessageAt: data.session.lastMessageAt
        ? data.session.lastMessageAt.toISOString()
        : null,
    },
    messages: data.messages,
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  const payload = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(payload ?? {});
  if (!parsed.success) {
    return errorResponse("Invalid payload", 400);
  }

  const updated = await renameSession(session.user.id, sessionId, parsed.data.title ?? null);
  if (!updated) {
    return errorResponse("Session not found", 404);
  }

  return Response.json({
    session: {
      id: updated.id,
      title: updated.title,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      lastMessageAt: updated.lastMessageAt
        ? updated.lastMessageAt.toISOString()
        : null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  const removed = await deleteSession(session.user.id, sessionId);
  if (!removed) {
    return errorResponse("Session not found", 404);
  }

  return new Response(null, { status: 204 });
}

