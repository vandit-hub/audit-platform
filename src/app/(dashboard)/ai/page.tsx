"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { useSession } from "next-auth/react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

export default function AIAssistantPage() {
  const { data: session } = useSession();
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/v1/ai/chat",
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== "ready") return;

    sendMessage({ text: input });
    setInput("");
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

      <Card className="mb-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Try asking:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• "How many draft observations do I have?"</li>
            <li>• "List my observations with risk category A"</li>
            <li>• "Show me audits in progress"</li>
            <li>• "Count approved observations in Plant X"</li>
            <li>• "What audits am I assigned to?"</li>
          </ul>
        </div>
      </Card>

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
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-lg px-4 py-2 ${
                  message.role === "user"
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
                          className="whitespace-pre-wrap"
                        >
                          {part.text}
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
          ))}

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

