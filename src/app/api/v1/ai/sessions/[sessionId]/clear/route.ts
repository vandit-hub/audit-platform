import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { clearSessionMessages } from "@/server/ai-chat/store";

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return errorResponse("Unauthorized", 401);
  }

  const { sessionId } = await context.params;
  const cleared = await clearSessionMessages(session.user.id, sessionId);
  if (!cleared) {
    return errorResponse("Session not found", 404);
  }

  return new Response(null, { status: 204 });
}

