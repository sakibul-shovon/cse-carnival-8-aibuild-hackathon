import { z } from "zod";
import type { CampusNow, ChatUser } from "@/types/ai";
import type { LLMToolSpec } from "../provider/types";

/** Context every tool receives. Identity may be absent — tools must not guess it. */
export interface ToolContext {
  now: CampusNow;
  user?: ChatUser;
}

export type ToolResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export function toolOk<T>(data: T): ToolResult<T> {
  return { ok: true, data };
}

export function toolError(code: string, message: string): ToolResult<never> {
  return { ok: false, error: { code, message } };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ToolDefinition<S extends z.ZodType<any> = z.ZodType<any>> {
  name: string;
  description: string;
  schema: S;
  execute(params: z.infer<S>, ctx: ToolContext): Promise<ToolResult>;
  /** Optional UI-facing label, e.g. "Checking room availability". */
  progressLabel?: string;
}

export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): this {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  toProviderTools(): LLMToolSpec[] {
    return this.list().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.schema, { io: "input" }) as Record<string, unknown>,
    }));
  }
}
