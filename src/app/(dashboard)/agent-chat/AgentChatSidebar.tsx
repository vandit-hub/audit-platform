'use client';

import { useState, useEffect } from 'react';

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface AgentChatSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onConversationDeleted?: () => void;
  refreshTrigger?: number; // Used to trigger refresh from parent
}

export default function AgentChatSidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onConversationDeleted,
  refreshTrigger
}: AgentChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch conversations on mount and when refreshTrigger changes
  useEffect(() => {
    loadConversations();
  }, [refreshTrigger]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/agent/conversations');
      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/v1/agent/conversations/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationId === id) {
          onNewChat(); // Start new chat if deleted active conversation
        }
        onConversationDeleted?.();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  // Group conversations by date
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <div className="w-64 h-full border-r border-neutral-200 bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm mt-8 px-4">
            No conversations yet. Start a new chat to get started!
          </div>
        ) : (
          <>
            {Object.entries(groupedConversations).map(([dateGroup, convs]) => (
              <div key={dateGroup} className="mb-4">
                <h3 className="text-xs font-semibold text-neutral-500 px-2 mb-1">
                  {dateGroup}
                </h3>
                {convs.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`
                      p-3 rounded-lg cursor-pointer group mb-1
                      ${activeConversationId === conv.id
                        ? 'bg-neutral-100 border border-neutral-300'
                        : 'hover:bg-neutral-50'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1 text-neutral-900">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-2 text-neutral-400 hover:text-red-600 transition-opacity"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// Helper function to group conversations by date
function groupConversationsByDate(conversations: ConversationSummary[]) {
  const groups: Record<string, ConversationSummary[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    'Older': []
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 7);
  const last30Days = new Date(today);
  last30Days.setDate(last30Days.getDate() - 30);

  conversations.forEach(conv => {
    const convDate = new Date(conv.updatedAt);

    if (convDate >= today) {
      groups['Today'].push(conv);
    } else if (convDate >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (convDate >= last7Days) {
      groups['Last 7 Days'].push(conv);
    } else if (convDate >= last30Days) {
      groups['Last 30 Days'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}
