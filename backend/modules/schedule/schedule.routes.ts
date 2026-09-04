import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { scheduleController } from "./schedule.controller.js";
import {
  scheduleBodySchema,
  scheduleListQuerySchema,
  scheduleParamsSchema,
  scheduleUpdateBodySchema
} from "./schedule.validation.js";

export const scheduleRouter = Router();

scheduleRouter.get("/", validateRequest({ query: scheduleListQuerySchema }), asyncHandler(scheduleController.list));
scheduleRouter.get("/:id", validateRequest({ params: scheduleParamsSchema }), asyncHandler(scheduleController.get));
scheduleRouter.post("/", validateRequest({ body: scheduleBodySchema }), asyncHandler(scheduleController.create));
scheduleRouter.patch("/:id", validateRequest({ params: scheduleParamsSchema, body: scheduleUpdateBodySchema }), asyncHandler(scheduleController.update));
scheduleRouter.delete("/:id", validateRequest({ params: scheduleParamsSchema }), asyncHandler(scheduleController.remove));
