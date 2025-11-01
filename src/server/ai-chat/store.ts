import { Prisma, AIChatMessage as DbChatMessage, AIChatSession } from "@prisma/client";
import { UIMessage } from "ai";
import { prisma } from "@/server/db";

type SessionWithMessages = {
  session: AIChatSession;
  messages: UIMessage[];
};

export type SessionListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  lastMessagePreview: string | null;
};

const messageSelect = {
  id: true,
  role: true,
  parts: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AIChatMessageSelect;

function mapDbMessageToUI(message: Pick<DbChatMessage, keyof typeof messageSelect>): UIMessage {
  return {
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: (message.parts ?? []) as UIMessage["parts"],
  };
}

function mapUIMessageToDb(message: UIMessage, sessionId: string): Prisma.AIChatMessageCreateManyInput {
  const createdAt = new Date();
  return {
    id: message.id,
    sessionId,
    role: message.role,
    parts: message.parts as unknown as Prisma.InputJsonValue,
    createdAt,
    updatedAt: createdAt,
  };
}

function getPreviewFromMessage(message: UIMessage | null): string | null {
  if (!message) return null;
  for (const part of message.parts ?? []) {
    if (part.type === "text" && part.text) {
      const trimmed = part.text.trim();
      if (trimmed.length === 0) continue;
      return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
    }
  }
  return null;
}

export async function listSessionsForUser(userId: string): Promise<SessionListItem[]> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  const sessions = await prisma.aIChatSession.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      lastMessageAt: true,
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: messageSelect,
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    lastMessageAt: session.lastMessageAt ? session.lastMessageAt.toISOString() : null,
    messageCount: session._count.messages,
    lastMessagePreview: getPreviewFromMessage(
      session.messages[0] ? mapDbMessageToUI(session.messages[0]) : null,
    ),
  }));
}

export async function createSessionForUser(userId: string, title?: string | null): Promise<AIChatSession> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  return prisma.aIChatSession.create({
    data: {
      userId,
      title: title?.trim() ? title.trim() : null,
    },
  });
}

export async function renameSession(userId: string, sessionId: string, title: string | null): Promise<AIChatSession | null> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  const session = await prisma.aIChatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return null;
  return prisma.aIChatSession.update({
    where: { id: sessionId },
    data: { title: title?.trim() ? title.trim() : null },
  });
}

export async function deleteSession(userId: string, sessionId: string): Promise<boolean> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  const session = await prisma.aIChatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return false;
  await prisma.aIChatSession.delete({ where: { id: sessionId } });
  return true;
}

export async function clearSessionMessages(userId: string, sessionId: string): Promise<boolean> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  const session = await prisma.aIChatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) return false;

  await prisma.$transaction([
    prisma.aIChatMessage.deleteMany({ where: { sessionId } }),
    prisma.aIChatSession.update({
      where: { id: sessionId },
      data: { lastMessageAt: null },
    }),
  ]);

  return true;
}

export async function getSessionWithMessages(
  userId: string,
  sessionId: string,
): Promise<SessionWithMessages | null> {
  if (!userId || typeof userId !== "string") {
    throw new Error("USER_ID_REQUIRED");
  }
  const session = await prisma.aIChatSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) return null;

  const messages = await prisma.aIChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
    select: messageSelect,
  });

  return {
    session,
    messages: messages.map(mapDbMessageToUI),
  };
}

export async function appendMessagesToSession(
  userId: string,
  sessionId: string,
  messages: UIMessage[],
): Promise<void> {
  if (messages.length === 0) return;

  const session = await prisma.aIChatSession.findFirst({ where: { id: sessionId, userId } });
  if (!session) {
    throw new Error("SESSION_NOT_FOUND");
  }

  const data = messages.map((message) => mapUIMessageToDb(message, sessionId));

  const lastCreatedAt = data[data.length - 1]?.createdAt ?? new Date();

  await prisma.$transaction([
    prisma.aIChatMessage.createMany({ data, skipDuplicates: true }),
    prisma.aIChatSession.update({
      where: { id: sessionId },
      data: {
        lastMessageAt: lastCreatedAt,
      },
    }),
  ]);
}

