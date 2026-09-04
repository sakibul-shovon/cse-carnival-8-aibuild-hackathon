import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { roomsService } from "./rooms.service.js";
import type { AvailabilityQuery, BookingInput, RoomInput, RoomListQuery, RoomUpdateInput } from "./rooms.validation.js";

export const roomsController = {
  async list(request: Request, response: Response) {
    return sendSuccess(response, await roomsService.list(request.query as RoomListQuery), "Rooms retrieved");
  },
  async get(request: Request, response: Response) {
    return sendSuccess(response, await roomsService.getById(request.params.id as string), "Room retrieved");
  },
  async available(request: Request, response: Response) {
    return sendSuccess(response, await roomsService.findAvailable(request.query as unknown as AvailabilityQuery), "Available rooms retrieved");
  },
  async create(request: Request, response: Response) {
    return sendSuccess(response, await roomsService.create(request.body as RoomInput), "Room created", 201);
  },
  async update(request: Request, response: Response) {
    return sendSuccess(response, await roomsService.update(request.params.id as string, request.body as RoomUpdateInput), "Room updated");
  },
  async remove(request: Request, response: Response) {
    await roomsService.remove(request.params.id as string);
    return sendSuccess(response, null, "Room deleted");
  },
  async book(request: Request, response: Response) {
    const userId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await roomsService.book(request.params.id as string, userId, request.body as BookingInput), "Room booked", 201);
  }
};
