# Task 6: Create Chat UI Components

**Duration:** 3-4 hours

**Status:** ✅ COMPLETED

---

## Analysis

This task implements the user-facing chat interface for the AI Agent MVP. The implementation consists of two components following Next.js 15 App Router patterns:

1. **Server Component** (`page.tsx`) - Handles authentication and initial page rendering
2. **Client Component** (`AgentChatClient.tsx`) - Manages chat state, user interactions, and API communication

The design follows the codebase's existing patterns:
- Uses NextAuth v5 for authentication (matching `/src/lib/auth.ts`)
- Follows Tailwind CSS utility classes (matching `NavBar.tsx`)
- Implements role-based UI patterns (matching RBAC system)
- Uses simple, clean design without complex state management

**Key Design Decisions:**
- No streaming (MVP simplicity - wait for full response)
- No conversation history persistence (in-memory only)
- Desktop-first UI (mobile optimization post-MVP)
- Direct API calls without additional abstraction layers
- Auto-scroll to latest message for better UX

---

## Subtasks

### Phase A: Setup and Directory Structure

#### 1. Create Agent Chat Directory
**Action**: Create the directory structure for the agent chat feature
**Context**: Next.js App Router requires proper directory nesting within `(dashboard)` group
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/agent-chat/`
**Acceptance**:
- Directory exists at the correct path
- No TypeScript errors when running `npm run typecheck`

**Commands**:
```bash
mkdir -p /Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/\(dashboard\)/agent-chat
```

**Time Estimate**: 2 minutes

---

### Phase B: Server Component Implementation

#### 2. Create Server Component Page
**Action**: Implement `page.tsx` with authentication and layout
**Context**: Server component handles auth check and redirects unauthorized users
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/agent-chat/page.tsx`
**Reference**: MVP_PLAN.md lines 796-836

**Implementation**:
```typescript
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

**Acceptance**:
- File created at correct path
- `auth()` import works correctly
- Metadata exports properly
- Redirects to `/login` when not authenticated
- TypeScript compilation succeeds
- No runtime errors when visiting `/agent-chat`

**Verification Steps**:
1. Run `npm run typecheck` - should pass
2. Start dev server: `npm run dev`
3. Visit `http://localhost:3005/agent-chat` without login - should redirect to `/login`
4. Login and visit `/agent-chat` - should render (will error until client component exists)

**Time Estimate**: 15 minutes

---

### Phase C: Client Component - Foundation

#### 3. Create Client Component File with Base Structure
**Action**: Create `AgentChatClient.tsx` with imports, interfaces, and empty component shell
**Context**: Client component manages all interactive chat functionality
**Files**: `/Users/vandit/Desktop/Projects/EZAudit/audit-platform/src/app/(dashboard)/agent-chat/AgentChatClient.tsx`
**Reference**: MVP_PLAN.md lines 844-866

**Implementation**:
```typescript
/**
 * Agent Chat Client - MVP Version
 *
 * Simple chat interface with message list and input.
 * No streaming - shows loading spinner while waiting for response.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from 'next-auth';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatClientProps {
  user: User & { role: string };
}

export default function AgentChatClient({ user }: AgentChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white rounded-lg shadow border border-neutral-200 flex flex-col" style={{ height: '600px' }}>
      {/* TODO: Add header */}
      {/* TODO: Add messages area */}
      {/* TODO: Add input area */}
    </div>
  );
}
```

**Acceptance**:
- File created with correct `'use client'` directive
- TypeScript interfaces defined
- State variables initialized
- Component compiles without errors
- Page renders empty container

**Verification Steps**:
1. Run `npm run typecheck` - should pass
2. Visit `/agent-chat` - should see white container (no content yet)
3. No console errors

**Time Estimate**: 10 minutes

---

#### 4. Implement Header Section
**Action**: Add header with user info display
**Context**: Shows logged-in user's name and role for context
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 939-946

**Implementation** (replace header TODO):
```typescript
{/* Header */}
<div className="p-4 border-b border-neutral-200">
  <div className="text-sm text-neutral-600">
    <span className="font-medium">{user.name || user.email}</span>
    <span className="mx-2">•</span>
    <span className="text-neutral-500">{user.role}</span>
  </div>
</div>
```

**Acceptance**:
- Header displays user name (or email if no name)
- Displays user role
- Proper styling with border separator
- Matches NavBar styling patterns

**Verification Steps**:
1. Visit `/agent-chat` - should see header with user info
2. Verify correct user name/email displays
3. Verify role displays (e.g., "AUDITOR", "CFO")

**Time Estimate**: 10 minutes

---

### Phase D: Client Component - Message Display

#### 5. Implement Empty State with Example Questions
**Action**: Add empty state UI with example question prompts
**Context**: Helps users understand what they can ask when chat is empty
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 948-965

**Implementation** (inside messages area):
```typescript
{/* Messages Area */}
<div className="flex-1 overflow-y-auto p-4 space-y-4">
  {messages.length === 0 && (
    <div className="text-center py-12 text-neutral-500">
      <p className="mb-4">Ask me about your observations!</p>
      <div className="text-sm space-y-2 max-w-md mx-auto text-left">
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          "How many observations do I have?"
        </div>
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          "Show me my draft observations"
        </div>
        <div className="bg-neutral-50 p-2 rounded border border-neutral-200">
          "How many high-risk observations?"
        </div>
      </div>
    </div>
  )}

  {/* TODO: Add message list rendering */}
  {/* TODO: Add loading indicator */}

  <div ref={messagesEndRef} />
</div>
```

**Acceptance**:
- Empty state displays when no messages
- Three example questions shown
- Proper styling and centering
- Hidden when messages exist

**Verification Steps**:
1. Visit `/agent-chat` - should see example questions
2. Verify all three examples display correctly
3. Verify styling matches design (neutral colors, borders)

**Time Estimate**: 15 minutes

---

#### 6. Implement Message List Rendering
**Action**: Add dynamic message rendering with role-based styling
**Context**: Displays user messages (right, blue) and assistant messages (left, gray)
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 967-982

**Implementation** (replace message list TODO):
```typescript
{messages.map((message) => (
  <div
    key={message.id}
    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`max-w-[75%] rounded-lg p-3 ${
        message.role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-100 text-neutral-900'
      }`}
    >
      <div className="whitespace-pre-wrap break-words">{message.content}</div>
    </div>
  </div>
))}
```

**Acceptance**:
- Messages render in a loop
- User messages appear on right with blue background
- Assistant messages appear on left with gray background
- Text wraps properly with `whitespace-pre-wrap`
- Max width prevents messages from being too wide

**Verification Steps**:
1. Temporarily add test messages to state in component
2. Verify user messages appear right-aligned and blue
3. Verify assistant messages appear left-aligned and gray
4. Test with long message - should wrap properly

**Time Estimate**: 15 minutes

---

#### 7. Implement Loading Indicator
**Action**: Add animated loading dots while waiting for response
**Context**: Provides visual feedback during API call
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 984-994

**Implementation** (replace loading TODO):
```typescript
{isLoading && (
  <div className="flex justify-start">
    <div className="bg-neutral-100 rounded-lg p-3">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  </div>
)}
```

**Acceptance**:
- Loading indicator shows when `isLoading` is true
- Three dots bounce with staggered animation
- Positioned on left like assistant messages
- Hidden when not loading

**Verification Steps**:
1. Temporarily set `isLoading` to true in component
2. Verify three bouncing dots appear
3. Verify animation timing looks smooth
4. Set back to false - should disappear

**Time Estimate**: 10 minutes

---

#### 8. Implement Auto-Scroll Effect
**Action**: Add useEffect to auto-scroll to bottom when messages change
**Context**: Ensures latest message is always visible
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 874-877

**Implementation** (add after state declarations):
```typescript
// Auto-scroll to bottom when messages change
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```

**Acceptance**:
- Effect runs when `messages` array changes
- Scrolls to `messagesEndRef` element
- Smooth scrolling behavior

**Verification Steps**:
1. Add multiple test messages to trigger scroll
2. Verify page auto-scrolls to bottom
3. Verify smooth animation (not instant jump)

**Time Estimate**: 5 minutes

---

### Phase E: Client Component - Input and API Integration

#### 9. Implement Send Message Function
**Action**: Create `sendMessage` async function with API integration
**Context**: Core function that handles message sending and response handling
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 879-928

**Implementation** (add before return statement):
```typescript
const sendMessage = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage: Message = {
    id: `user-${Date.now()}`,
    role: 'user',
    content: input.trim(),
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInput('');
  setIsLoading(true);

  try {
    const response = await fetch('/api/v1/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage.content })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to get response');
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: data.response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
  } catch (error: any) {
    console.error('Error sending message:', error);

    const errorMessage: Message = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: 'Sorry, I encountered an error while processing your request. Please try again.',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};
```

**Acceptance**:
- Function validates input is not empty
- Prevents sending while loading
- Adds user message immediately to UI
- Clears input field
- Makes API call to `/api/v1/agent/chat`
- Handles successful response
- Handles errors gracefully
- Always clears loading state

**Verification Steps**:
1. Run `npm run typecheck` - should pass
2. Test will be done in later phase after input UI is added

**Time Estimate**: 20 minutes

---

#### 10. Implement Keyboard Handler
**Action**: Create `handleKeyPress` function for Enter/Shift+Enter behavior
**Context**: Allows Enter to send, Shift+Enter for new line
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 930-935

**Implementation** (add after sendMessage):
```typescript
const handleKeyPress = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};
```

**Acceptance**:
- Enter key sends message
- Shift+Enter creates new line (default textarea behavior)
- Prevents default Enter behavior to avoid double newline

**Verification Steps**:
1. Test will be done after input UI is added

**Time Estimate**: 5 minutes

---

#### 11. Implement Input Area UI
**Action**: Add textarea input and send button with proper state bindings
**Context**: User input interface with keyboard shortcuts
**Files**: Same file as subtask #3
**Reference**: MVP_PLAN.md lines 999-1023

**Implementation** (replace input area TODO):
```typescript
{/* Input Area */}
<div className="p-4 border-t border-neutral-200">
  <div className="flex gap-2">
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder="Ask a question..."
      className="flex-1 resize-none rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      rows={2}
      disabled={isLoading}
    />
    <button
      onClick={sendMessage}
      disabled={!input.trim() || isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
    >
      {isLoading ? 'Sending...' : 'Send'}
    </button>
  </div>
  <div className="text-xs text-neutral-500 mt-1">
    Press Enter to send, Shift+Enter for new line
  </div>
</div>
```

**Acceptance**:
- Textarea bound to `input` state
- OnChange updates state
- OnKeyPress calls handler
- Disabled while loading
- Send button disabled when input empty or loading
- Button shows "Sending..." when loading
- Help text displays keyboard shortcuts
- Proper focus styling

**Verification Steps**:
1. Visit `/agent-chat` - should see input and button
2. Type in textarea - should update
3. Click send with empty input - button should be disabled
4. Type text - button should become enabled
5. Press Enter - should trigger send (will fail until API works)
6. Press Shift+Enter - should create new line

**Time Estimate**: 20 minutes

---

### Phase F: Integration Testing

#### 12. End-to-End Manual Testing
**Action**: Test complete chat flow with real API
**Context**: Verify all pieces work together
**Files**: All files from previous subtasks

**Test Cases**:

**Test 1: Authentication Flow**
- [ ] Visit `/agent-chat` without login → redirects to `/login`
- [ ] Login as `auditor@example.com` / `auditor123`
- [ ] Navigate to `/agent-chat` → page loads successfully
- [ ] Header shows correct user name and role

**Test 2: UI Rendering**
- [ ] Empty state displays with 3 example questions
- [ ] Input field is enabled and accepts text
- [ ] Send button is disabled when input is empty
- [ ] Send button is enabled when text is entered

**Test 3: Send Message**
- [ ] Type "How many observations do I have?"
- [ ] Click Send button
- [ ] User message appears on right (blue background)
- [ ] Loading dots appear below
- [ ] After response, assistant message appears on left (gray background)
- [ ] Loading dots disappear
- [ ] Input field is cleared
- [ ] Send button is re-enabled

**Test 4: Keyboard Shortcuts**
- [ ] Type text and press Enter → sends message
- [ ] Type text and press Shift+Enter → creates new line
- [ ] Multi-line messages display correctly

**Test 5: Auto-Scroll**
- [ ] Send 5+ messages to fill container
- [ ] Verify page auto-scrolls to bottom
- [ ] Latest message is always visible

**Test 6: Error Handling**
- [ ] Stop backend temporarily
- [ ] Send message → error message displays
- [ ] Error message appears as assistant message
- [ ] Input remains functional

**Test 7: Loading State**
- [ ] Input disabled while loading
- [ ] Button disabled while loading
- [ ] Button shows "Sending..." text
- [ ] Cannot send multiple messages simultaneously

**Test 8: Role-Based Access**
- [ ] Login as different roles (CFO, AUDIT_HEAD, AUDITEE)
- [ ] Verify each can access `/agent-chat`
- [ ] Verify responses respect RBAC (check with role-specific queries)

**Acceptance**:
- All test cases pass
- No console errors
- No TypeScript errors
- UI is responsive and functional
- API integration works correctly

**Time Estimate**: 45 minutes

---

#### 13. Cross-Browser Testing
**Action**: Test in Chrome, Firefox, and Safari
**Context**: Ensure CSS animations and layouts work across browsers

**Test in Each Browser**:
- [ ] Chrome: Full functionality test
- [ ] Firefox: Full functionality test
- [ ] Safari: Full functionality test
- [ ] Edge (optional): Full functionality test

**Specific Checks**:
- [ ] Loading dots animation works
- [ ] Auto-scroll smooth behavior works
- [ ] Textarea focus ring displays correctly
- [ ] Button hover states work
- [ ] Message bubble styling renders correctly

**Acceptance**:
- All browsers display UI correctly
- All interactions work in all browsers
- No browser-specific CSS issues

**Time Estimate**: 20 minutes

---

### Phase G: Code Quality and Documentation

#### 14. Code Review and Cleanup
**Action**: Review all code for quality, consistency, and best practices
**Context**: Ensure code matches project standards

**Review Checklist**:
- [ ] TypeScript types are properly defined (no `any` types)
- [ ] Comments explain complex logic
- [ ] Variable names are descriptive
- [ ] No console.logs left in code (except error logging)
- [ ] Code matches existing codebase patterns
- [ ] Proper error boundaries exist
- [ ] No unused imports
- [ ] Consistent formatting

**Commands**:
```bash
npm run typecheck
npm run lint
```

**Acceptance**:
- No TypeScript errors
- No ESLint warnings
- Code is clean and well-documented

**Time Estimate**: 15 minutes

---

#### 15. Final Verification Checklist
**Action**: Complete final verification before marking task complete
**Context**: Ensure all requirements met

**Verification**:
- [ ] File `src/app/(dashboard)/agent-chat/page.tsx` exists
- [ ] File `src/app/(dashboard)/agent-chat/AgentChatClient.tsx` exists
- [ ] Both files compile without errors
- [ ] Authentication redirect works
- [ ] User info displays in header
- [ ] Empty state shows example questions
- [ ] Messages display correctly (user right, assistant left)
- [ ] Loading indicator animates
- [ ] Auto-scroll works
- [ ] Input field works
- [ ] Send button works
- [ ] Enter key sends message
- [ ] Shift+Enter creates new line
- [ ] API integration works
- [ ] Error handling works
- [ ] RBAC is respected

**Acceptance**:
- All items checked
- Task is complete and ready for next phase

**Time Estimate**: 10 minutes

---

## Dependencies

**Before Starting**:
- ✅ TASK_1: Dependencies installed (Claude Agent SDK)
- ✅ TASK_2: Type definitions created
- ✅ TASK_3: RBAC query functions implemented
- ✅ TASK_4: MCP server created
- ✅ TASK_5: API endpoint implemented and working

**After Completion**:
- Proceed to TASK_7: Add Navigation Link

---

## Testing Checkpoints

### Checkpoint 1 (After Subtask 2)
- Server component renders
- Auth redirect works
- No TypeScript errors

### Checkpoint 2 (After Subtask 4)
- Header displays with user info
- Container renders correctly

### Checkpoint 3 (After Subtask 7)
- Empty state displays
- Messages render (with test data)
- Loading indicator works

### Checkpoint 4 (After Subtask 11)
- Input field works
- Send button works
- Keyboard shortcuts work

### Checkpoint 5 (After Subtask 12)
- Full end-to-end flow works
- API integration successful
- All test cases pass

---

## Time Breakdown

| Phase | Subtasks | Estimated Time |
|-------|----------|----------------|
| Phase A: Setup | 1 | 2 min |
| Phase B: Server Component | 2 | 15 min |
| Phase C: Client Foundation | 3-4 | 25 min |
| Phase D: Message Display | 5-8 | 45 min |
| Phase E: Input & API | 9-11 | 45 min |
| Phase F: Integration Testing | 12-13 | 65 min |
| Phase G: Code Quality | 14-15 | 25 min |
| **Total** | **15 subtasks** | **3 hours 22 min** |

*Note: Total includes buffer time for debugging and iterations*

---

## Troubleshooting

### Issue: TypeScript Error - Cannot find module 'next-auth'
**Solution**: Ensure NextAuth is installed and types are available
```bash
npm install next-auth
```

### Issue: API Call Returns 404
**Solution**: Verify TASK_5 is complete and API endpoint exists at `/api/v1/agent/chat`

### Issue: Session is null
**Solution**: Ensure user is logged in. Clear cookies and login again.

### Issue: Loading Dots Don't Animate
**Solution**: Verify Tailwind CSS `animate-bounce` is configured. Check `tailwind.config.js`.

### Issue: Messages Don't Auto-Scroll
**Solution**: Check that `messagesEndRef` is properly attached to div and useEffect is running.

### Issue: Enter Key Doesn't Send
**Solution**: Verify `onKeyPress` handler is correctly bound to textarea.

---

## Success Criteria

Task 6 is complete when:
- ✅ Both files created and compile without errors
- ✅ Page accessible at `/agent-chat` with authentication
- ✅ Chat interface renders correctly
- ✅ Messages can be sent and received
- ✅ UI is functional and matches design
- ✅ All manual tests pass
- ✅ Code quality checks pass
- ✅ No console errors in browser

---

## Completion Notes

**Completed:** 2025-10-27

### Implementation Summary
All phases completed successfully:
- ✅ Phase A: Directory structure created
- ✅ Phase B: Server component (page.tsx) implemented with authentication
- ✅ Phase C: Client component foundation with header
- ✅ Phase D: Message display (empty state, message list, loading indicator, auto-scroll)
- ✅ Phase E: Input and API integration (send message, keyboard handler, input UI)
- ✅ Phase F: End-to-end testing completed via Playwright
- ✅ Phase G: Code quality verified (TypeScript & ESLint pass)

### Files Created
1. `/src/app/(dashboard)/agent-chat/page.tsx` - Server component with auth
2. `/src/app/(dashboard)/agent-chat/AgentChatClient.tsx` - Client component with full chat UI

### Testing Results
**Manual testing via Playwright MCP:**
- ✅ Authentication redirect works correctly
- ✅ Header displays user name and role
- ✅ Empty state shows example questions
- ✅ Messages render correctly (user right/blue, assistant left/gray)
- ✅ Loading indicator displays during API calls
- ✅ Auto-scroll works smoothly
- ✅ Input field and send button work correctly
- ✅ Enter key sends message
- ✅ API integration functional with `/api/v1/agent/chat`
- ✅ Error handling works (tested in logs)

**Code Quality:**
- ✅ TypeScript compilation: No errors in new components
- ✅ ESLint: No warnings in new components
- ✅ Dev server: Compiles successfully

### Screenshots
- `agent-chat-test-1.png` - Initial message exchange
- `agent-chat-test-2.png` - Multiple messages with scrolling

### Important Notes
1. **API Integration:** Successfully integrates with Task 5's `/api/v1/agent/chat` endpoint
2. **RBAC:** Respects user roles via session (header shows role)
3. **No Streaming:** MVP uses full response (not streaming) as designed
4. **In-Memory Only:** Conversation history not persisted (MVP requirement)
5. **Desktop-First:** UI optimized for desktop, mobile optimization post-MVP

### Known Pre-Existing Issues
- Some TypeScript errors in other files (mcp-server.ts, admin pages) - not related to this task
- ESLint warnings in other files - not related to this task

---

## Next Steps

After completing this task:
1. Mark Task 6 as complete in `README.md`
2. Proceed to **TASK_7.md** - Add Navigation Link
3. Test navigation flow from main app to chat

---

## References

- **MVP_PLAN.md**: Lines 796-1034 (complete implementation)
- **AGENT_INTEGRATION_PLAN.md**: Architecture overview
- **src/lib/auth.ts**: Authentication patterns
- **src/components/NavBar.tsx**: UI styling reference
- **CLAUDE.md**: Project conventions and patterns
