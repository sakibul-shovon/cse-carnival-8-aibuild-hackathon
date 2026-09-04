import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { announcementsController } from "./announcements.controller.js";
import { announcementBodySchema, announcementListQuerySchema, announcementParamsSchema, announcementUpdateBodySchema } from "./announcements.validation.js";

export const announcementsRouter = Router();
announcementsRouter.get("/", validateRequest({ query: announcementListQuerySchema }), asyncHandler(announcementsController.list));
announcementsRouter.get("/:id", validateRequest({ params: announcementParamsSchema }), asyncHandler(announcementsController.get));
announcementsRouter.post("/", validateRequest({ body: announcementBodySchema }), asyncHandler(announcementsController.create));
announcementsRouter.patch("/:id", validateRequest({ params: announcementParamsSchema, body: announcementUpdateBodySchema }), asyncHandler(announcementsController.update));
announcementsRouter.delete("/:id", validateRequest({ params: announcementParamsSchema }), asyncHandler(announcementsController.remove));
