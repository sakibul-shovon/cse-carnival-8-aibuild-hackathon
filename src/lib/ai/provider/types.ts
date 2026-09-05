/**
 * Provider-agnostic LLM interface. The agent loop only depends on this,
 * so the concrete vendor (OpenAI, Groq, …) can be swapped via env config.
 */

export type LLMMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls?: LLMToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface LLMToolCall {
  id: string;
  name: string;
  /** Raw JSON string from the model; must be parsed and validated by the caller. */
  arguments: string;
}

export interface LLMToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the parameters object. */
  parameters: Record<string, unknown>;
}

export interface LLMChatInput {
  messages: LLMMessage[];
  tools: LLMToolSpec[];
  temperature?: number;
}

export interface LLMChatOutput {
  content: string | null;
  toolCalls: LLMToolCall[];
  finishReason: "stop" | "tool_calls" | "length" | "other";
}

export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  chat(input: LLMChatInput): Promise<LLMChatOutput>;
}
