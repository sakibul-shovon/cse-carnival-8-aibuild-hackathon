import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { runCampusAgent } from "./agent.js";
import { chatMemoryService } from "./chatMemory.service.js";
import { campusTools } from "./tools.js";

export const aiController = {
  async chat(request: Request, response: Response) {
    const sessionId = request.body.sessionId ?? randomUUID();
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await runCampusAgent(request.body.message, sessionId, currentUserId), "AI response generated");
  },
  async listTools(_request: Request, response: Response) {
    return sendSuccess(response, campusTools.map(({ name, description }) => ({ name, description })), "AI tools retrieved");
  },
  async clearSession(request: Request, response: Response) {
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    await chatMemoryService.clearSession(request.params.sessionId as string, currentUserId);
    return sendSuccess(response, null, "AI session cleared");
  }
};
