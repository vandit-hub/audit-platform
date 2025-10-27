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

const categorizeError = (error: any): string => {
  const errorStr = error?.message || error?.toString() || '';
  const errorName = error?.name || '';

  // User-initiated cancellation
  if (errorName === 'AbortError') {
    return '⏹️ Request was cancelled';
  }

  // Network errors
  if (errorStr.includes('Failed to fetch') || errorStr.includes('NetworkError')) {
    return '🌐 Network error. Please check your connection and try again.';
  }

  // Authentication errors (401)
  if (errorStr.includes('HTTP 401') || errorStr.includes('Unauthorized') ||
      errorStr.includes('session') || errorStr.includes('authentication')) {
    return '⚠️ Your session has expired. Please refresh the page and log in again.';
  }

  // Authorization/Permission errors (403)
  if (errorStr.includes('HTTP 403') || errorStr.includes('Forbidden') ||
      errorStr.includes('permission') || errorStr.includes('unauthorized access')) {
    return '🔒 You don\'t have permission to access that data. Contact your administrator if you believe this is an error.';
  }

  // Validation errors (400)
  if (errorStr.includes('HTTP 400') || errorStr.includes('Bad Request') ||
      errorStr.includes('validation') || errorStr.includes('invalid input')) {
    return '⚠️ Invalid request. Please check your input and try again.';
  }

  // Rate limiting errors (429)
  if (errorStr.includes('HTTP 429') || errorStr.includes('rate limit') ||
      errorStr.includes('too many requests')) {
    return '⏱️ You\'re sending requests too quickly. Please wait a moment and try again.';
  }

  // Database errors
  if (errorStr.includes('database') || errorStr.includes('prisma') ||
      errorStr.includes('SQL') || errorStr.includes('query failed')) {
    return '💾 Database error occurred. Please try again in a moment.';
  }

  // Agent/AI service errors
  if (errorStr.includes('agent') || errorStr.includes('claude') ||
      errorStr.includes('anthropic') || errorStr.includes('model')) {
    return '🤖 AI service error. Please try rephrasing your question or try again later.';
  }

  // Server errors (500)
  if (errorStr.includes('HTTP 5')) {
    return '🔧 Server error. Please try again later.';
  }

  // Timeout errors
  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return '⏱️ Request timed out. Please try again.';
  }

  // Generic fallback
  return '❌ An unexpected error occurred. Please try again.';
};

export default function AgentChatClient({ user }: AgentChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isTimeout, setIsTimeout] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced scroll function for streaming content
  const debouncedScrollToBottom = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100); // Debounce by 100ms
  };

  // Scroll to bottom when messages change (immediate)
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Debounced scroll for streaming content (throttled)
  useEffect(() => {
    if (streamingContent) {
      debouncedScrollToBottom();
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [streamingContent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

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
    setStreamingContent('');

    // Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set timeout for the request (60 seconds)
    const timeoutId = setTimeout(() => {
      if (abortController.signal.aborted === false) {
        console.warn('[Agent] Request timeout after 60 seconds');
        setIsTimeout(true);  // Flag that this is a timeout
        abortController.abort();
      }
    }, 60000);

    try {
      const response = await fetch('/api/v1/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              // Finalize message
              const finalMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, finalMessage]);
              setStreamingContent('');
              setIsLoading(false);
            } else {
              try {
                const parsed = JSON.parse(data);

                if (parsed.type === 'text') {
                  assistantContent += parsed.content;
                  setStreamingContent(assistantContent);
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.error);
                }
                // Ignore metadata for now
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);

      // Handle AbortError (timeout or manual stop)
      if (error.name === 'AbortError') {
        // If it's a timeout and we have partial content, save it
        if (isTimeout && streamingContent) {
          const partialMessage: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: streamingContent + '\n\n[Request timed out after 60 seconds]',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, partialMessage]);
          setStreamingContent('');
          setIsLoading(false);
        }
        // If manual stop, partial content is already saved by stopGeneration
        setIsTimeout(false);
        clearTimeout(timeoutId);
        return;
      }

      // Categorize error for user-friendly message
      const userMessage = categorizeError(error);

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: userMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      setStreamingContent('');
      setIsLoading(false);
    } finally {
      clearTimeout(timeoutId);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();

      // Save partial response if any content was streamed
      if (streamingContent) {
        const partialMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: streamingContent + '\n\n[Generation stopped by user]',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, partialMessage]);
      }

      setStreamingContent('');
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const clearChat = () => {
    // Only show confirmation if there are messages
    if (messages.length > 0 || streamingContent) {
      const confirmed = window.confirm(
        'Are you sure you want to clear the chat history? This action cannot be undone.'
      );
      if (!confirmed) return;
    }

    setMessages([]);
    setStreamingContent('');
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-neutral-200 flex flex-col overflow-hidden" style={{ height: '600px' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">
              AI Assistant
            </h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Logged in as <span className="font-medium">{user.name || user.email}</span>
              <span className="mx-1.5">•</span>
              <span className="capitalize">{user.role.toLowerCase().replace(/_/g, ' ')}</span>
            </p>
          </div>

          <button
            onClick={clearChat}
            disabled={messages.length === 0 && !streamingContent}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neutral-700"
            title="Clear chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50">
        {messages.length === 0 && !streamingContent && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-2xl w-full space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                  Ask me anything about your audits
                </h2>
                <p className="text-neutral-600">
                  Try one of these example questions, or ask your own
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-neutral-700">
                  Example Questions:
                </p>
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(question.text);
                      // Focus on input after populating
                      setTimeout(() => {
                        document.querySelector('textarea')?.focus();
                      }, 0);
                    }}
                    className="w-full text-left bg-white p-4 rounded-lg border border-neutral-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{question.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900 group-hover:text-blue-600">
                          {question.text}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
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

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${
              message.role === 'user'
                ? 'bg-blue-600 text-white rounded-lg p-4'
                : 'bg-neutral-100 text-neutral-900 rounded-lg p-4'
            }`}>
              <div className="flex items-start gap-3">
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-sm">🤖</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>

                  {message.timestamp && (
                    <div className={`text-xs mt-2 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : 'text-neutral-500'
                    }`}>
                      {formatRelativeTime(message.timestamp)}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                    {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming content with animated cursor */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-neutral-100 text-neutral-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm">🤖</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="whitespace-pre-wrap break-words inline">
                    {streamingContent}
                  </div>
                  <div className="inline-block w-1 h-4 bg-blue-500 animate-pulse ml-1 align-middle"
                       style={{ animationDuration: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200 bg-white">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your observations, audits, or stats..."
            className="flex-1 resize-none rounded-lg border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white text-neutral-900 placeholder-neutral-400"
            rows={2}
            disabled={isLoading}
            aria-label="Chat message input"
            aria-describedby="input-help-text"
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Stop generating response"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <rect x="6" y="6" width="8" height="8" rx="1" />
                </svg>
                <span>Stop</span>
              </div>
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Send message"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </div>
            </button>
          )}
        </div>
        <div id="input-help-text" className="text-xs text-neutral-500 mt-2">
          {isLoading
            ? '⏹️ Click Stop to abort generation'
            : '💡 Press Enter to send, Shift+Enter for new line'}
        </div>
      </div>
    </div>
  );
}
