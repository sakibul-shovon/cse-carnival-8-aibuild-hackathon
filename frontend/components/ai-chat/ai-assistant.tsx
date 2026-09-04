"use client";

import { Bot, Send, Sparkles, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAssistant } from "../../features/ai-assistant/useAssistant";
import { cn } from "../../utils/cn";
import { Badge } from "../shared/ui/badge";
import { Button } from "../shared/ui/button";

const suggestions = ["What classes do I have on Wednesday?", "Find a lab for 30 people tomorrow from 2 PM to 4 PM", "What assignments are due soon?"];

export function AiAssistant() {
  const { messages, isSending, error, send } = useAssistant();
  const [draft, setDraft] = useState("");
  function submit(event: FormEvent) { event.preventDefault(); const value = draft; setDraft(""); void send(value); }

  return <section className="mx-auto flex h-[calc(100vh-190px)] min-h-[520px] max-w-4xl flex-col overflow-hidden rounded-lg border bg-card">
    <div className="border-b p-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground"><Bot className="size-5" /></span><div><h2 className="font-bold">Campus intelligence assistant</h2><p className="text-xs text-muted-foreground">Answers with live backend tools</p></div></div></div>
    <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">{messages.map((message) => <div key={message.id} className={cn("flex gap-3", message.role === "user" && "justify-end")}>
      {message.role === "assistant" && <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted"><Sparkles className="size-4 text-primary" /></span>}
      <div className={cn("max-w-[85%] rounded-lg px-4 py-3 text-sm leading-6", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}><p className="whitespace-pre-wrap">{message.content}</p>{message.toolsUsed?.length ? <div className="mt-2 flex flex-wrap gap-1">{message.toolsUsed.map((tool) => <Badge key={tool} className="bg-card">{tool}</Badge>)}</div> : null}</div>
      {message.role === "user" && <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10"><User className="size-4 text-primary" /></span>}
    </div>)}{isSending && <p className="text-sm text-muted-foreground" role="status">Checking campus systems…</p>}{error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}</div>
    <div className="border-t p-4"><div className="mb-3 flex gap-2 overflow-x-auto pb-1">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)} disabled={isSending} className="min-h-9 shrink-0 rounded-md border px-3 text-xs font-medium hover:bg-muted disabled:opacity-50">{suggestion}</button>)}</div><form onSubmit={submit} className="flex gap-2"><label className="sr-only" htmlFor="assistant-message">Ask CampusOS</label><input id="assistant-message" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about campus…" maxLength={4000} className="min-h-11 flex-1 rounded-md border bg-background px-3 text-sm" /><Button type="submit" size="icon" disabled={!draft.trim() || isSending} aria-label="Send message"><Send className="size-4" /></Button></form></div>
  </section>;
}
