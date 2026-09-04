import { Router } from "express";
import { validateRequest } from "../middleware/validateRequest.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { aiController } from "./ai.controller.js";
import { agentChatBodySchema, agentSessionParamsSchema } from "./ai.validation.js";

export const aiRouter = Router();
aiRouter.get("/tools", asyncHandler(aiController.listTools));
aiRouter.post("/chat", validateRequest({ body: agentChatBodySchema }), asyncHandler(aiController.chat));
aiRouter.delete("/sessions/:sessionId", validateRequest({ params: agentSessionParamsSchema }), asyncHandler(aiController.clearSession));
