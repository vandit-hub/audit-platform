"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/v1/ai/chat",
    }),
  });

  const suggestions = [
    "How many draft observations do I have?",
    "List my observations with risk category A",
    "Show me audits in progress",
    "Count approved observations in Plant X",
    "What audits am I assigned to?",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;

    sendMessage({ text: input });
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (status !== "ready") return;
    sendMessage({ text: suggestion });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          AI Assistant
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ask questions about your audits and observations using natural
          language.
        </p>
        {session?.user && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Logged in as <span className="font-medium">{session.user.name}</span>{" "}
            ({session.user.role})
          </p>
        )}
      </div>


      <Card className="flex flex-col" style={{ height: "calc(100vh - 350px)" }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <p className="mt-2">Start a conversation by asking a question below.</p>
              
              {/* Suggestion Buttons */}
              <div className="mt-6 max-w-2xl mx-auto">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  💡 Try asking:
                </p>
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
          )}

          {messages.map((message) => {
            const isUserMessage = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUserMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-3xl rounded-lg px-4 py-2 ${
                    isUserMessage
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                {/* Role Label */}
                <div className="text-xs font-semibold mb-1 opacity-75">
                  {message.role === "user" ? "You" : "AI Assistant"}
                </div>

                {/* Message Parts */}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className={`space-y-3 text-[0.9375rem] leading-relaxed ${
                            isUserMessage
                              ? "text-white"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                            p: ({ node: _node, ...props }) => (
                              <p className="text-[0.9375rem] leading-relaxed" {...props} />
                            ),
                            ul: ({ node: _node, ...props }) => (
                              <ul className="list-disc space-y-1 pl-5" {...props} />
                            ),
                            ol: ({ node: _node, ...props }) => (
                              <ol className="list-decimal space-y-1 pl-5" {...props} />
                            ),
                            li: ({ node: _node, ...props }) => <li className="text-[0.9375rem]" {...props} />,
                            strong: ({ node: _node, ...props }) => (
                              <strong className="font-semibold" {...props} />
                            ),
                            table: ({ node: _node, ...props }) => (
                              <div
                                className={`overflow-x-auto rounded-md border ${
                                  isUserMessage ? "border-white/40" : "border-gray-200"
                                }`}
                              >
                                <table
                                  className={`min-w-full border-collapse text-left text-xs ${
                                    isUserMessage
                                      ? "text-white"
                                      : "text-gray-900 dark:text-gray-100"
                                  }`}
                                  {...props}
                                />
                              </div>
                            ),
                            thead: ({ node: _node, ...props }) => (
                              <thead
                                className={isUserMessage ? "bg-blue-600/40" : "bg-gray-50"}
                                {...props}
                              />
                            ),
                            th: ({ node: _node, ...props }) => (
                              <th
                                className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                                  isUserMessage
                                    ? "border-white/30 text-white"
                                    : "border-gray-200 text-gray-600"
                                }`}
                                {...props}
                              />
                            ),
                            td: ({ node: _node, ...props }) => (
                              <td
                                className={`border px-3 py-2 ${
                                  isUserMessage ? "border-white/20" : "border-gray-200"
                                }`}
                                {...props}
                              />
                            ),
                            tr: ({ node: _node, ...props }) => (
                              <tr
                                className={
                                  isUserMessage
                                    ? "odd:bg-blue-500/50 even:bg-blue-500/60"
                                    : "odd:bg-white even:bg-gray-50"
                                }
                                {...props}
                              />
                            ),
                            code: ({ node: _node, inline, ...props }) => (
                              <code
                                className={`rounded px-1 py-0.5 text-[0.85rem] ${
                                  inline ? "" : "block"
                                } ${isUserMessage ? "bg-blue-600/50" : "bg-gray-100"}`}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {part.text}
                        </ReactMarkdown>
                        </div>
                      );

                    case "tool-observations_count": {
                      const count = typeof part.output === 'object' && part.output && 'count' in part.output 
                        ? (part.output as any).count 
                        : null;
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs"
                        >
                          <div className="font-semibold mb-1">
                            🔍 Observations Count Tool
                          </div>
                          {typeof count === 'number' && (
                            <div>
                              <div>Count: <strong>{count}</strong></div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case "tool-observations_list": {
                      const out = (part.output as any) || {};
                      const list: Array<any> = Array.isArray(out.observations)
                        ? out.observations
                        : [];
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs"
                        >
                          <div className="font-semibold mb-1">
                            📋 Observations List ({String(out.count ?? list.length)})
                          </div>
                          {list.length > 0 && (
                            <ul className="list-disc pl-4 space-y-1">
                              {list.map((o: any) => (
                                <li key={o.id}>
                                  <span className="font-medium">{o.title}</span>
                                  {" "}
                                  <span className="opacity-75">
                                    — {o.approvalStatus} • Risk {o.riskCategory} • {o.auditTitle}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    }

                    case "tool-audits_count": {
                      const count = typeof part.output === 'object' && part.output && 'count' in part.output 
                        ? (part.output as any).count 
                        : null;
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs"
                        >
                          <div className="font-semibold mb-1">
                            🔍 Audits Count Tool
                          </div>
                          {typeof count === 'number' && (
                            <div>
                              <div>Count: <strong>{count}</strong></div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    case "tool-audits_list": {
                      const out = (part.output as any) || {};
                      const list: Array<any> = Array.isArray(out.audits)
                        ? out.audits
                        : [];
                      return (
                        <div
                          key={`${message.id}-${i}`}
                          className="mt-2 p-2 bg-white/10 dark:bg-black/20 rounded text-xs"
                        >
                          <div className="font-semibold mb-1">
                            📋 Audits List ({String(out.count ?? list.length)})
                          </div>
                          {list.length > 0 && (
                            <ul className="list-disc pl-4 space-y-1">
                              {list.map((a: any) => (
                                <li key={a.id}>
                                  <span className="font-medium">{a.title}</span>
                                  {" "}
                                  <span className="opacity-75">
                                    — {a.plantName} • {a.status} • {a.progress?.resolved ?? 0}/{a.progress?.total ?? 0} resolved
                                  </span>
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
          })}

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

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about audits or observations..."
              className="flex-1"
              disabled={status !== "ready"}
            />
            <Button type="submit" disabled={status !== "ready" || !input.trim()}>
              {status === "streaming" ? "Sending..." : "Send"}
            </Button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            The AI assistant respects your role permissions. You can only see data
            you have access to.
          </p>
        </div>
      </Card>
    </div>
  );
}

