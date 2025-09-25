'use client';

import React from 'react';
import { PresenceUser } from '@/lib/websocket/types';

interface PresenceBadgeProps {
  users: PresenceUser[];
  currentUserId?: string;
}

export default function PresenceBadge({ users, currentUserId }: PresenceBadgeProps) {
  const otherUsers = users.filter(u => u.userId !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-sm">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-green-700">
        {otherUsers.length === 1 ? (
          <>
            {otherUsers[0].email?.split('@')[0]} is viewing
          </>
        ) : (
          <>
            {otherUsers.length} others viewing
          </>
        )}
      </span>
    </div>
  );
}