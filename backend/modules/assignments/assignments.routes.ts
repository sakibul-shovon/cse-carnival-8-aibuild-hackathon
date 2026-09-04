import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { assignmentsController } from "./assignments.controller.js";
import { assignmentBodySchema, assignmentListQuerySchema, assignmentParamsSchema, assignmentStatusBodySchema, assignmentUpdateBodySchema } from "./assignments.validation.js";

export const assignmentsRouter = Router();
assignmentsRouter.get("/", validateRequest({ query: assignmentListQuerySchema }), asyncHandler(assignmentsController.list));
assignmentsRouter.get("/:id", validateRequest({ params: assignmentParamsSchema }), asyncHandler(assignmentsController.get));
assignmentsRouter.post("/", validateRequest({ body: assignmentBodySchema }), asyncHandler(assignmentsController.create));
assignmentsRouter.patch("/:id", validateRequest({ params: assignmentParamsSchema, body: assignmentUpdateBodySchema }), asyncHandler(assignmentsController.update));
assignmentsRouter.delete("/:id", validateRequest({ params: assignmentParamsSchema }), asyncHandler(assignmentsController.remove));
assignmentsRouter.patch("/:id/status", validateRequest({ params: assignmentParamsSchema, body: assignmentStatusBodySchema }), asyncHandler(assignmentsController.setStatus));
