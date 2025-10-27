# TASK 5: UI/UX Improvements

## Overview
Enhance the agent chat interface with modern UX features including clickable examples, better error messages, improved visual feedback, and polish for the streaming experience.

## Current State
- Basic chat interface with loading spinner
- Static example questions (not clickable)
- Generic error messages
- Simple message display
- No visual feedback during streaming

## Target State
- Streaming text display with animated cursor
- Clickable example questions
- Clear chat button in header
- Better error messages (categorized and user-friendly)
- Enhanced visual feedback (timestamps, avatars, spacing)
- Smooth scroll animations
- Professional, polished interface

## Acceptance Criteria
- [ ] Streaming text displays with animated cursor
- [ ] Stop button replaces Send button during streaming
- [ ] Clear chat button works and is well-positioned
- [ ] Example questions are clickable and populate input
- [ ] Error messages are categorized and user-friendly
- [ ] Message styling is improved (spacing, colors, typography)
- [ ] Smooth scroll to latest message
- [ ] Empty state is engaging and helpful
- [ ] UI feels polished and professional

## Implementation Details

### 5.1 Streaming Text Display

**File**: `src/app/(dashboard)/agent-chat/AgentChatClient.tsx`

**Add Animated Streaming Cursor**:

```tsx
{streamingContent && (
  <div className="flex justify-start mb-4">
    <div className="max-w-[80%] rounded-lg p-4 bg-neutral-100 dark:bg-neutral-800">
      <div className="whitespace-pre-wrap text-neutral-900 dark:text-neutral-100">
        {streamingContent}
        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
      </div>
    </div>
  </div>
)}
```

**Alternative Cursor Animation** (blinking):
```css
@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

.streaming-cursor {
  animation: blink 1s infinite;
}
```

### 5.2 Stop Generation Button

**Replace Send Button with Stop When Streaming**:

```tsx
<div className="flex gap-2">
  <input
    type="text"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isLoading) sendMessage();
      }
    }}
    placeholder="Ask about your observations, audits, or stats..."
    className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    disabled={isLoading}
  />

  {isLoading ? (
    <button
      onClick={stopGeneration}
      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
    >
      Stop
    </button>
  ) : (
    <button
      onClick={sendMessage}
      disabled={!input.trim()}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors font-medium"
    >
      Send
    </button>
  )}
</div>
```

**Stop Handler**:
```typescript
const stopGeneration = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    setIsLoading(false);

    // Save partial response
    if (streamingContent) {
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: streamingContent + '\n\n_[Generation stopped by user]_',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStreamingContent('');
    }
  }
};
```

### 5.3 Clear Chat Button

**Add to Chat Header**:

```tsx
<div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 p-4">
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        AI Assistant
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Ask questions about your observations and audits
      </p>
    </div>

    <button
      onClick={clearChat}
      disabled={messages.length === 0}
      className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Clear Chat
    </button>
  </div>
</div>
```

**Clear Handler** (with optional confirmation):
```typescript
const clearChat = () => {
  // Optional: Add confirmation dialog
  const confirmClear = window.confirm('Are you sure you want to clear the chat history?');
  if (!confirmClear) return;

  setMessages([]);
  setStreamingContent('');
};
```

### 5.4 Better Empty State with Clickable Examples

**Enhanced Empty State**:

```tsx
{messages.length === 0 && !streamingContent && (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="max-w-2xl w-full space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Ask me anything about your audits
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Try one of these example questions, or ask your own
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Example Questions:
        </p>
        {EXAMPLE_QUESTIONS.map((question, index) => (
          <button
            key={index}
            onClick={() => {
              setInput(question.text);
              // Optionally auto-send:
              // sendMessage(question.text);
            }}
            className="w-full text-left bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{question.icon}</span>
              <div className="flex-1">
                <p className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {question.text}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {question.description}
                </p>
              </div>
              <svg className="w-5 h-5 text-neutral-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Example Questions Data**:
```typescript
const EXAMPLE_QUESTIONS = [
  {
    icon: '📊',
    text: 'How many of my observations are in draft status?',
    description: 'Get a quick count of your draft observations'
  },
  {
    icon: '🔍',
    text: 'Show me all high-risk (Category A) observations from the last month',
    description: 'Filter observations by risk and date'
  },
  {
    icon: '📋',
    text: 'What audits am I assigned to?',
    description: 'View your active audit assignments'
  },
  {
    icon: '📈',
    text: 'Give me a summary of observations by risk category',
    description: 'Statistical breakdown of observations'
  }
];
```

### 5.5 Enhanced Visual Feedback

**Improved Message Display**:

```tsx
<div className="space-y-4">
  {messages.map((message) => (
    <div
      key={message.id}
      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] rounded-lg p-4 ${
        message.role === 'user'
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
      }`}>
        <div className="flex items-start gap-3">
          {message.role === 'assistant' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-sm">🤖</span>
            </div>
          )}

          <div className="flex-1">
            <div className="whitespace-pre-wrap">
              {message.content}
            </div>

            {message.timestamp && (
              <div className={`text-xs mt-2 ${
                message.role === 'user'
                  ? 'text-blue-100'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {formatRelativeTime(message.timestamp)}
              </div>
            )}
          </div>

          {message.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
              {session?.user?.name?.[0] || 'U'}
            </div>
          )}
        </div>
      </div>
    </div>
  ))}
</div>
```

**Relative Time Formatter**:
```typescript
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
```

### 5.6 Better Error Handling

**Categorized Error Messages**:

```typescript
function getErrorMessage(error: any): string {
  const errorStr = error?.message || error?.toString() || '';

  // Authentication errors
  if (errorStr.includes('session') || errorStr.includes('authentication')) {
    return '⚠️ Your session has expired. Please refresh the page and log in again.';
  }

  // Permission errors
  if (errorStr.includes('permission') || errorStr.includes('unauthorized')) {
    return '🔒 You don\'t have permission to access that data. Contact your administrator if you believe this is an error.';
  }

  // Database errors
  if (errorStr.includes('database') || errorStr.includes('prisma')) {
    return '💾 Database error occurred. Please try again in a moment.';
  }

  // Rate limit errors
  if (errorStr.includes('rate limit') || errorStr.includes('too many')) {
    return '⏱️ You\'re sending requests too quickly. Please wait a moment and try again.';
  }

  // Network errors
  if (errorStr.includes('fetch') || errorStr.includes('network')) {
    return '🌐 Network error. Please check your connection and try again.';
  }

  // Agent/AI errors
  if (errorStr.includes('agent') || errorStr.includes('claude')) {
    return '🤖 AI service error. Please try rephrasing your question or try again later.';
  }

  // Generic error
  return '❌ An unexpected error occurred. Please try again.';
}
```

**Display Error in Chat**:
```typescript
// In error handling
const errorMessage: Message = {
  id: Date.now().toString(),
  role: 'assistant',
  content: getErrorMessage(error),
  timestamp: new Date()
};
setMessages(prev => [...prev, errorMessage]);
```

### 5.7 Smooth Scroll Animation

**Auto-scroll to Latest Message**:

```typescript
const messagesEndRef = useRef<HTMLDivElement>(null);

const scrollToBottom = () => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
};

useEffect(() => {
  scrollToBottom();
}, [messages, streamingContent]);

// In JSX, add ref at the end of messages:
<div ref={messagesEndRef} />
```

## Testing Checklist

### Streaming Display
- [ ] Animated cursor appears during streaming
- [ ] Cursor animation is smooth (no flickering)
- [ ] Text updates in real-time
- [ ] Cursor disappears when streaming completes

### Buttons
- [ ] Stop button appears during streaming
- [ ] Stop button disappears after streaming completes
- [ ] Clear chat button is visible and accessible
- [ ] Clear chat button disabled when no messages
- [ ] Send button disabled when input is empty

### Example Questions
- [ ] All example questions are clickable
- [ ] Clicking populates the input field
- [ ] Questions are relevant and helpful
- [ ] Icons display correctly
- [ ] Hover states work smoothly

### Error Handling
- [ ] Session errors show appropriate message
- [ ] Permission errors show appropriate message
- [ ] Database errors show appropriate message
- [ ] Rate limit errors show appropriate message
- [ ] Network errors show appropriate message
- [ ] All error messages are user-friendly

### Visual Polish
- [ ] Message spacing is consistent
- [ ] Colors are accessible (sufficient contrast)
- [ ] Dark mode works correctly (if applicable)
- [ ] Timestamps display correctly
- [ ] User avatars/initials display correctly
- [ ] Smooth scroll works
- [ ] Empty state is engaging

### Responsive Design
- [ ] Works on desktop (1920x1080)
- [ ] Works on laptop (1366x768)
- [ ] Works on tablet (768x1024)
- [ ] Messages don't overflow on small screens

## Dependencies
- **TASK_1** (Streaming Architecture) - Must be completed first
  - Requires streaming implementation
  - Requires stop generation functionality

## Related Tasks
- TASK_1 (Streaming Architecture) - Provides streaming foundation
- TASK_6 (Production Features) - Adds rate limiting (affects error messages)

## Notes
- Keep UI consistent with rest of the application's design system
- Use existing Tailwind classes where possible
- Ensure accessibility (keyboard navigation, screen readers)
- Test with various message lengths
- Consider mobile experience (though this is dashboard-focused)

## Accessibility Considerations
- Add ARIA labels to buttons
- Ensure keyboard navigation works
- Maintain sufficient color contrast
- Add loading states for screen readers
- Consider focus management during streaming

## Performance Notes
- Smooth scroll on every message update might be expensive for long conversations
- Consider virtualizing messages if conversations get very long
- Debounce scroll updates if performance issues arise

## Future Enhancements
- Markdown rendering in messages
- Code syntax highlighting
- Copy message to clipboard
- Export chat history
- Save/load chat sessions
- Message reactions or ratings

## References
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- React Hooks: https://react.dev/reference/react
- Smooth Scroll: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
