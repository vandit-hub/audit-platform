/**
 * Agent Chat Page - Server Component
 *
 * Handles authentication and renders the client component with sidebar.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AgentChatClient from './AgentChatClient';
import AgentChatSidebar from './AgentChatSidebar';

export default function AgentChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  const handleConversationChange = (id: string | null) => {
    setActiveConversationId(id);
    // Trigger sidebar refresh when new conversation is created
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    // Break out of dashboard layout constraints with negative margins and full viewport
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-8" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="flex h-full">
        {/* Sidebar */}
        <AgentChatSidebar
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          refreshTrigger={refreshTrigger}
        />

        {/* Main Chat Area */}
        <div className="flex-1 overflow-hidden px-4 py-6">
          <AgentChatClient
            user={session.user as any}
            conversationId={activeConversationId}
            onConversationChange={handleConversationChange}
          />
        </div>
      </div>
    </div>
  );
}
