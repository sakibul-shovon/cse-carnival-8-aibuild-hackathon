import { NextResponse } from "next/server";
import { z } from "zod";
import { runAgent } from "@/lib/ai/agent";
import { AgentError, toSafeMessage } from "@/lib/ai/errors";
import { getSessionUser } from "@/lib/auth";
import type { ChatErrorResponse, ChatResponse } from "@/types/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 4000;

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES)
    .refine((msgs) => msgs.length === 0 || msgs[msgs.length - 1].role === "user", {
      message: "The last message must be from the user",
    }),
  user: z
    .object({
      student_id: z.string().trim().min(1).max(50),
      name: z.string().trim().min(1).max(100),
    })
    .optional(),
});

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json<ChatErrorResponse>({ error: { code, message } }, { status });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "BAD_REQUEST", "Request body must be valid JSON");
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues[0];
    return errorResponse(
      400,
      "BAD_REQUEST",
      `${detail.path.join(".") || "body"}: ${detail.message}`,
    );
  }

  try {
    // Session identity is authoritative — never trust client-supplied user info.
    const sessionUser = await getSessionUser();
    const user =
      sessionUser && sessionUser.student_id && sessionUser.name
        ? { student_id: sessionUser.student_id, name: sessionUser.name }
        : parsed.data.user;
    const result = await runAgent({ messages: parsed.data.messages, user });
    return NextResponse.json<ChatResponse>(result);
  } catch (err) {
    // Full detail stays server-side; the client only sees a sanitized message.
    console.error("[api/chat]", err instanceof AgentError ? `${err.code}: ${err.message}` : err, err instanceof AgentError ? err.cause : "");
    const safe = toSafeMessage(err);
    const status = safe.code === "BAD_REQUEST" ? 400 : safe.code === "PROVIDER_REQUEST" ? 502 : 500;
    return errorResponse(status, safe.code, safe.message);
  }
}
