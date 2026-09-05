import { describe, expect, it } from "vitest";
import { z } from "zod";
import { runAgent } from "../agent";
import { AgentError } from "../errors";
import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../provider/types";
import { ToolRegistry, toolError, toolOk } from "../tools";
import type { CampusNow } from "@/types/ai";

const NOW: CampusNow = {
  date: "2026-09-04",
  time: "10:30",
  weekday: "Friday",
  timezone: "Asia/Dhaka",
  timestamp: "2026-09-04T04:30:00.000Z",
  weekStart: "2026-08-30",
  weekEnd: "2026-09-03",
};

/** Replays scripted outputs and records every input it saw. */
function scriptedProvider(outputs: LLMChatOutput[]): LLMProvider & { inputs: LLMChatInput[] } {
  const inputs: LLMChatInput[] = [];
  return {
    name: "mock",
    model: "mock",
    inputs,
    async chat(input) {
      inputs.push(input);
      const next = outputs.shift();
      if (!next) throw new Error("scriptedProvider ran out of outputs");
      return next;
    },
  };
}

const text = (content: string): LLMChatOutput => ({ content, toolCalls: [], finishReason: "stop" });
const call = (id: string, name: string, args: unknown): LLMChatOutput => ({
  content: null,
  toolCalls: [{ id, name, arguments: typeof args === "string" ? args : JSON.stringify(args) }],
  finishReason: "tool_calls",
});

function registryWith(execute: (p: { q: string }) => Promise<ReturnType<typeof toolOk> | ReturnType<typeof toolError>>) {
  return new ToolRegistry().register({
    name: "echo",
    description: "Echoes a query",
    schema: z.object({ q: z.string().min(1) }),
    execute: (p) => execute(p as { q: string }),
  });
}

describe("runAgent", () => {
  it("returns a plain reply when the model calls no tools", async () => {
    const provider = scriptedProvider([text("Hello!")]);
    const out = await runAgent({ messages: [{ role: "user", content: "hi" }], provider, registry: new ToolRegistry(), now: NOW });

    expect(out.reply).toBe("Hello!");
    expect(out.toolEvents).toEqual([]);
    expect(out.now).toEqual(NOW);
    expect(provider.inputs[0].messages[0]).toMatchObject({ role: "system" });
    expect(provider.inputs[0].messages[0].content).toContain("2026-09-04");
  });

  it("executes a tool call, feeds the result back, and returns the final reply", async () => {
    const provider = scriptedProvider([call("c1", "echo", { q: "ping" }), text("Got: pong")]);
    const registry = registryWith(async (p) => toolOk({ echoed: p.q, reply: "pong" }));

    const out = await runAgent({ messages: [{ role: "user", content: "ping" }], provider, registry, now: NOW });

    expect(out.reply).toBe("Got: pong");
    expect(out.toolEvents).toEqual([
      { id: "c1", name: "echo", args: { q: "ping" }, status: "completed", summary: "Done" },
    ]);
    const second = provider.inputs[1].messages;
    expect(second.at(-2)).toMatchObject({ role: "assistant", toolCalls: [{ id: "c1", name: "echo" }] });
    expect(second.at(-1)).toMatchObject({ role: "tool", toolCallId: "c1" });
    expect(JSON.parse((second.at(-1) as { content: string }).content)).toEqual({ ok: true, data: { echoed: "ping", reply: "pong" } });
  });

  it("feeds schema validation failures back to the model instead of throwing", async () => {
    const provider = scriptedProvider([call("c1", "echo", { q: 42 }), text("I need a text query.")]);
    let executed = false;
    const registry = registryWith(async () => {
      executed = true;
      return toolOk(null);
    });

    const out = await runAgent({ messages: [{ role: "user", content: "x" }], provider, registry, now: NOW });

    expect(executed).toBe(false);
    expect(out.toolEvents[0]).toMatchObject({ status: "failed" });
    expect(out.toolEvents[0].summary).toMatch(/Invalid parameters/);
    const toolMsg = JSON.parse((provider.inputs[1].messages.at(-1) as { content: string }).content);
    expect(toolMsg).toMatchObject({ ok: false, error: { code: "TOOL_VALIDATION" } });
  });

  it("handles malformed JSON arguments", async () => {
    const provider = scriptedProvider([call("c1", "echo", "{not json"), text("Sorry.")]);
    const out = await runAgent({ messages: [{ role: "user", content: "x" }], provider, registry: registryWith(async () => toolOk(null)), now: NOW });

    expect(out.toolEvents[0]).toMatchObject({ status: "failed", args: { raw: "{not json" } });
  });

  it("reports unknown tools back to the model", async () => {
    const provider = scriptedProvider([call("c1", "nope", {}), text("That tool isn't available.")]);
    const out = await runAgent({ messages: [{ role: "user", content: "x" }], provider, registry: new ToolRegistry(), now: NOW });

    expect(out.toolEvents[0]).toMatchObject({ name: "nope", status: "failed" });
    const toolMsg = JSON.parse((provider.inputs[1].messages.at(-1) as { content: string }).content);
    expect(toolMsg.error.code).toBe("UNKNOWN_TOOL");
  });

  it("converts thrown tool errors into failed results without leaking details", async () => {
    const provider = scriptedProvider([call("c1", "echo", { q: "boom" }), text("The backend failed.")]);
    const registry = registryWith(async () => {
      throw new Error("supabase: connection refused at 10.0.0.1");
    });

    const out = await runAgent({ messages: [{ role: "user", content: "x" }], provider, registry, now: NOW });

    expect(out.toolEvents[0].status).toBe("failed");
    expect(out.toolEvents[0].summary).not.toContain("10.0.0.1");
  });

  it("passes tool-returned errors through unchanged so the model can explain them", async () => {
    const provider = scriptedProvider([call("c1", "echo", { q: "x" }), text("Room 7A02 is already booked.")]);
    const registry = registryWith(async () => toolError("CONFLICT", "Room 7A02 is already booked 15:00–17:00"));

    const out = await runAgent({ messages: [{ role: "user", content: "x" }], provider, registry, now: NOW });

    expect(out.toolEvents[0]).toMatchObject({ status: "failed", summary: "Room 7A02 is already booked 15:00–17:00" });
    expect(out.reply).toBe("Room 7A02 is already booked.");
  });

  it("stops with MAX_ITERATIONS when the model loops on tools", async () => {
    const provider = scriptedProvider(Array.from({ length: 3 }, (_, i) => call(`c${i}`, "echo", { q: "again" })));
    const registry = registryWith(async () => toolOk("ok"));

    await expect(
      runAgent({ messages: [{ role: "user", content: "x" }], provider, registry, now: NOW, maxIterations: 3 }),
    ).rejects.toMatchObject({ code: "MAX_ITERATIONS" } satisfies Partial<AgentError>);
  });

  it("propagates provider failures as AgentError", async () => {
    const provider: LLMProvider = {
      name: "mock",
      model: "mock",
      async chat() {
        throw new AgentError("PROVIDER_REQUEST", "upstream 500");
      },
    };
    await expect(
      runAgent({ messages: [{ role: "user", content: "x" }], provider, registry: new ToolRegistry(), now: NOW }),
    ).rejects.toMatchObject({ code: "PROVIDER_REQUEST" });
  });

  it("tells the model which campus domains are unavailable and includes identity when given", async () => {
    const provider = scriptedProvider([text("ok")]);
    await runAgent({
      messages: [{ role: "user", content: "x" }],
      user: { student_id: "20-40532", name: "Sakibul Hassan" },
      provider,
      registry: new ToolRegistry(),
      now: NOW,
    });
    const system = provider.inputs[0].messages[0].content as string;
    expect(system).toContain("CANNOT yet access");
    expect(system).toContain("class schedules");
    expect(system).toContain("Sakibul Hassan");
    expect(system).toContain("20-40532");
  });
});
