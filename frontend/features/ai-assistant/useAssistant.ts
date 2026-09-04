"use client";

import { useRef, useState } from "react";
import { api } from "../../services/api";

export interface ChatMessage { id: string; role: "user" | "assistant"; content: string; toolsUsed?: string[] }

export function useAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: "Ask me about your classes, rooms, assignments, events, or campus announcements." }
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = useRef<string | undefined>(undefined);

  async function send(content: string): Promise<void> {
    const text = content.trim();
    if (!text || isSending) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: text }]);
    setIsSending(true);
    setError(null);
    try {
      const reply = await api.sendMessage(text, sessionId.current);
      sessionId.current = reply.sessionId;
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: reply.message, toolsUsed: reply.toolsUsed }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The assistant is unavailable");
    } finally {
      setIsSending(false);
    }
  }

  return { messages, isSending, error, send };
}
