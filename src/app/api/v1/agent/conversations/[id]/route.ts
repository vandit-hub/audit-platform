import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/server/db';

/**
 * GET /api/v1/agent/conversations/:id
 * Load specific conversation with all messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.agentConversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    );
  }

  // RBAC: Verify conversation belongs to user
  if (conversation.userId !== session.user.id) {
    return NextResponse.json(
      { error: 'Forbidden: You cannot access this conversation' },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    conversation: {
      id: conversation.id,
      sessionId: conversation.sessionId,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }))
    }
  });
}

/**
 * DELETE /api/v1/agent/conversations/:id
 * Delete a conversation and all its messages
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.agentConversation.findUnique({
    where: { id }
  });

  if (!conversation) {
    return NextResponse.json(
      { error: 'Conversation not found' },
      { status: 404 }
    );
  }

  // RBAC: Verify conversation belongs to user
  if (conversation.userId !== session.user.id) {
    return NextResponse.json(
      { error: 'Forbidden: You cannot delete this conversation' },
      { status: 403 }
    );
  }

  // Delete conversation (cascade deletes messages)
  await prisma.agentConversation.delete({
    where: { id }
  });

  return NextResponse.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}
