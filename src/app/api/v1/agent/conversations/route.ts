import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/server/db';

/**
 * GET /api/v1/agent/conversations
 * List user's conversations with pagination
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Guests should not have conversation history
  if (session.user.role === 'GUEST') {
    return NextResponse.json({
      success: true,
      conversations: [],
      total: 0,
      hasMore: false
    });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const conversations = await prisma.agentConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1, // Fetch one extra to check if there are more
    skip: offset,
    include: {
      _count: {
        select: { messages: true }
      }
    }
  });

  const hasMore = conversations.length > limit;
  const results = hasMore ? conversations.slice(0, -1) : conversations;

  const total = await prisma.agentConversation.count({
    where: { userId: session.user.id }
  });

  return NextResponse.json({
    success: true,
    conversations: results.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: conv._count.messages
    })),
    total,
    hasMore
  });
}

/**
 * POST /api/v1/agent/conversations
 * Create new conversation
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Guests should not create conversations
  if (session.user.role === 'GUEST') {
    return NextResponse.json(
      { error: 'Guests cannot save conversation history' },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { title, sessionId } = body;

  if (!title || !sessionId) {
    return NextResponse.json(
      { error: 'Title and sessionId are required' },
      { status: 400 }
    );
  }

  // Check user's conversation count and delete oldest if >= 50
  const count = await prisma.agentConversation.count({
    where: { userId: session.user.id }
  });

  if (count >= 50) {
    // Delete the oldest conversation
    const oldest = await prisma.agentConversation.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' }
    });

    if (oldest) {
      await prisma.agentConversation.delete({
        where: { id: oldest.id }
      });
    }
  }

  // Create new conversation
  const conversation = await prisma.agentConversation.create({
    data: {
      userId: session.user.id,
      sessionId,
      title: title.slice(0, 60) // Truncate to 60 chars
    }
  });

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversation.id,
      sessionId: conversation.sessionId,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString()
    }
  });
}
