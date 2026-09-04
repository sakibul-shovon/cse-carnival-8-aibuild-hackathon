import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { eventsController } from "./events.controller.js";
import { eventBodySchema, eventListQuerySchema, eventParamsSchema, eventRegistrationBodySchema, eventUpdateBodySchema } from "./events.validation.js";

export const eventsRouter = Router();
eventsRouter.get("/", validateRequest({ query: eventListQuerySchema }), asyncHandler(eventsController.list));
eventsRouter.get("/:id", validateRequest({ params: eventParamsSchema }), asyncHandler(eventsController.get));
eventsRouter.post("/", validateRequest({ body: eventBodySchema }), asyncHandler(eventsController.create));
eventsRouter.patch("/:id", validateRequest({ params: eventParamsSchema, body: eventUpdateBodySchema }), asyncHandler(eventsController.update));
eventsRouter.delete("/:id", validateRequest({ params: eventParamsSchema }), asyncHandler(eventsController.remove));
eventsRouter.post("/:id/registrations", validateRequest({ params: eventParamsSchema, body: eventRegistrationBodySchema }), asyncHandler(eventsController.register));
