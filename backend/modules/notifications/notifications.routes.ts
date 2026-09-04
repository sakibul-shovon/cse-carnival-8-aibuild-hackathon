import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { notificationsController } from "./notifications.controller.js";
import { notificationBodySchema, notificationListQuerySchema, notificationParamsSchema, notificationUpdateBodySchema } from "./notifications.validation.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", validateRequest({ query: notificationListQuerySchema }), asyncHandler(notificationsController.list));
notificationsRouter.get("/:id", validateRequest({ params: notificationParamsSchema }), asyncHandler(notificationsController.get));
notificationsRouter.post("/", validateRequest({ body: notificationBodySchema }), asyncHandler(notificationsController.create));
notificationsRouter.patch("/:id", validateRequest({ params: notificationParamsSchema, body: notificationUpdateBodySchema }), asyncHandler(notificationsController.update));
notificationsRouter.delete("/:id", validateRequest({ params: notificationParamsSchema }), asyncHandler(notificationsController.remove));
