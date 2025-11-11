"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/v2/button";
import { Input } from "@/components/ui/v2/input";
import { cn } from "@/lib/utils";
import { Plus, Search, Send, Sparkles } from "lucide-react";

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
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionMessages, setActiveSessionMessages] = useState<UIMessage[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Block Auditee and Guest roles from accessing AI Assistant
  useEffect(() => {
    if (sessionStatus === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "AUDITEE" || role === "GUEST") {
        router.push("/observations"); // Redirect to observations page
      }
    }
  }, [sessionStatus, session, router]);

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
      setSessions([]);
      setActiveSessionId(null);
      setActiveSessionMessages([]);
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

  const filteredSessions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return sessions;
    }
    return sessions.filter((item) => {
      const title = item.title?.toLowerCase() ?? "";
      const preview = item.lastMessagePreview?.toLowerCase() ?? "";
      return title.includes(term) || preview.includes(term);
    });
  }, [searchTerm, sessions]);

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
    <div className="px-6 py-6">
      <div className="mx-auto flex max-w-[1600px] flex-1 flex-col gap-4">
        {session?.user && (
          <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
            Logged in as <span className="font-medium" style={{ color: "var(--c-texPri)" }}>{session.user.name}</span>{" "}
            ({session.user.role})
          </p>
        )}

        <div className="flex min-h-[calc(100vh-180px)] flex-1 gap-6">
          <aside
            className="flex w-[280px] flex-shrink-0 flex-col rounded-[28px] border"
            style={{
              borderColor: "var(--border-color-regular)",
              background: "var(--c-bacPri)",
              boxShadow: "0 24px 60px rgba(15, 15, 15, 0.05)",
            }}
          >
            <div className="space-y-4 border-b px-5 pb-5 pt-6" style={{ borderColor: "var(--border-color-regular)" }}>
              <Button
                variant="outline"
                onClick={handleNewConversation}
                disabled={isStreaming}
                className={cn(
                  "h-12 w-full justify-start gap-3 rounded-full border text-sm font-medium transition-colors",
                  "hover:bg-[var(--c-bacSec)]",
                )}
                style={{
                  borderColor: "var(--border-color-regular)",
                  background: "var(--c-bacPri)",
                  color: "var(--c-texPri)",
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "var(--c-bacSec)", color: "var(--c-palUiBlu600)" }}
                >
                  <Plus className="h-4 w-4" />
                </span>
                <span>New chat</span>
              </Button>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                  style={{ color: "var(--c-texSec)" }}
                />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search chats"
                  className="h-10 rounded-2xl border pl-9 text-sm"
                  style={{
                    borderColor: "var(--border-color-regular)",
                    background: "white",
                    color: "var(--c-texPri)",
                  }}
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--c-texSec)" }}>
                  Conversations
                </p>
                <p className="text-xs" style={{ color: "var(--c-texTer)" }}>
                  {sessions.length} total
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {initializing ? (
                <p className="px-2 text-sm" style={{ color: "var(--c-texSec)" }}>
                  Loading conversations…
                </p>
              ) : sessions.length === 0 ? (
                <p className="px-2 text-sm" style={{ color: "var(--c-texSec)" }}>
                  No conversations yet.
                </p>
              ) : filteredSessions.length === 0 ? (
                <p className="px-2 text-sm" style={{ color: "var(--c-texSec)" }}>
                  No matches for “{searchTerm.trim()}”.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredSessions.map((item, index) => {
                    const label = item.title?.trim() || `Conversation ${filteredSessions.length - index}`;
                    const isActive = item.id === activeSessionId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => loadSession(item.id)}
                          disabled={loadingMessages && item.id === activeSessionId}
                          className={cn(
                            "w-full rounded-2xl px-3 py-2 text-left transition",
                            "hover:bg-[var(--c-bacSec)]",
                          )}
                          style={{
                            background: isActive ? "var(--c-bacSec)" : "transparent",
                            color: "var(--c-texPri)",
                            border: isActive ? "1px solid var(--border-color-regular)" : "1px solid transparent",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium" style={{ color: "var(--c-texPri)" }}>
                              {label}
                            </span>
                            <span className="text-[11px]" style={{ color: "var(--c-texTer)" }}>
                              {formatTimestamp(item.lastMessageAt ?? item.updatedAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--c-texSec)" }}>
                            {item.lastMessagePreview ?? "No messages yet"}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          <section
            className="flex min-w-0 flex-1 flex-col rounded-[32px] border"
            style={{
              borderColor: "var(--border-color-regular)",
              background: "var(--c-bacPri)",
              boxShadow: "0 32px 90px -40px rgba(15, 15, 15, 0.2)",
            }}
          >
            <header
              className="flex flex-wrap items-center justify-between gap-4 border-b px-8 py-6"
              style={{ borderColor: "var(--border-color-regular)" }}
            >
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold" style={{ color: "var(--c-texPri)" }}>
                  {activeSession?.title?.trim() || "Conversation"}
                </h1>
                <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
                  {activeSession
                    ? `Last activity · ${formatTimestamp(activeSession.lastMessageAt ?? activeSession.updatedAt)}`
                    : "Select or start a conversation to chat with the assistant."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRenameConversation}
                  disabled={!activeSessionId || isStreaming}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    "hover:text-[var(--c-texPri)]",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  style={{ color: "var(--c-texSec)" }}
                >
                  Rename
                </button>
                <span className="h-4 w-px rounded-full" style={{ background: "var(--border-color-regular)" }} />
                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  disabled={!activeSessionId || isStreaming}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    "hover:text-[var(--c-texPri)]",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                  )}
                  style={{ color: "var(--c-texSec)" }}
                >
                  Delete
                </button>
              </div>
            </header>

            {uiError && (
              <div className="px-8 pt-4 text-sm" style={{ color: "#dc2626" }}>
                {uiError}
              </div>
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
          </section>
        </div>
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionId || !input.trim() || status !== "ready") {
      return;
    }
    sendMessage({ text: input });
    setInput("");
    if (error) {
      clearError?.();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sessionId || !input.trim() || status !== "ready") {
        return;
      }
      sendMessage({ text: input });
      setInput("");
      if (error) {
        clearError?.();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (status !== "ready" || !sessionId) return;
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

  const disableSend = status !== "ready" || !input.trim() || !sessionId;
  const disableClear = (!messages.length && !input) || !sessionId;

  const formatJson = (value: unknown) => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const renderToolCard = (key: string, title: string, content: ReactNode) => (
    <div
      key={key}
      className="rounded-2xl border px-4 py-3 text-xs"
      style={{
        borderColor: "var(--border-color-regular)",
        background: "var(--c-bacSec)",
        color: "var(--c-texPri)",
        boxShadow: "0 8px 16px -10px rgba(0,0,0,0.15)",
      }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--c-palUiBlu600)" }}>
        {title}
      </div>
      <div className="mt-2 space-y-2">{content}</div>
    </div>
  );

  const renderPart = (messageId: string, part: any, index: number, isUserMessage: boolean) => {
    if (part.type === "text") {
      const borderColor = "var(--border-color-regular)";
      return (
        <div key={`${messageId}-${index}`} className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--c-texPri)" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ node: _node, ...props }) => <p className="text-sm leading-relaxed" {...props} />,
              ul: ({ node: _node, ...props }) => <ul className="ml-5 list-disc space-y-1 text-sm" {...props} />,
              ol: ({ node: _node, ...props }) => <ol className="ml-5 list-decimal space-y-1 text-sm" {...props} />,
              li: ({ node: _node, ...props }) => <li className="text-sm leading-relaxed" {...props} />,
              strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
              table: ({ node: _node, ...props }) => (
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor }}>
                  <table className="min-w-full border-collapse text-left text-xs" {...props} />
                </div>
              ),
              thead: ({ node: _node, ...props }) => (
                <thead className="bg-[var(--c-bacSec)] text-xs uppercase tracking-wide" {...props} />
              ),
              th: ({ node: _node, ...props }) => (
                <th className="border px-3 py-2 text-xs font-semibold uppercase tracking-wide" style={{ borderColor }} {...props} />
              ),
              td: ({ node: _node, ...props }) => (
                <td className="border px-3 py-2 text-xs" style={{ borderColor }} {...props} />
              ),
              tr: ({ node: _node, ...props }) => <tr {...props} />,
              code: (props: any) => {
                const { inline: isInline, node: _node, ...rest } = props || {};
                return (
                  <code
                    className={cn(
                      "rounded px-1 py-0.5 text-[0.85rem]",
                      isInline ? "align-middle" : "block whitespace-pre-wrap",
                    )}
                    style={{
                      background: isUserMessage ? "rgba(0,0,0,0.06)" : "var(--c-bacSec)",
                    }}
                    {...rest}
                  />
                );
              },
            }}
          >
            {part.text}
          </ReactMarkdown>
        </div>
      );
    }

    switch (part.type) {
      case "tool-observations_count": {
        const count =
          typeof part.output === "object" && part.output && "count" in part.output ? (part.output as any).count : null;
        const input = (part.output as any)?.input;
        return renderToolCard(
          `${messageId}-${index}`,
          "Observations Count",
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {typeof count === "number" && (
              <p className="text-sm">
                Count: <strong>{count}</strong>
              </p>
            )}
          </>,
        );
      }

      case "tool-observations_list": {
        const out = (part.output as any) || {};
        const list: Array<any> = Array.isArray(out.observations) ? out.observations : [];
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Observations List (${String(out.count ?? list.length)})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {list.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {list.map((o: any) => (
                  <li key={o.id}>
                    <span className="font-medium">{o.title}</span>{" "}
                    <span className="opacity-80">
                      — {o.approvalStatus} • Risk {o.riskCategory} • {o.auditTitle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      case "tool-audits_count": {
        const count =
          typeof part.output === "object" && part.output && "count" in part.output ? (part.output as any).count : null;
        const input = (part.output as any)?.input;
        return renderToolCard(
          `${messageId}-${index}`,
          "Audits Count",
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {typeof count === "number" && (
              <p className="text-sm">
                Count: <strong>{count}</strong>
              </p>
            )}
          </>,
        );
      }

      case "tool-audits_list": {
        const out = (part.output as any) || {};
        const list: Array<any> = Array.isArray(out.audits) ? out.audits : [];
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Audits List (${String(out.count ?? list.length)})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {list.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {list.map((a: any) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.title}</span>{" "}
                    <span className="opacity-80">
                      — {a.plantName} • {a.status} • {a.progress?.resolved ?? 0}/{a.progress?.total ?? 0} resolved
                      {a.auditHead?.name ? ` • Head: ${a.auditHead.name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      case "tool-whoami": {
        const out = (part.output as any) || {};
        const u = out.user || {};
        return renderToolCard(
          `${messageId}-${index}`,
          "Session Info",
          out.allowed === false ? (
            <p>Unauthenticated</p>
          ) : (
            <div className="space-y-1 text-sm">
              <p>
                Role: <strong>{u.role ?? "unknown"}</strong>
              </p>
              {u.email && (
                <p>
                  Email: <span className="opacity-80">{u.email}</span>
                </p>
              )}
            </div>
          ),
        );
      }

      case "tool-observations_find": {
        const out = (part.output as any) || {};
        const list: Array<any> = Array.isArray(out.observations) ? out.observations : [];
        const aggregation = out.aggregation as any;
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Observations Find (${String(out.count ?? list.length)})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {aggregation?.by && Array.isArray(aggregation?.groups) && aggregation.groups.length > 0 && (
              <div className="space-y-1 rounded-xl bg-white px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide">Aggregation by {aggregation.by}</p>
                <ul className="list-disc space-y-1 pl-4">
                  {aggregation.groups.slice(0, 10).map((group: any, idx: number) => (
                    <li key={idx}>
                      {group.key}: <strong>{group.count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {list.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {list.slice(0, 10).map((o: any) => (
                  <li key={o.id}>
                    <span className="font-medium">{o.title}</span>{" "}
                    <span className="opacity-80">
                      — {o.approvalStatus} • {o.currentStatus} • Risk {o.riskCategory} • {o.auditTitle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      case "tool-audits_find": {
        const out = (part.output as any) || {};
        const list: Array<any> = Array.isArray(out.audits) ? out.audits : [];
        const metrics = out.metrics as any;
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Audits Find (${String(out.count ?? list.length)})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {metrics?.kind && <p className="text-xs opacity-80">Metrics: {metrics.kind}</p>}
            {list.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {list.slice(0, 10).map((a: any) => (
                  <li key={a.id}>
                    <span className="font-medium">{a.title}</span>{" "}
                    <span className="opacity-80">
                      — {a.plantName} • {a.status}
                      {a.auditHead?.name ? ` • Head: ${a.auditHead.name}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      case "tool-auditors_assignments_stats": {
        const out = (part.output as any) || {};
        const rows: Array<any> = Array.isArray(out.results) ? out.results : [];
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Auditor Assignment Stats (${rows.length})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {rows.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {rows.slice(0, 20).map((row: any, idx: number) => (
                  <li key={idx}>
                    {row.name ?? row.auditorEmail ?? row.auditorId}: <strong>{row.auditsAssigned}</strong> audits
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      case "tool-observations_similar": {
        const out = (part.output as any) || {};
        const rows: Array<any> = Array.isArray(out.results) ? out.results : [];
        const input = out.input;
        return renderToolCard(
          `${messageId}-${index}`,
          `Similar Observations (${rows.length})`,
          <>
            {input && (
              <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
                {formatJson(input)}
              </pre>
            )}
            {rows.length > 0 && (
              <ul className="list-disc space-y-1 pl-4 text-xs">
                {rows.slice(0, 10).map((r: any) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.auditTitle}</span>{" "}
                    <span className="opacity-80">
                      — {r.plant} • Score {r.similarity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>,
        );
      }

      default: {
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          return renderToolCard(
            `${messageId}-${index}`,
            part.type.replace("tool-", "").replace(/_/g, " "),
            <pre className="rounded-xl bg-white px-3 py-2 text-[11px] leading-relaxed" style={{ color: "var(--c-texPri)" }}>
              {formatJson(part.output ?? {})}
            </pre>,
          );
        }
        return null;
      }
    }
  };

  const renderComposer = (variant: "hero" | "footer") => {
    const isHero = variant === "hero";
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border",
          isHero
            ? "px-6 py-4 shadow-[0_24px_60px_rgba(15,15,15,0.08)]"
            : "px-4 py-3 shadow-[0_16px_32px_rgba(15,15,15,0.06)]",
        )}
        style={{
          borderColor: "var(--border-color-regular)",
          background: "var(--c-bacPri)",
        }}
      >
        <button
          type="button"
          className={cn(
            "flex items-center justify-center rounded-full border transition-colors",
            isHero ? "h-11 w-11" : "h-9 w-9",
          )}
          style={{
            borderColor: "var(--border-color-regular)",
            background: "var(--c-bacPri)",
            color: "var(--c-texSec)",
          }}
          aria-label="Insert attachment"
        >
          <Plus className={isHero ? "h-5 w-5" : "h-4 w-4"} />
        </button>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          rows={1}
          className={cn(
            "max-h-32 min-h-[28px] flex-1 resize-none bg-transparent outline-none placeholder:text-neutral-400",
            isHero ? "text-base leading-relaxed" : "text-sm leading-relaxed",
          )}
          style={{ color: "var(--c-texPri)" }}
          disabled={!sessionId}
        />
        <button
          type="submit"
          disabled={disableSend}
          className={cn(
            "flex items-center justify-center rounded-full transition-colors",
            isHero ? "h-11 w-11" : "h-9 w-9",
            disableSend
              ? "cursor-not-allowed bg-[var(--c-bacSec)] text-[var(--c-texSec)] opacity-60"
              : "bg-[var(--c-texPri)] text-white hover:bg-[var(--c-texPri)]/90",
          )}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const renderErrorBanner = () =>
    !error ? null : (
      <div
        className="rounded-2xl border px-3 py-2 text-sm"
        style={{
          borderColor: "rgba(220, 38, 38, 0.2)",
          background: "rgba(254, 226, 226, 0.6)",
          color: "#b91c1c",
        }}
      >
        <strong className="font-semibold">Error:</strong> {error.message}
      </div>
    );

  const emptyState = (
    <div className="w-full max-w-2xl space-y-8 text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold" style={{ color: "var(--c-texPri)" }}>
          What&apos;s on your mind today?
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--c-texSec)" }}>
          Ask about audits, observations, reports, or assignments to get tailored answers instantly.
        </p>
      </div>
      <form onSubmit={handleSubmit}>{renderComposer("hero")}</form>
      {renderErrorBanner()}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={status !== "ready" || !sessionId}
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition-colors",
                "hover:bg-[var(--c-bacPri)] hover:text-[var(--c-palUiBlu600)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              style={{
                borderColor: "var(--border-color-regular)",
                background: "var(--c-bacSec)",
                color: "var(--c-palUiBlu600)",
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderedMessages = (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {messages.map((message) => {
        const isUserMessage = message.role === "user";
        return (
          <div key={message.id} className={cn("flex w-full", isUserMessage ? "justify-end" : "justify-start")}>
            {isUserMessage ? (
              <div
                className="max-w-[60%] rounded-[24px] px-5 py-3"
                style={{
                  background: "var(--c-bacSec)",
                  color: "var(--c-texPri)",
                  boxShadow: "0 8px 24px -16px rgba(15,15,15,0.25)",
                }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-texTer)" }}>
                  You
                </p>
                <div className="mt-2 space-y-4">
                  {message.parts.map((part, idx) => renderPart(message.id, part, idx, true))}
                </div>
              </div>
            ) : (
              <div className="flex max-w-[85%] items-start gap-3">
                <div
                  className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--ca-palUiBlu100)" }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: "var(--c-palUiBlu600)" }} />
                </div>
                <div
                  className="flex-1 rounded-[24px] border px-5 py-3"
                  style={{
                    borderColor: "var(--border-color-regular)",
                    background: "var(--c-bacPri)",
                    color: "var(--c-texPri)",
                    boxShadow: "0 8px 16px -8px rgba(0,0,0,0.08)",
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--c-texTer)" }}>
                    AI Assistant
                  </p>
                  <div className="mt-2 space-y-4">
                    {message.parts.map((part, idx) => renderPart(message.id, part, idx, false))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {status === "streaming" && (
        <div className="flex justify-start">
          <div className="flex items-start gap-3">
            <div
              className="mt-1 flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: "var(--ca-palUiBlu100)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--c-palUiBlu600)" }} />
            </div>
            <div
              className="rounded-[24px] border px-5 py-3"
              style={{
                borderColor: "var(--border-color-regular)",
                background: "var(--c-bacPri)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 animate-bounce rounded-full"
                  style={{ background: "var(--c-palUiBlu600)" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full [animation-delay:120ms]"
                  style={{ background: "var(--c-palUiBlu600)" }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full [animation-delay:240ms]"
                  style={{ background: "var(--c-palUiBlu600)" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const isEmptyState = !loading && messages.length === 0;
  const bodyWrapperClass = cn(
    "flex-1 px-8",
    loading || isEmptyState ? "flex items-center justify-center" : "overflow-y-auto py-10",
  );
  const bodyContent = loading ? (
    <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
      Loading conversation…
    </p>
  ) : isEmptyState ? (
    emptyState
  ) : (
    renderedMessages
  );

  return (
    <div className="flex h-full flex-col">
      <div className={bodyWrapperClass}>{bodyContent}</div>

      {!isEmptyState && (
        <div
          className="border-t px-6 py-5"
          style={{
            borderColor: "var(--border-color-regular)",
            background: "var(--c-bacPri)",
          }}
        >
          <div className="mx-auto w-full max-w-3xl space-y-3">
            {renderErrorBanner()}
            <form onSubmit={handleSubmit}>{renderComposer("footer")}</form>

            <div className="flex items-center justify-between text-[0.75rem]" style={{ color: "var(--c-texSec)" }}>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={disableClear}
                className={cn(
                  "font-medium transition-colors",
                  "hover:underline",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                )}
                style={{ color: "var(--c-palUiBlu600)" }}
              >
                Clear chat
              </button>
              <p>
                The AI assistant respects your role permissions. You can only see data you are allowed to access.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

