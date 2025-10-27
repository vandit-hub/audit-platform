/**
 * Agent Chat Page - Server Component
 *
 * Handles authentication and renders the client component.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AgentChatClient from './AgentChatClient';

export const metadata = {
  title: 'AI Assistant - Audit Platform',
  description: 'Ask questions about your observations'
};

export default async function AgentChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">AI Assistant</h1>
        <p className="text-neutral-600 mt-1">
          Ask questions about your observations. For example: "How many draft observations do I have?"
        </p>
      </div>

      <AgentChatClient user={session.user} />
    </div>
  );
}
