import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { AgentError } from "../errors";
import type {
  LLMChatInput,
  LLMChatOutput,
  LLMMessage,
  LLMProvider,
  LLMToolCall,
  LLMToolSpec,
} from "./types";

export interface OpenAICompatibleOptions {
  name: string;
  apiKey: string;
  model: string;
  baseURL?: string;
}

function toParam(m: LLMMessage): ChatCompletionMessageParam {
  switch (m.role) {
    case "system":
      return { role: "system", content: m.content };
    case "user":
      return { role: "user", content: m.content };
    case "assistant":
      return {
        role: "assistant",
        content: m.content ?? "",
        ...(m.toolCalls && m.toolCalls.length > 0
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            }
          : {}),
      };
    case "tool":
      return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
  }
}

function toTool(t: LLMToolSpec): ChatCompletionTool {
  return {
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  };
}

/**
 * Works for OpenAI and any OpenAI-compatible chat-completions API (e.g. Groq)
 * by overriding `baseURL`.
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(opts: OpenAICompatibleOptions) {
    this.name = opts.name;
    this.model = opts.model;
    this.client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  }

  async chat(input: LLMChatInput): Promise<LLMChatOutput> {
    let completion;
    try {
      completion = await this.client.chat.completions.create({
        model: this.model,
        messages: input.messages.map(toParam),
        temperature: input.temperature ?? 0.2,
        ...(input.tools.length > 0
          ? { tools: input.tools.map(toTool), tool_choice: "auto" as const }
          : {}),
      });
    } catch (err) {
      throw new AgentError("PROVIDER_REQUEST", `${this.name} request failed`, err);
    }

    const choice = completion.choices[0];
    if (!choice) {
      throw new AgentError("PROVIDER_REQUEST", `${this.name} returned no choices`);
    }

    const toolCalls: LLMToolCall[] = [];
    for (const tc of choice.message.tool_calls ?? []) {
      if (tc.type === "function") {
        toolCalls.push({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments });
      }
    }

    const finishReason: LLMChatOutput["finishReason"] =
      choice.finish_reason === "tool_calls" || toolCalls.length > 0
        ? "tool_calls"
        : choice.finish_reason === "stop"
          ? "stop"
          : choice.finish_reason === "length"
            ? "length"
            : "other";

    return { content: choice.message.content, toolCalls, finishReason };
  }
}
