import type { CampusNow, ChatMessage, ChatUser, ToolEvent } from "@/types/ai";
import { getCampusNow } from "./datetime";
import { AgentError } from "./errors";
import { buildSystemPrompt } from "./prompt";
import { getProvider } from "./provider";
import type { LLMMessage, LLMProvider } from "./provider/types";
import { createDefaultRegistry, toolError, type ToolRegistry, type ToolResult } from "./tools";

export interface RunAgentInput {
  messages: ChatMessage[];
  user?: ChatUser;
  /** Injectable for tests; defaults to env-configured provider. */
  provider?: LLMProvider;
  registry?: ToolRegistry;
  now?: CampusNow;
  maxIterations?: number;
}

export interface RunAgentOutput {
  reply: string;
  toolEvents: ToolEvent[];
  now: CampusNow;
}

const DEFAULT_MAX_ITERATIONS = 6;

function parseArguments(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("arguments must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function summarize(result: ToolResult): string {
  if (!result.ok) return result.error.message;
  if (Array.isArray(result.data)) return `${result.data.length} result(s)`;
  return "Done";
}

async function resolveToolCall(
  registry: ToolRegistry,
  call: { name: string; arguments: string },
  ctx: { now: CampusNow; user?: ChatUser },
): Promise<{ args: Record<string, unknown>; result: ToolResult }> {
  const tool = registry.get(call.name);
  if (!tool) {
    return { args: {}, result: toolError("UNKNOWN_TOOL", `Tool "${call.name}" does not exist`) };
  }

  let args: Record<string, unknown>;
  try {
    args = parseArguments(call.arguments);
  } catch (err) {
    return {
      args: { raw: call.arguments },
      result: toolError("TOOL_VALIDATION", `Invalid JSON arguments: ${(err as Error).message}`),
    };
  }

  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((iss) => `${iss.path.join(".") || "(root)"}: ${iss.message}`)
      .join("; ");
    return { args, result: toolError("TOOL_VALIDATION", `Invalid parameters — ${issues}`) };
  }

  try {
    return { args, result: await tool.execute(parsed.data, ctx) };
  } catch (err) {
    console.error(`[ai] tool "${call.name}" threw`, err);
    return { args, result: toolError("TOOL_EXECUTION", "The backend could not complete this operation.") };
  }
}

/**
 * Runs one turn of the agent: LLM → (tool calls → results)* → final reply.
 * Tool failures are fed back to the model as structured errors, never thrown,
 * so the model can explain them rather than the request crashing.
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentOutput> {
  const now = input.now ?? getCampusNow();
  const registry = input.registry ?? createDefaultRegistry();
  const provider = input.provider ?? getProvider();
  const maxIterations = input.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const tools = registry.toProviderTools();
  const ctx = { now, user: input.user };

  const transcript: LLMMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({ now, user: input.user, toolNames: tools.map((t) => t.name) }),
    },
    ...input.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const toolEvents: ToolEvent[] = [];

  for (let i = 0; i < maxIterations; i++) {
    const out = await provider.chat({ messages: transcript, tools });

    if (out.toolCalls.length === 0) {
      return { reply: out.content?.trim() || "I couldn't come up with a response. Please try again.", toolEvents, now };
    }

    transcript.push({ role: "assistant", content: out.content, toolCalls: out.toolCalls });

    for (const call of out.toolCalls) {
      const { args, result } = await resolveToolCall(registry, call, ctx);

      toolEvents.push({
        id: call.id,
        name: call.name,
        args,
        status: result.ok ? "completed" : "failed",
        summary: summarize(result),
      });

      transcript.push({ role: "tool", toolCallId: call.id, content: JSON.stringify(result) });
    }
  }

  throw new AgentError("MAX_ITERATIONS", `Agent exceeded ${maxIterations} tool iterations`);
}
