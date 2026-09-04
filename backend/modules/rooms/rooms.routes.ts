import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { roomsController } from "./rooms.controller.js";
import {
  availabilityQuerySchema, bookingBodySchema, roomBodySchema, roomListQuerySchema, roomParamsSchema, roomUpdateBodySchema
} from "./rooms.validation.js";

export const roomsRouter = Router();

roomsRouter.get("/available", validateRequest({ query: availabilityQuerySchema }), asyncHandler(roomsController.available));
roomsRouter.get("/", validateRequest({ query: roomListQuerySchema }), asyncHandler(roomsController.list));
roomsRouter.get("/:id", validateRequest({ params: roomParamsSchema }), asyncHandler(roomsController.get));
roomsRouter.post("/", validateRequest({ body: roomBodySchema }), asyncHandler(roomsController.create));
roomsRouter.patch("/:id", validateRequest({ params: roomParamsSchema, body: roomUpdateBodySchema }), asyncHandler(roomsController.update));
roomsRouter.delete("/:id", validateRequest({ params: roomParamsSchema }), asyncHandler(roomsController.remove));
roomsRouter.post("/:id/bookings", validateRequest({ params: roomParamsSchema, body: bookingBodySchema }), asyncHandler(roomsController.book));
