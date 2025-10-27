# TASK 7: Conversation History Implementation

## Status: 📋 PLANNED

**Estimated Time**: 8-10 hours
**Priority**: High
**Dependencies**: TASK 1 (Streaming), TASK 6 (Production Features)

---

## Overview

Implement ChatGPT-style conversation history with a sidebar that allows users to view, manage, and switch between their past agent conversations. This provides a persistent, database-backed history that survives page refreshes and allows users to organize their queries.

---

## Current State

**What's Working:**
- ✅ Session ID tracking via Claude Agent SDK
- ✅ Session resumption capability (API accepts `sessionId` parameter)
- ✅ Frontend stores current session ID in state
- ✅ Clear chat functionality

**What's Missing:**
- ❌ No database storage for conversations
- ❌ No sidebar UI to list past conversations
- ❌ No ability to switch between conversations
- ❌ No conversation titles/summaries
- ❌ No persistence across page refreshes
- ❌ No conversation management (delete, rename, etc.)

---

## Target State

**User Experience:**
- ChatGPT-style sidebar with conversation list
- Conversations grouped by date (Today, Yesterday, Last 7 Days, Older)
- Click conversation to load it and continue chatting
- "New Chat" button to start fresh conversation
- Auto-generated conversation titles from first message
- Delete conversation with confirmation
- Maximum 50 conversations per user (auto-cleanup oldest)
- Conversations persist across page refreshes and sessions

**Technical Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     AgentChatPage                           │
│  ┌──────────────┐  ┌───────────────────────────────────┐  │
│  │   Sidebar    │  │     AgentChatClient                │  │
│  │              │  │                                     │  │
│  │ • Today      │  │  ┌──────────────────────────────┐ │  │
│  │   - Conv 1   │  │  │   Chat Messages Area         │ │  │
│  │   - Conv 2   │  │  │                              │ │  │
│  │              │  │  │   - User messages            │ │  │
│  │ • Yesterday  │  │  │   - Assistant messages       │ │  │
│  │   - Conv 3   │  │  │   - Streaming content        │ │  │
│  │              │  │  └──────────────────────────────┘ │  │
│  │ • Last 7 Days│  │                                     │  │
│  │   - Conv 4   │  │  ┌──────────────────────────────┐ │  │
│  │   - Conv 5   │  │  │   Input Area                 │ │  │
│  │              │  │  └──────────────────────────────┘ │  │
│  │ [+ New Chat] │  │                                     │  │
│  └──────────────┘  └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### New Prisma Models

```prisma
model AgentConversation {
  id          String   @id @default(cuid())
  userId      String
  sessionId   String   @unique // Claude SDK session ID
  title       String   // Auto-generated from first message
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages    AgentMessage[]

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, updatedAt(sort: Desc)])
  @@map("AgentConversation")
}

model AgentMessage {
  id              String   @id @default(cuid())
  conversationId  String
  role            String   // 'user' | 'assistant'
  content         String   @db.Text
  timestamp       DateTime @default(now())

  conversation    AgentConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, timestamp])
  @@map("AgentMessage")
}
```

**Design Decisions:**
- `sessionId` is unique to support resuming conversations via Claude SDK
- `title` auto-generated from first user message (truncated to 60 chars)
- `userId` enables per-user conversation filtering with RBAC
- Cascade delete ensures messages are cleaned up when conversation is deleted
- Indexes on `userId` + `createdAt` and `userId` + `updatedAt` for fast list queries
- `updatedAt` automatically updates when new messages are added (via Prisma)

---

## API Endpoints

### 1. GET /api/v1/agent/conversations

**Purpose**: List user's conversations with pagination

**Request:**
```typescript
GET /api/v1/agent/conversations?limit=50&offset=0
```

**Response:**
```typescript
{
  success: true,
  conversations: [
    {
      id: "clx123...",
      title: "How many draft observations do I have?",
      createdAt: "2025-01-27T10:30:00Z",
      updatedAt: "2025-01-27T10:35:00Z",
      messageCount: 4
    },
    // ... more conversations
  ],
  total: 23,
  hasMore: false
}
```

**Implementation:**
- Authenticate user via NextAuth
- Query conversations filtered by `userId`
- Order by `updatedAt DESC` (most recent first)
- Apply limit (default: 50, max: 100)
- Include message count for each conversation
- Return paginated results

**RBAC:**
- Users can only see their own conversations
- CFO/CXO_TEAM cannot see other users' conversations
- Guests should not have conversation history (return empty array)

---

### 2. GET /api/v1/agent/conversations/:id

**Purpose**: Load specific conversation with all messages

**Request:**
```typescript
GET /api/v1/agent/conversations/clx123...
```

**Response:**
```typescript
{
  success: true,
  conversation: {
    id: "clx123...",
    sessionId: "session_abc123...",
    title: "How many draft observations do I have?",
    createdAt: "2025-01-27T10:30:00Z",
    updatedAt: "2025-01-27T10:35:00Z",
    messages: [
      {
        id: "msg1",
        role: "user",
        content: "How many draft observations do I have?",
        timestamp: "2025-01-27T10:30:00Z"
      },
      {
        id: "msg2",
        role: "assistant",
        content: "You have 5 draft observations...",
        timestamp: "2025-01-27T10:30:15Z"
      },
      // ... more messages
    ]
  }
}
```

**Implementation:**
- Authenticate user
- Verify conversation belongs to user (RBAC check)
- Load conversation with all messages (ordered by timestamp ASC)
- Return 404 if conversation not found or unauthorized

**RBAC:**
- Users can only load their own conversations
- Return 403 if user tries to access another user's conversation

---

### 3. POST /api/v1/agent/conversations

**Purpose**: Create new conversation (called automatically on first message)

**Request:**
```typescript
POST /api/v1/agent/conversations
{
  title: "How many observations...", // From first user message
  sessionId: "session_abc123..."     // From Claude SDK
}
```

**Response:**
```typescript
{
  success: true,
  conversation: {
    id: "clx123...",
    sessionId: "session_abc123...",
    title: "How many observations...",
    createdAt: "2025-01-27T10:30:00Z",
    updatedAt: "2025-01-27T10:30:00Z"
  }
}
```

**Implementation:**
- Authenticate user
- Validate title and sessionId
- Create conversation record linked to user
- Check user's conversation count, delete oldest if > 50
- Return created conversation

---

### 4. DELETE /api/v1/agent/conversations/:id

**Purpose**: Delete a conversation and all its messages

**Request:**
```typescript
DELETE /api/v1/agent/conversations/clx123...
```

**Response:**
```typescript
{
  success: true,
  message: "Conversation deleted successfully"
}
```

**Implementation:**
- Authenticate user
- Verify conversation belongs to user
- Delete conversation (cascade deletes messages via Prisma)
- Return 404 if not found, 403 if unauthorized

---

### 5. POST /api/v1/agent/chat (Updated)

**Purpose**: Update existing endpoint to save messages to database

**Changes:**
1. Accept optional `conversationId` parameter
2. If no `conversationId`, create new conversation on first message
3. Save user message to database before streaming
4. Save assistant message to database after streaming completes
5. Return `conversationId` in metadata for frontend to track

**Request:**
```typescript
POST /api/v1/agent/chat
{
  message: "How many observations do I have?",
  conversationId?: "clx123...",  // NEW: Optional conversation ID
  sessionId?: "session_abc..."    // Existing: For resuming
}
```

**Response (SSE Stream):**
```
data: {"type":"metadata","conversationId":"clx123...","session_id":"session_abc..."}

data: {"type":"text","content":"You have "}

data: {"type":"text","content":"5 draft observations"}

data: [DONE]
```

**Implementation Flow:**
1. Authenticate user
2. If `conversationId` provided, verify it belongs to user and load conversation
3. If no `conversationId`, create new conversation with title from user message
4. Save user message to database
5. Stream response as before
6. After streaming completes, save assistant response to database
7. Update conversation's `updatedAt` timestamp

---

## Frontend Components

### 1. AgentChatSidebar Component

**File**: `src/app/(dashboard)/agent-chat/AgentChatSidebar.tsx`

**Props:**
```typescript
interface AgentChatSidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (conversationId: string) => void;
  isLoading: boolean;
}

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}
```

**Features:**
- Group conversations by date:
  - Today
  - Yesterday
  - Last 7 Days
  - Last 30 Days
  - Older
- Highlight active conversation
- Show "New Chat" button at top
- Hover to show delete button
- Responsive layout (fixed width, scrollable)
- Empty state when no conversations

**UI Structure:**
```tsx
<div className="w-64 h-full border-r border-neutral-200 bg-white flex flex-col">
  {/* Header */}
  <div className="p-4 border-b">
    <button onClick={onNewChat}>
      + New Chat
    </button>
  </div>

  {/* Conversations List */}
  <div className="flex-1 overflow-y-auto p-2">
    {/* Today Section */}
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-neutral-500 px-2 mb-1">
        Today
      </h3>
      {todayConversations.map(conv => (
        <ConversationItem key={conv.id} {...conv} />
      ))}
    </div>

    {/* Yesterday Section */}
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-neutral-500 px-2 mb-1">
        Yesterday
      </h3>
      {yesterdayConversations.map(conv => (
        <ConversationItem key={conv.id} {...conv} />
      ))}
    </div>

    {/* Other date groups... */}
  </div>
</div>
```

**ConversationItem Subcomponent:**
```tsx
<div
  onClick={() => onSelectConversation(conv.id)}
  className={`
    p-3 rounded-lg cursor-pointer group
    ${isActive ? 'bg-neutral-100' : 'hover:bg-neutral-50'}
  `}
>
  <div className="flex items-center justify-between">
    <span className="text-sm truncate flex-1">
      {conv.title}
    </span>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDeleteConversation(conv.id);
      }}
      className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600"
    >
      <TrashIcon />
    </button>
  </div>
</div>
```

---

### 2. Updated AgentChatClient

**File**: `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

**Changes:**

1. **Add conversationId state:**
```typescript
const [conversationId, setConversationId] = useState<string | null>(null);
```

2. **Update sendMessage to include conversationId:**
```typescript
const response = await fetch('/api/v1/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage.content,
    conversationId: conversationId,
    sessionId: sessionId
  }),
  signal: abortController.signal
});
```

3. **Extract and store conversationId from response metadata:**
```typescript
if (parsed.type === 'metadata') {
  if (parsed.conversationId) {
    setConversationId(parsed.conversationId);
  }
  if (parsed.session_id) {
    setSessionId(parsed.session_id);
  }
}
```

4. **Add function to load conversation:**
```typescript
const loadConversation = async (convId: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/v1/agent/conversations/${convId}`);
    const data = await response.json();

    if (data.success) {
      setConversationId(data.conversation.id);
      setSessionId(data.conversation.sessionId);
      setMessages(data.conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })));
    }
  } catch (error) {
    console.error('Failed to load conversation:', error);
  } finally {
    setIsLoading(false);
  }
};
```

5. **Update clearChat to reset conversationId:**
```typescript
const clearChat = () => {
  if (messages.length > 0 || streamingContent) {
    const confirmed = window.confirm(
      'Are you sure you want to start a new chat? Current conversation will be saved.'
    );
    if (!confirmed) return;
  }

  setMessages([]);
  setStreamingContent('');
  setInput('');
  setSessionId(null);
  setConversationId(null); // Reset conversation ID
};
```

---

### 3. Updated AgentChatPage Layout

**File**: `src/app/(dashboard)/agent-chat/page.tsx`

**Changes:**
```tsx
export default async function AgentChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AgentChatSidebar
        userId={session.user.id}
        onSelectConversation={handleSelectConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1">
        <AgentChatClient user={session.user} />
      </div>
    </div>
  );
}
```

---

## Implementation Subtasks

### Subtask 1: Database Schema & Migration (1 hour)

**Action**: Create Prisma models and run migration

**Steps:**
1. Add `AgentConversation` and `AgentMessage` models to `prisma/schema.prisma`
2. Add relation to `User` model
3. Run `npx prisma migrate dev --name add-agent-conversations`
4. Run `npx prisma generate`
5. Verify schema in Prisma Studio

**Acceptance Criteria:**
- [x] Prisma models created with correct fields and types
- [x] Indexes added for performance
- [x] Migration runs successfully without errors
- [x] Cascade delete configured for messages
- [x] Prisma client regenerated

**Files:**
- `prisma/schema.prisma`
- `prisma/migrations/*/migration.sql`

---

### Subtask 2: Create Conversation API Endpoints (2-3 hours)

**Action**: Implement all 4 CRUD endpoints

#### 2.1: GET /api/v1/agent/conversations

**File**: `src/app/api/v1/agent/conversations/route.ts`

**Implementation:**
```typescript
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
```

**Acceptance Criteria:**
- [x] Returns user's conversations ordered by `updatedAt DESC`
- [x] Includes message count for each conversation
- [x] Supports pagination with limit and offset
- [x] Guests receive empty array
- [x] Returns 401 if not authenticated
- [x] RBAC enforced (users only see their own conversations)

---

#### 2.2: GET /api/v1/agent/conversations/:id

**File**: `src/app/api/v1/agent/conversations/[id]/route.ts`

**Implementation:**
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.agentConversation.findUnique({
    where: { id: params.id },
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
```

**Acceptance Criteria:**
- [x] Loads conversation with all messages
- [x] Messages ordered by timestamp ascending
- [x] Returns 404 if conversation not found
- [x] Returns 403 if user doesn't own conversation
- [x] Includes sessionId for resuming

---

#### 2.3: POST /api/v1/agent/conversations

**File**: `src/app/api/v1/agent/conversations/route.ts`

**Implementation:**
```typescript
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
```

**Acceptance Criteria:**
- [x] Creates new conversation for user
- [x] Truncates title to 60 characters
- [x] Enforces 50 conversation limit per user
- [x] Auto-deletes oldest conversation if limit exceeded
- [x] Guests cannot create conversations (403)
- [x] Validates required fields

---

#### 2.4: DELETE /api/v1/agent/conversations/:id

**File**: `src/app/api/v1/agent/conversations/[id]/route.ts`

**Implementation:**
```typescript
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversation = await prisma.agentConversation.findUnique({
    where: { id: params.id }
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
    where: { id: params.id }
  });

  return NextResponse.json({
    success: true,
    message: 'Conversation deleted successfully'
  });
}
```

**Acceptance Criteria:**
- [x] Deletes conversation and all messages (cascade)
- [x] Returns 404 if conversation not found
- [x] Returns 403 if user doesn't own conversation
- [x] Returns success message

---

### Subtask 3: Update Chat API to Save Messages (1-2 hours)

**Action**: Modify `/api/v1/agent/chat` to save messages to database

**File**: `src/app/api/v1/agent/chat/route.ts`

**Changes:**

1. **Accept conversationId in request:**
```typescript
const { message, sessionId, conversationId } = body;
```

2. **Create conversation if new:**
```typescript
let currentConversationId = conversationId;

if (!currentConversationId) {
  // Create new conversation
  const newConversation = await prisma.agentConversation.create({
    data: {
      userId: session.user.id,
      sessionId: sessionId || `new_${Date.now()}`,
      title: message.slice(0, 60)
    }
  });
  currentConversationId = newConversation.id;
}

// Verify conversation belongs to user
const conversation = await prisma.agentConversation.findUnique({
  where: { id: currentConversationId }
});

if (!conversation || conversation.userId !== session.user.id) {
  return NextResponse.json(
    { error: 'Invalid conversation ID' },
    { status: 403 }
  );
}
```

3. **Save user message before streaming:**
```typescript
// Save user message to database
await prisma.agentMessage.create({
  data: {
    conversationId: currentConversationId,
    role: 'user',
    content: message
  }
});
```

4. **Send conversationId in metadata:**
```typescript
// Send metadata including conversationId
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({
    type: 'metadata',
    conversationId: currentConversationId,
    session_id: currentSessionId || msg.session_id
  })}\n\n`
));
```

5. **Save assistant message after streaming:**
```typescript
// After streaming completes
if (collectedText) {
  await prisma.agentMessage.create({
    data: {
      conversationId: currentConversationId,
      role: 'assistant',
      content: collectedText
    }
  });

  // Update conversation's updatedAt timestamp
  await prisma.agentConversation.update({
    where: { id: currentConversationId },
    data: { updatedAt: new Date() }
  });
}
```

**Acceptance Criteria:**
- [x] Creates conversation on first message if no conversationId
- [x] Validates conversationId belongs to user
- [x] Saves user message before streaming
- [x] Saves assistant message after streaming completes
- [x] Returns conversationId in metadata
- [x] Updates conversation's updatedAt timestamp
- [x] Handles errors gracefully

---

### Subtask 4: Create Sidebar Component (2-3 hours)

**Action**: Build `AgentChatSidebar.tsx` component with conversation list

**File**: `src/app/(dashboard)/agent-chat/AgentChatSidebar.tsx`

**Implementation Structure:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/utils/date';

interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface AgentChatSidebarProps {
  userId: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

export default function AgentChatSidebar({
  userId,
  activeConversationId,
  onSelectConversation,
  onNewChat
}: AgentChatSidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

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
```

**Acceptance Criteria:**
- [x] Displays list of conversations grouped by date
- [x] Highlights active conversation
- [x] "New Chat" button at top
- [x] Delete button appears on hover
- [x] Confirmation dialog before deleting
- [x] Loading state while fetching conversations
- [x] Empty state when no conversations
- [x] Scrollable conversation list
- [x] Fixed width (16rem / 256px)

---

### Subtask 5: Update AgentChatClient for Conversation Management (2 hours)

**Action**: Modify `AgentChatClient.tsx` to work with conversations

**File**: `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

**Changes:**

1. **Add conversationId state:**
```typescript
const [conversationId, setConversationId] = useState<string | null>(null);
```

2. **Add prop for conversation loading:**
```typescript
interface AgentChatClientProps {
  user: User & { role: string };
  conversationId?: string | null; // NEW
  onConversationChange?: (id: string | null) => void; // NEW
}
```

3. **Load conversation when prop changes:**
```typescript
useEffect(() => {
  if (conversationId && conversationId !== currentConversationId) {
    loadConversation(conversationId);
  }
}, [conversationId]);

const loadConversation = async (convId: string) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/v1/agent/conversations/${convId}`);
    const data = await response.json();

    if (data.success) {
      setConversationId(data.conversation.id);
      setSessionId(data.conversation.sessionId);
      setMessages(data.conversation.messages.map((msg: any) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })));
    }
  } catch (error) {
    console.error('Failed to load conversation:', error);
  } finally {
    setIsLoading(false);
  }
};
```

4. **Update sendMessage to include conversationId:**
```typescript
const response = await fetch('/api/v1/agent/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage.content,
    conversationId: conversationId,
    sessionId: sessionId
  }),
  signal: abortController.signal
});
```

5. **Extract conversationId from metadata:**
```typescript
if (parsed.type === 'metadata') {
  if (parsed.conversationId) {
    setConversationId(parsed.conversationId);
    onConversationChange?.(parsed.conversationId);
  }
  if (parsed.session_id) {
    setSessionId(parsed.session_id);
  }
}
```

6. **Update clearChat:**
```typescript
const clearChat = () => {
  if (messages.length > 0 || streamingContent) {
    const confirmed = window.confirm(
      'Are you sure you want to start a new chat? Current conversation will be saved.'
    );
    if (!confirmed) return;
  }

  setMessages([]);
  setStreamingContent('');
  setInput('');
  setSessionId(null);
  setConversationId(null);
  onConversationChange?.(null);
};
```

**Acceptance Criteria:**
- [x] Loads conversation when conversationId prop changes
- [x] Sends conversationId with chat requests
- [x] Extracts and stores conversationId from metadata
- [x] Resets conversationId on clear chat
- [x] Notifies parent component of conversation changes

---

### Subtask 6: Update Page Layout (1 hour)

**Action**: Integrate sidebar into page layout

**File**: `src/app/(dashboard)/agent-chat/page.tsx`

**Implementation:**
```tsx
'use client';

import { useState } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AgentChatClient from './AgentChatClient';
import AgentChatSidebar from './AgentChatSidebar';

export default async function AgentChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <AgentChatPageClient user={session.user} />;
}

function AgentChatPageClient({ user }: { user: any }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
  };

  const handleConversationChange = (id: string | null) => {
    setActiveConversationId(id);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AgentChatSidebar
        userId={user.id}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 overflow-hidden">
        <AgentChatClient
          user={user}
          conversationId={activeConversationId}
          onConversationChange={handleConversationChange}
        />
      </div>
    </div>
  );
}
```

**Note**: Since we need to use `useState` for active conversation, we need to split the server component into server + client components.

**Acceptance Criteria:**
- [x] Sidebar and chat area side-by-side
- [x] Sidebar fixed width (256px)
- [x] Chat area takes remaining space
- [x] Full height layout (h-screen)
- [x] State management for active conversation

---

### Subtask 7: Testing & Polish (1-2 hours)

**Action**: Comprehensive testing and UI polish

**Testing Checklist:**

**Functional Testing:**
- [ ] Create new conversation (first message)
- [ ] Continue existing conversation
- [ ] Switch between conversations
- [ ] Delete conversation
- [ ] Delete active conversation (should start new chat)
- [ ] Conversation list updates after deletion
- [ ] Conversation limit enforcement (50 max)
- [ ] Oldest conversation auto-deleted when limit reached
- [ ] Load conversation persists messages
- [ ] Session resumption works correctly
- [ ] "New Chat" button starts fresh conversation

**RBAC Testing:**
- [ ] Users only see their own conversations
- [ ] Cannot access other users' conversations (403)
- [ ] Guests cannot create conversations
- [ ] Guests receive empty conversation list
- [ ] Cannot delete other users' conversations

**UI/UX Testing:**
- [ ] Sidebar scrolls when many conversations
- [ ] Active conversation highlighted
- [ ] Delete button shows on hover
- [ ] Confirmation dialog before delete
- [ ] Loading states display correctly
- [ ] Empty state displays when no conversations
- [ ] Conversation titles truncate properly
- [ ] Date grouping works correctly
- [ ] "New Chat" button is prominent

**Error Handling:**
- [ ] Network errors handled gracefully
- [ ] Invalid conversation ID returns 404
- [ ] Unauthorized access returns 403
- [ ] Failed deletes show error message
- [ ] Failed loads show error message

**Performance Testing:**
- [ ] Conversation list loads quickly
- [ ] Switching conversations is snappy
- [ ] No memory leaks (check DevTools)
- [ ] Database queries are efficient (check logs)

**Polish Items:**
- [ ] Add loading spinner for conversation load
- [ ] Add transition animations for sidebar items
- [ ] Add hover effects for better UX
- [ ] Ensure consistent spacing and colors
- [ ] Mobile responsive (though not priority)
- [ ] Keyboard navigation support (optional)

---

## Key Implementation Patterns

### 1. RBAC Enforcement

**At API Level:**
```typescript
// Always verify conversation ownership
const conversation = await prisma.agentConversation.findUnique({
  where: { id: conversationId }
});

if (!conversation || conversation.userId !== session.user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Guest Users:**
```typescript
// Guests should not have conversation history
if (session.user.role === 'GUEST') {
  return NextResponse.json({
    success: true,
    conversations: [],
    total: 0
  });
}
```

### 2. Conversation Title Generation

**From First User Message:**
```typescript
const title = message.slice(0, 60); // Truncate to 60 chars
```

**Examples:**
- "How many observations do I have?" → "How many observations do I have?"
- "Show me all high-risk Category A observations from the Pune plant for the last quarter" → "Show me all high-risk Category A observations from the P..."

### 3. 50 Conversation Limit Enforcement

**Auto-delete oldest when limit reached:**
```typescript
const count = await prisma.agentConversation.count({
  where: { userId: session.user.id }
});

if (count >= 50) {
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
```

### 4. Date Grouping Logic

**Group conversations by relative date:**
- **Today**: Same calendar day as now
- **Yesterday**: Previous calendar day
- **Last 7 Days**: 2-7 days ago
- **Last 30 Days**: 8-30 days ago
- **Older**: More than 30 days ago

### 5. Session Resumption

**Using Claude SDK's resume feature:**
```typescript
const agentQuery = query({
  prompt: message,
  options: {
    resume: sessionId, // Pass sessionId to resume conversation
    // ... other options
  }
});
```

---

## Technical Considerations

### Database Performance

**Indexes:**
- `@@index([userId, createdAt(sort: Desc)])` - Fast conversation list for user
- `@@index([userId, updatedAt(sort: Desc)])` - Fast recent conversations
- `@@index([conversationId, timestamp])` - Fast message retrieval

**Query Optimization:**
- Use `select` to fetch only needed fields
- Use `include` with `_count` for message counts
- Limit results with `take` and `skip` for pagination
- Consider caching conversation list for frequently accessed users

### Storage Estimates

**Per Conversation:**
- Conversation record: ~100 bytes
- Average message: ~500 bytes
- Average conversation: 5 messages = 2.5 KB
- 50 conversations per user: ~125 KB

**For 100 Users:**
- Total storage: ~12.5 MB (negligible)

### Scalability

**Current Implementation (MVP):**
- In-memory rate limiting (single server)
- Direct database writes (no queue)
- No caching layer

**Future Enhancements:**
- Redis for distributed rate limiting
- Message queue for async saving
- Redis cache for conversation lists
- CDN for static assets

---

## Error Handling

### API Errors

**Authentication Errors:**
```typescript
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Authorization Errors:**
```typescript
if (conversation.userId !== session.user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Not Found Errors:**
```typescript
if (!conversation) {
  return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
}
```

**Validation Errors:**
```typescript
if (!title || !sessionId) {
  return NextResponse.json(
    { error: 'Title and sessionId are required' },
    { status: 400 }
  );
}
```

### Frontend Error Handling

**Network Errors:**
```typescript
try {
  const response = await fetch('/api/v1/agent/conversations');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load conversations');
  }

  setConversations(data.conversations);
} catch (error) {
  console.error('Failed to load conversations:', error);
  // Show toast notification or error message
}
```

**User Feedback:**
- Show loading states during operations
- Display error messages for failed operations
- Provide retry mechanisms for transient failures

---

## Security Considerations

### RBAC Enforcement

**Always verify ownership:**
```typescript
// Every conversation query must include userId check
where: {
  id: conversationId,
  userId: session.user.id
}
```

**Guest users:**
- Cannot create conversations
- Cannot save messages
- Receive empty conversation list

**Cross-user access:**
- Users cannot view other users' conversations
- CFO/CXO_TEAM do not have special access (per requirements)

### Data Sanitization

**User input:**
- Conversation titles truncated to 60 chars
- Message content stored as-is (no HTML/script injection risk in text storage)
- No file uploads in conversation history

**SQL Injection:**
- Protected by Prisma's parameterized queries
- No raw SQL queries used

### Rate Limiting

**Existing rate limiting applies:**
- 20 requests per minute per user (from TASK 6)
- Applies to chat API, not conversation CRUD
- Consider separate limits for conversation CRUD (future)

---

## Future Enhancements (Post-MVP)

### Conversation Features
- [ ] Manual conversation renaming
- [ ] Conversation search
- [ ] Favorite/pin conversations
- [ ] Conversation folders/tags
- [ ] Export conversation to PDF/text
- [ ] Share conversation (with permission)

### UI/UX Improvements
- [ ] Keyboard shortcuts (Cmd+K for new chat)
- [ ] Drag to reorder conversations
- [ ] Conversation preview on hover
- [ ] Dark mode support
- [ ] Custom sidebar width
- [ ] Collapse/expand sidebar

### Advanced Features
- [ ] Conversation templates
- [ ] Shared team conversations
- [ ] Conversation analytics (tokens, cost per conversation)
- [ ] Bulk delete conversations
- [ ] Archive instead of delete
- [ ] Conversation backup/restore

### Performance Optimizations
- [ ] Virtual scrolling for long conversation lists
- [ ] Lazy load old messages
- [ ] Cache conversation list in Redis
- [ ] WebSocket updates for real-time sync
- [ ] Optimistic UI updates

---

## Testing Strategy

### Unit Tests (Optional for MVP)

**API Endpoints:**
- Test conversation CRUD operations
- Test RBAC enforcement
- Test validation logic
- Test error handling

**Frontend Components:**
- Test sidebar rendering
- Test conversation selection
- Test delete functionality
- Test date grouping logic

### Integration Tests

**Full Flow:**
1. Create new conversation (first message)
2. Continue conversation (send more messages)
3. Switch to different conversation
4. Resume old conversation
5. Delete conversation
6. Verify conversation limit enforcement

**RBAC Flow:**
1. Test as each role (CFO, AUDITOR, GUEST, etc.)
2. Verify guests cannot save conversations
3. Verify cross-user access denied

### Manual Testing

**Browser Testing:**
- Chrome, Firefox, Safari
- Test in private/incognito mode
- Test with different screen sizes
- Test with slow network (throttling)

**User Scenarios:**
- New user with no conversations
- User with 1-2 conversations
- User with 50+ conversations (limit test)
- User switching rapidly between conversations
- User deleting active conversation

---

## Deployment Checklist

### Pre-deployment

- [ ] Run database migration on production
- [ ] Verify migration successful
- [ ] Test on staging environment
- [ ] Review all code changes
- [ ] Update environment variables if needed

### Deployment Steps

1. **Database Migration:**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Build Application:**
   ```bash
   npm run build:prod
   ```

3. **Deploy:**
   ```bash
   pm2 restart ecosystem.config.js
   ```

4. **Verify:**
   - Check application starts successfully
   - Test creating conversation
   - Test loading conversations
   - Check database records created

### Post-deployment Monitoring

- [ ] Monitor error logs for API failures
- [ ] Check database performance (query times)
- [ ] Verify RBAC working correctly
- [ ] Monitor conversation table growth
- [ ] Check user feedback

---

## Documentation Updates

### User Documentation

**New Features to Document:**
- How to view conversation history
- How to switch between conversations
- How to delete conversations
- Understanding conversation limits (50 max)
- What happens to conversations when limit reached

### Developer Documentation

**API Documentation:**
- Document new endpoints
- Update API reference
- Add examples for each endpoint
- Document error codes

**Architecture Documentation:**
- Update architecture diagram
- Document database schema
- Explain session management
- Document conversation lifecycle

---

## Success Metrics

### Functional Metrics
- ✅ Users can view their conversation history
- ✅ Users can switch between conversations seamlessly
- ✅ Users can delete conversations
- ✅ Conversations persist across sessions
- ✅ 50 conversation limit enforced
- ✅ RBAC enforced correctly

### Performance Metrics
- Conversation list loads in < 500ms
- Conversation load in < 1s
- Switching conversations feels instant (< 200ms)
- No noticeable memory leaks
- Database queries optimized

### User Experience Metrics
- Intuitive sidebar navigation
- Clear visual feedback
- Smooth animations and transitions
- Helpful empty states
- Clear error messages

---

## Timeline Estimate

**Total Time: 8-10 hours**

| Subtask | Time Estimate |
|---------|---------------|
| 1. Database Schema & Migration | 1 hour |
| 2. API Endpoints | 2-3 hours |
| 3. Update Chat API | 1-2 hours |
| 4. Sidebar Component | 2-3 hours |
| 5. Update Chat Client | 2 hours |
| 6. Update Page Layout | 1 hour |
| 7. Testing & Polish | 1-2 hours |

**Breakdown by Day:**
- **Day 1 (4 hours)**: Database + API endpoints
- **Day 2 (4-6 hours)**: Frontend components + integration

---

## Conclusion

This implementation provides a solid, production-ready conversation history feature that mirrors ChatGPT's user experience. The database-backed approach ensures reliability and scalability, while the 50-conversation limit keeps storage manageable. The RBAC enforcement maintains security, and the sidebar UI provides an intuitive user experience.

**Key Benefits:**
- ✅ Persistent conversation history
- ✅ ChatGPT-style sidebar UI
- ✅ Secure with RBAC enforcement
- ✅ Scalable architecture
- ✅ Clean, maintainable code
- ✅ Comprehensive error handling

**Next Steps After Completion:**
1. Gather user feedback
2. Monitor performance metrics
3. Consider future enhancements based on usage patterns
4. Add analytics for conversation usage
5. Optimize based on production data
