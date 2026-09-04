import { z } from "zod";

export const agentChatBodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  sessionId: z.string().trim().min(8).max(64).optional()
});

export const agentSessionParamsSchema = z.object({ sessionId: z.string().trim().min(8).max(64) });
