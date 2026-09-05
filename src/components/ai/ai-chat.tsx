"use client";

import * as React from "react";
import { AlertTriangle, Bot, RefreshCw, Send, Sparkles, UserRound } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { sendChat } from "@/lib/data/chat";
import type { ChatMessage as ApiMessage, ChatUser, ToolEvent } from "@/types/ai";
import { ChatMessage } from "./chat-message";
import { ThinkingIndicator } from "./thinking-indicator";
import { SuggestedPrompts } from "./suggested-prompts";
import { IdentityDialog } from "./identity-dialog";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEvents?: ToolEvent[];
};

const IDENTITY_KEY = "campusos.ai.identity";

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function AiChat() {
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [identity, setIdentity] = React.useState<ChatUser | null>(null);
  const [identityOpen, setIdentityOpen] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(IDENTITY_KEY);
      if (raw) setIdentity(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, error]);

  function persistIdentity(user: ChatUser | null) {
    setIdentity(user);
    try {
      if (user) localStorage.setItem(IDENTITY_KEY, JSON.stringify(user));
      else localStorage.removeItem(IDENTITY_KEY);
    } catch {
      // ignore
    }
  }

  const runRequest = React.useCallback(
    async (history: UiMessage[]) => {
      setLoading(true);
      setError(null);
      const apiMessages: ApiMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      try {
        const res = await sendChat(apiMessages, identity ?? undefined);
        setMessages((prev) => [
          ...prev,
          {
            id: newId(),
            role: "assistant",
            content: res.reply,
            toolEvents: res.toolEvents ?? [],
          },
        ]);
      } catch (err) {
        setError((err as Error).message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [identity]
  );

  const send = React.useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;
      const userMsg: UiMessage = {
        id: newId(),
        role: "user",
        content: trimmed,
      };
      const next = [...messages, userMsg];
      setMessages(next);
      setInput("");
      void runRequest(next);
    },
    [messages, loading, runRequest]
  );

  function handleRetry() {
    if (loading || messages.length === 0) return;
    // Last message is the user's unanswered prompt; re-run against current history.
    if (messages[messages.length - 1].role === "user") {
      void runRequest(messages);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function handleNewChat() {
    if (loading) return;
    setMessages([]);
    setError(null);
    setInput("");
    textareaRef.current?.focus();
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      {/* Header — campus control center identity */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-ai-surface/60 to-transparent px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-ai text-white">
            <Bot className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              CampusOS Assistant
              <Sparkles className="size-3.5 text-ai-accent" aria-hidden="true" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Live answers and actions across your campus
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdentityOpen(true)}
          >
            <UserRound aria-hidden="true" />
            <span className="hidden sm:inline">
              {identity ? identity.name.split(" ")[0] : "Set details"}
            </span>
          </Button>
          {!isEmpty ? (
            <Button variant="ghost" size="sm" onClick={handleNewChat}>
              New chat
            </Button>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        {isEmpty ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-ai-surface text-ai-accent">
              <Bot className="size-7" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-lg font-semibold">
                How can I help around campus?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask about your schedule, deadlines, rooms, or events — I read the
                live data and can book rooms or register you for events.
              </p>
            </div>
            <div className="w-full">
              <SuggestedPrompts onSelect={send} disabled={loading} />
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                role={m.role}
                content={m.content}
                toolEvents={m.toolEvents}
              />
            ))}
            {loading ? <ThinkingIndicator /> : null}
            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0 text-danger"
                  aria-hidden="true"
                />
                <div className="flex-1">
                  <p className="text-danger">{error}</p>
                  {messages[messages.length - 1]?.role === "user" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={handleRetry}
                    >
                      <RefreshCw aria-hidden="true" />
                      Try again
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Ask CampusOS anything…"
            disabled={loading}
            className={cn(
              "max-h-32 min-h-10 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-text-subtle focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            )}
          />
          <Button
            onClick={() => send(input)}
            disabled={loading || input.trim() === ""}
            size="icon"
            aria-label="Send message"
            className="bg-ai text-white hover:bg-ai-accent"
          >
            <Send className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-xs text-text-subtle">
          CampusOS answers from live data. Double-check important actions.
        </p>
      </div>

      <IdentityDialog
        open={identityOpen}
        onOpenChange={setIdentityOpen}
        initial={identity}
        onSave={persistIdentity}
      />
    </div>
  );
}
