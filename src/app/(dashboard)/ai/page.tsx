"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const CHAT_CARD_HEIGHT = "calc(100vh - 260px)";

type SessionListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  lastMessagePreview: string | null;
};

export default function AIAssistantPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionMessages, setActiveSessionMessages] = useState<UIMessage[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Chat logic is handled by ChatPane

  const suggestions = useMemo(
    () => [
      "How many draft observations do I have?",
      "List my observations with risk category A",
      "Show me audits in progress",
      "Count approved observations in Plant X",
      "What audits am I assigned to?",
    ],
    [],
  );

  const fetchSessions = useCallback(async (): Promise<SessionListItem[]> => {
    const res = await fetch("/api/v1/ai/sessions", {
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) {
      const fallbackMessage = res.status === 401 ? "You must be signed in." : res.statusText;
      let message = fallbackMessage || "Failed to fetch conversations";
      try {
        const payload = await res.json();
        if (payload?.error && typeof payload.error === "string") {
          message = payload.error;
        }
      } catch (err) {
        // no-op, keep fallback message
      }
      throw new Error(message);
    }

    const data = await res.json();
    return Array.isArray(data.sessions) ? (data.sessions as SessionListItem[]) : [];
  }, []);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await fetchSessions();
      setSessions(list);
      return list;
    } catch (err) {
      console.error(err);
      setUiError("Unable to load conversations.");
      return [];
    }
  }, [fetchSessions]);

  const loadSession = useCallback(
    async (sessionId: string) => {
      setLoadingMessages(true);
      setUiError(null);
      try {
        const res = await fetch(`/api/v1/ai/sessions/${sessionId}`);
        if (!res.ok) {
          throw new Error("Failed to load conversation");
        }
        const data = await res.json();
        const sessionMessages = (data.messages as UIMessage[]) ?? [];
        setActiveSessionId(sessionId);
        setActiveSessionMessages(sessionMessages);
      } catch (err) {
        console.error(err);
        setUiError("Unable to load the selected conversation.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [],
  );

  const createSession = useCallback(async () => {
    const res = await fetch("/api/v1/ai/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error("Failed to create conversation");
    }
    return res.json();
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      if (sessionStatus === "unauthenticated") {
        setInitializing(false);
        setSessions([]);
        setActiveSessionId(null);
        setActiveSessionMessages([]);
      }
      return;
    }

    let cancelled = false;

    (async () => {
      setInitializing(true);
      try {
        let list = await refreshSessions();
        if (cancelled) return;

        if (list.length === 0) {
          await createSession();
          if (cancelled) return;
          list = await refreshSessions();
          if (cancelled) return;
        }

        if (list.length > 0) {
          await loadSession(list[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [createSession, loadSession, refreshSessions, sessionStatus]);

  // ChatPane will notify parent when messages change

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  // ChatPane handles submit, suggestions, and clear chat

  const handleNewConversation = useCallback(async () => {
    try {
      await createSession();
      const list = await refreshSessions();
      if (list.length > 0) {
        await loadSession(list[0].id);
      }
    } catch (err) {
      console.error(err);
      setUiError("Unable to start a new conversation.");
    }
  }, [createSession, loadSession, refreshSessions]);

  const handleRenameConversation = useCallback(async () => {
    if (!activeSessionId) return;
    const current = sessions.find((item) => item.id === activeSessionId);
    const nextTitle = window.prompt("Rename conversation", current?.title ?? "");
    if (nextTitle === null) return;

    try {
      const res = await fetch(`/api/v1/ai/sessions/${activeSessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!res.ok) {
        throw new Error("Failed to rename conversation");
      }
      await refreshSessions();
    } catch (err) {
      console.error(err);
      setUiError("Unable to rename this conversation.");
    }
  }, [activeSessionId, refreshSessions, sessions]);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeSessionId) return;
    const confirmDelete = window.confirm(
      "Delete this conversation? This cannot be undone.",
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/v1/ai/sessions/${activeSessionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }
      let list = await refreshSessions();
      if (list.length === 0) {
        await createSession();
        list = await refreshSessions();
      }
      if (list.length > 0) {
        await loadSession(list[0].id);
      } else {
        setActiveSessionId(null);
        setActiveSessionMessages([]);
      }
    } catch (err) {
      console.error(err);
      setUiError("Unable to delete this conversation.");
    }
  }, [activeSessionId, createSession, loadSession, refreshSessions]);

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return "No activity yet";
    try {
      const date = new Date(iso);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "No activity yet";
    }
  };

  // ChatPane computes input/button disabled states locally

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          AI Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ask questions about your audits and observations using natural language.
        </p>
        {session?.user && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Logged in as <span className="font-medium">{session.user.name}</span>{" "}
            ({session.user.role})
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="flex flex-col" style={{ height: CHAT_CARD_HEIGHT }}>
          <div className="px-4 pt-3">
            <Button onClick={handleNewConversation} disabled={isStreaming} className="w-full justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12 4.5a.75.75 0 01.75.75v6h6a.75.75 0 010 1.5h-6v6a.75.75 0 01-1.5 0v-6h-6a.75.75 0 010-1.5h6v-6A.75.75 0 0112 4.5z" clipRule="evenodd" />
              </svg>
              New chat
            </Button>
          </div>
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                Conversations
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {sessions.length} total
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {initializing ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                Loading conversations…
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">
                No conversations yet.
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {sessions.map((item, idx) => {
                  const label = item.title?.trim() || `Conversation ${sessions.length - idx}`;
                  const isActive = item.id === activeSessionId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => loadSession(item.id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-900/40"
                        }`}
                        disabled={loadingMessages && item.id === activeSessionId}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {item.lastMessagePreview ?? "No messages yet"}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {formatTimestamp(item.lastMessageAt ?? item.updatedAt)}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card className="flex flex-col" style={{ height: CHAT_CARD_HEIGHT }}>
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {activeSession?.title?.trim() || "Conversation"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {activeSession
                  ? `Last activity: ${formatTimestamp(
                      activeSession.lastMessageAt ?? activeSession.updatedAt,
                    )}`
                  : "Select or start a conversation"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRenameConversation}
                disabled={!activeSessionId || isStreaming}
              >
                Rename
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDeleteConversation}
                disabled={!activeSessionId || isStreaming}
              >
                Delete
              </Button>
            </div>
          </div>

          {uiError && (
            <div className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{uiError}</div>
          )}

          <ChatPane
            key={activeSessionId ?? "none"}
            sessionId={activeSessionId}
            initialMessages={activeSessionMessages}
            loading={loadingMessages}
            suggestions={suggestions}
            onMessagesChanged={refreshSessions}
            onStreamingChange={setIsStreaming}
          />
        </Card>
      </div>
    </div>
  );
}

type ChatPaneProps = {
  sessionId: string | null;
  initialMessages: UIMessage[];
  loading: boolean;
  suggestions: string[];
  onMessagesChanged: () => void;
  onStreamingChange: (streaming: boolean) => void;
};

function ChatPane({
  sessionId,
  initialMessages,
  loading,
  suggestions,
  onMessagesChanged,
  onStreamingChange,
}: ChatPaneProps) {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, setMessages, clearError } = useChat({
    id: sessionId ?? undefined,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/v1/ai/chat",
      prepareSendMessagesRequest({ messages, id }) {
        if (!id) {
          throw new Error("Active chat session missing");
        }
        const lastMessage = messages[messages.length - 1];
        return {
          body: {
            chatId: id,
            message: lastMessage,
          },
        };
      },
    }),
  });

  useEffect(() => {
    onStreamingChange(status === "streaming");
  }, [status, onStreamingChange]);

  useEffect(() => {
    onMessagesChanged();
  }, [messages.length, onMessagesChanged]);

  if (!sessionId) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">Select or start a conversation.</div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;
    sendMessage({ text: input });
    setInput("");
    if (error) {
      clearError?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || status !== "ready") return;
      sendMessage({ text: input });
      setInput("");
      if (error) {
        clearError?.();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (status !== "ready") return;
    sendMessage({ text: suggestion });
  };

  const handleClearChat = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/v1/ai/sessions/${sessionId}/clear`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to clear conversation");
      }
      setMessages([]);
      setInput("");
      onMessagesChanged();
    } catch (err) {
      console.error(err);
    }
  };

  const disableSend = status !== "ready" || !input.trim();
  const disableClear = messages.length === 0 && !input;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <p className="mt-2">Start a conversation by asking a question below.</p>

            <div className="mt-6 max-w-2xl mx-auto">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">💡 Try asking:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={status !== "ready"}
                    className="px-4 py-2 text-sm bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUserMessage = message.role === "user";
            return (
              <div key={message.id} className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-3xl rounded-lg px-4 py-2 ${
                    isUserMessage ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  <div className="text-xs font-semibold mb-1 opacity-75">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>

                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <div
                            key={`${message.id}-${i}`}
                            className={`space-y-3 text-[0.9375rem] leading-relaxed ${
                              isUserMessage ? "text-white" : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node: _node, ...props }) => <p className="text-[0.9375rem] leading-relaxed" {...props} />,
                                ul: ({ node: _node, ...props }) => <ul className="list-disc space-y-1 pl-5" {...props} />,
                                ol: ({ node: _node, ...props }) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
                                li: ({ node: _node, ...props }) => <li className="text-[0.9375rem]" {...props} />,
                                strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
                                table: ({ node: _node, ...props }) => (
                                  <div className={`overflow-x-auto rounded-md border ${isUserMessage ? "border-white/40" : "border-gray-200"}`}>
                                    <table
                                      className={`min-w-full border-collapse text-left text-xs ${
                                        isUserMessage ? "text-white" : "text-gray-900 dark:text-gray-100"
                                      }`}
                                      {...props}
                                    />
                                  </div>
                                ),
                                thead: ({ node: _node, ...props }) => <thead className={isUserMessage ? "bg-blue-600/40" : "bg-gray-50"} {...props} />,
                                th: ({ node: _node, ...props }) => (
                                  <th
                                    className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                                      isUserMessage ? "border-white/30 text-white" : "border-gray-200 text-gray-600"
                                    }`}
                                    {...props}
                                  />
                                ),
                                td: ({ node: _node, ...props }) => (
                                  <td className={`border px-3 py-2 ${isUserMessage ? "border-white/20" : "border-gray-200"}`} {...props} />
                                ),
                                tr: ({ node: _node, ...props }) => (
                                  <tr className={isUserMessage ? "odd:bg-blue-500/50 even:bg-blue-500/60" : "odd:bg-white even:bg-gray-50"} {...props} />
                                ),
                                code: ({ node: _node, inline, ...props }) => (
                                  <code className={`rounded px-1 py-0.5 text-[0.85rem] ${inline ? "" : "block"} ${isUserMessage ? "bg-blue-600/50" : "bg-gray-100"}`} {...props} />
                                ),
                              }}
                            >
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        );

                      case "tool-observations_count": {
                        const count = typeof part.output === "object" && part.output && "count" in part.output ? (part.output as any).count : null;
                        return (
                          <div key={`${message.id}-${i}`} className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs">
                            <div className="font-semibold mb-1">🔍 Observations Count Tool</div>
                            {typeof count === "number" && (
                              <div>
                                <div>
                                  Count: <strong>{count}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      case "tool-observations_list": {
                        const out = (part.output as any) || {};
                        const list: Array<any> = Array.isArray(out.observations) ? out.observations : [];
                        return (
                          <div key={`${message.id}-${i}`} className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs">
                            <div className="font-semibold mb-1">📋 Observations List ({String(out.count ?? list.length)})</div>
                            {list.length > 0 && (
                              <ul className="list-disc pl-4 space-y-1">
                                {list.map((o: any) => (
                                  <li key={o.id}>
                                    <span className="font-medium">{o.title}</span>{" "}
                                    <span className="opacity-75">— {o.approvalStatus} • Risk {o.riskCategory} • {o.auditTitle}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      }

                      case "tool-audits_count": {
                        const count = typeof part.output === "object" && part.output && "count" in part.output ? (part.output as any).count : null;
                        return (
                          <div key={`${message.id}-${i}`} className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs">
                            <div className="font-semibold mb-1">🔍 Audits Count Tool</div>
                            {typeof count === "number" && (
                              <div>
                                <div>
                                  Count: <strong>{count}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      }

                      case "tool-audits_list": {
                        const out = (part.output as any) || {};
                        const list: Array<any> = Array.isArray(out.audits) ? out.audits : [];
                        return (
                          <div key={`${message.id}-${i}`} className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs">
                            <div className="font-semibold mb-1">📋 Audits List ({String(out.count ?? list.length)})</div>
                            {list.length > 0 && (
                              <ul className="list-disc pl-4 space-y-1">
                                {list.map((a: any) => (
                                  <li key={a.id}>
                                    <span className="font-medium">{a.title}</span>{" "}
                                    <span className="opacity-75">— {a.plantName} • {a.status} • {a.progress?.resolved ?? 0}/{a.progress?.total ?? 0} resolved</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      }

                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            );
          })
        )}

        {status === "streaming" && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="animate-bounce">●</div>
                <div className="animate-bounce delay-100">●</div>
                <div className="animate-bounce delay-200">●</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-500 text-red-700 dark:text-red-300 px-4 py-2 rounded">
            <strong>Error:</strong> {error.message}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about audits or observations..."
              disabled={status !== "ready" || !sessionId}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all duration-150 ease-out focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="secondary" onClick={handleClearChat} disabled={disableClear}>
              Clear chat
            </Button>
            <Button type="submit" disabled={disableSend}>{status === "streaming" ? "Sending..." : "Send"}</Button>
          </div>
        </form>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          The AI assistant respects your role permissions. You can only see data you have access to.
        </p>
      </div>
    </>
  );
}

