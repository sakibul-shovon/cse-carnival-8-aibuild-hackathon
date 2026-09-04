import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { notificationsService } from "./notifications.service.js";
import type { NotificationInput, NotificationListQuery, NotificationUpdateInput } from "./notifications.validation.js";

export const notificationsController = {
  async list(request: Request, response: Response) {
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await notificationsService.list(currentUserId, request.query as NotificationListQuery), "Notifications retrieved");
  },
  async get(request: Request, response: Response) {
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await notificationsService.getById(request.params.id as string, currentUserId), "Notification retrieved");
  },
  async create(request: Request, response: Response) {
    return sendSuccess(response, await notificationsService.create(request.body as NotificationInput), "Notification created", 201);
  },
  async update(request: Request, response: Response) {
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await notificationsService.update(request.params.id as string, currentUserId, request.body as NotificationUpdateInput), "Notification updated");
  },
  async remove(request: Request, response: Response) {
    const currentUserId = (request as AuthenticatedRequest).auth.userId;
    await notificationsService.remove(request.params.id as string, currentUserId);
    return sendSuccess(response, null, "Notification deleted");
  }
};
