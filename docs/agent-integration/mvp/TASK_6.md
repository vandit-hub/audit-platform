# Task 6: Create Chat UI Components

**Duration:** 3-4 hours

## Files to Create

1. `src/app/(dashboard)/agent-chat/page.tsx` (Server Component)
2. `src/app/(dashboard)/agent-chat/AgentChatClient.tsx` (Client Component)

## Part A: Server Component (Page)

### File: `src/app/(dashboard)/agent-chat/page.tsx`

See the complete implementation in the MVP_PLAN.md file, Step 6a (lines ~740-770).

```typescript
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
    <div className="max-w-4xl mx-auto px-4 py-6">
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
```

**Estimated lines:** ~30 lines

---

## Part B: Client Component (Chat Interface)

### File: `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

See the complete implementation in the MVP_PLAN.md file, Step 6b (lines ~780-960).

### Code Structure

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from 'next-auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AgentChatClient({ user }: AgentChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    // 1. Add user message to state
    // 2. Call API endpoint
    // 3. Add assistant response to state
    // 4. Handle errors
  };

  return (
    <div className="chat-container">
      {/* Header */}
      {/* Messages Area */}
      {/* Input Area */}
    </div>
  );
}
```

**Copy the full implementation from MVP_PLAN.md Step 6b (starting at line ~780)**

### Key Features

1. **Message List**: Displays user and assistant messages
2. **Loading State**: Shows animated dots while waiting for response
3. **Auto-scroll**: Scrolls to bottom when new messages arrive
4. **Example Questions**: Shown when chat is empty
5. **Enter to Send**: Press Enter to send, Shift+Enter for new line

**Estimated lines:** ~180 lines

---

## Testing

### Manual Testing Checklist

1. **Navigation**:
   - [ ] Navigate to `/agent-chat`
   - [ ] Page loads without errors
   - [ ] User info displays correctly (name, role)

2. **Send Message**:
   - [ ] Type a message in input
   - [ ] Click Send button
   - [ ] Loading animation appears
   - [ ] Response appears after a few seconds

3. **UI Interactions**:
   - [ ] Enter key sends message
   - [ ] Shift+Enter creates new line
   - [ ] Messages scroll to bottom automatically
   - [ ] User messages appear on right (blue)
   - [ ] Assistant messages appear on left (gray)

4. **Example Questions**:
   - [ ] Try "How many observations do I have?"
   - [ ] Try "Show me my draft observations"
   - [ ] Try "How many high-risk observations?"

5. **Error Handling**:
   - [ ] Empty message cannot be sent (button disabled)
   - [ ] Error messages display if API fails
   - [ ] Input is disabled while loading

## Verification

After completing this task:
- [ ] File `src/app/(dashboard)/agent-chat/page.tsx` exists
- [ ] File `src/app/(dashboard)/agent-chat/AgentChatClient.tsx` exists
- [ ] No TypeScript errors
- [ ] Page renders correctly
- [ ] Messages display properly
- [ ] API calls work
- [ ] Loading states work
- [ ] Error handling works
- [ ] Estimated ~210 lines total (30 + 180)

## Next Task

Proceed to **TASK_7.md** - Add Navigation Link
