/**
 * Shared AI contract between the agent backend (`src/lib/ai`), the
 * `/api/chat` route, and the AI Agent UI (Task 16).
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Identity of the student talking to the agent. Optional until auth exists. */
export interface ChatUser {
  student_id: string;
  name: string;
}

export type ToolEventStatus = "completed" | "failed";

/** One tool invocation performed while answering a request. */
export interface ToolEvent {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolEventStatus;
  /** Short human-readable outcome, safe to display in the UI. */
  summary: string;
}

/** Server clock snapshot the agent reasoned against. */
export interface CampusNow {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM (24h) */
  time: string;
  weekday:
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday";
  timezone: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** YYYY-MM-DD of the Sunday starting the current university week */
  weekStart: string;
  /** YYYY-MM-DD of the Thursday ending the current university week */
  weekEnd: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  user?: ChatUser;
}

export interface ChatResponse {
  reply: string;
  toolEvents: ToolEvent[];
  now: CampusNow;
}

export interface ChatErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
