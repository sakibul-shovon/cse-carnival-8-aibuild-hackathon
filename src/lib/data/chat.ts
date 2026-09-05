import type { ChatMessage, ChatResponse, ChatUser } from "@/types/ai";

export type { ChatMessage, ChatResponse, ChatUser };

export async function sendChat(
  messages: ChatMessage[],
  user: ChatUser | undefined,
  signal?: AbortSignal
): Promise<ChatResponse> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user ? { messages, user } : { messages }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new Error("Couldn't reach the assistant. Check your connection and try again.");
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // ignore parse failures; handled below
  }

  if (!res.ok) {
    const message = (body as { error?: { message?: string } })?.error?.message;
    throw new Error(message || "The assistant is unavailable right now. Please try again.");
  }

  return body as ChatResponse;
}
