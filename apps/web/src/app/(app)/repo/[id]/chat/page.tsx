"use client";

import { use, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  Bot,
  GitPullRequest,
  CircleDot,
  Code,
  Sparkles,
  SquarePen,
} from "lucide-react";

import { PROSE_CLASSES } from "@/lib/constants";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const SUGGESTED_PROMPTS = [
  { label: "Show open issues", icon: CircleDot },
  { label: "Recommend an easy issue to solve", icon: Sparkles },
  { label: "List open pull requests", icon: GitPullRequest },
  { label: "Search the codebase for the main entry point", icon: Code },
];

const TOOL_LABELS: Record<string, string> = {
  listIssues: "Fetching issues",
  getIssue: "Loading issue details",
  listPullRequests: "Fetching pull requests",
  getPullRequest: "Loading PR details",
  searchCodebase: "Searching codebase",
};

export default function RepoChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { repositoryId: id },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
    inputRef.current?.focus();
  };

  const handlePromptClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  return (
    <div className="-mx-3 flex h-[calc(100vh-3rem)] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4 pb-16">
            <div className="text-center">
              <p className="text-sm font-medium">How can I help you?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask about issues, PRs, or the codebase
              </p>
            </div>
            <div className="grid w-full max-w-sm grid-cols-2 gap-1.5">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => handlePromptClick(prompt.label)}
                  disabled={isLoading}
                  className="flex items-center gap-2 border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-left text-xs transition-colors duration-150 ease-out hover:bg-muted/50 disabled:opacity-40"
                >
                  <prompt.icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5 px-4 py-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user" ? "flex justify-end" : "flex gap-2.5"
                }
              >
                {message.role === "assistant" && (
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900">
                    <Bot className="size-3 text-muted-foreground" />
                  </div>
                )}
                <div
                  className={
                    message.role === "user" ? "max-w-[72%]" : "min-w-0 flex-1"
                  }
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      if (message.role === "user") {
                        return (
                          <div
                            key={i}
                            className="border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm leading-relaxed"
                          >
                            {part.text}
                          </div>
                        );
                      }
                      return (
                        <div key={i} className={PROSE_CLASSES}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {part.text}
                          </ReactMarkdown>
                        </div>
                      );
                    }

                    if (part.type.startsWith("tool-")) {
                      const toolName = part.type.replace("tool-", "");
                      const label = TOOL_LABELS[toolName] ?? toolName;
                      const state =
                        "state" in part ? (part.state as string) : "";
                      if (
                        state === "input-streaming" ||
                        state === "input-available"
                      ) {
                        return (
                          <div
                            key={i}
                            className="my-1.5 inline-flex items-center gap-1.5 border border-neutral-700 bg-neutral-900/50 px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            <span className="size-1.5 animate-pulse bg-muted-foreground/50" />
                            {label}
                          </div>
                        );
                      }
                      return null;
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}

            {isLoading &&
              messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2.5">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900">
                    <Bot className="size-3 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-1 pt-1.5">
                    <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce bg-muted-foreground/40 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
      <div className="shrink-0 px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-2xl items-center gap-3"
        >
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setInput("");
              inputRef.current?.focus();
            }}
            disabled={messages.length === 0}
            title="New chat"
            className="flex size-7 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
          >
            <SquarePen className="size-3.5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about issues, PRs, or the codebase..."
            className="flex-1 border-b border-neutral-700 bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-foreground/30 transition-colors duration-150"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="flex size-7 shrink-0 items-center justify-center border border-neutral-700 bg-neutral-900 text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
