import { z } from "zod";
import { toolOk, type ToolDefinition } from "./registry";

/**
 * Utility tool that exercises the native tool-calling loop end-to-end.
 * Not one of the nine official campus tools; the system prompt already
 * carries the clock, so the model rarely needs this.
 */
export const getCurrentDatetimeTool: ToolDefinition = {
  name: "get_current_datetime",
  description:
    "Returns the current campus date, time, weekday, and the Sunday–Thursday university week bounds. Use only if you need to re-confirm the current time.",
  schema: z.object({}),
  progressLabel: "Checking the campus clock",
  async execute(_params, ctx) {
    return toolOk(ctx.now);
  },
};
