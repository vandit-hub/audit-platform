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

const categorizeError = (error: any): string => {
  if (error.name === 'AbortError') {
    return 'Request was cancelled';
  }
  if (error.message.includes('Failed to fetch')) {
    return 'Network error. Please check your connection.';
  }
  if (error.message.includes('HTTP 401') || error.message.includes('Unauthorized')) {
    return 'Your session expired. Please refresh and log in again.';
  }
  if (error.message.includes('HTTP 429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.message.includes('HTTP 5')) {
    return 'Server error. Please try again.';
  }
  return 'An error occurred while processing your request.';
};

export default function AgentChatClient({ user }: AgentChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isTimeout, setIsTimeout] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    <div className="bg-white rounded-lg shadow border border-neutral-200 flex flex-col" style={{ height: '600px' }}>
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
        <div className="text-sm text-neutral-600">
          <span className="font-medium">{user.name || user.email}</span>
          <span className="mx-2">•</span>
          <span className="text-neutral-500">{user.role}</span>
        </div>
        <button
          onClick={clearChat}
          disabled={messages.length === 0 && !streamingContent}
          className="text-sm px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-neutral-700"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingContent && (
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

        {/* Streaming content with animated cursor */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-lg p-3 bg-neutral-100 text-neutral-900">
              <div className="whitespace-pre-wrap break-words inline">
                {streamingContent}
              </div>
              <div className="inline-block w-1 h-4 bg-neutral-900 animate-pulse ml-1 align-middle"
                   style={{ animationDuration: '1s' }}></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

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
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Send
            </button>
          )}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {isLoading
            ? 'Click Stop to abort generation'
            : 'Press Enter to send, Shift+Enter for new line'}
        </div>
      </div>
    </div>
  );
}
