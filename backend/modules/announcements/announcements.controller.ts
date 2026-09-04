import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { announcementsService } from "./announcements.service.js";
import type { AnnouncementInput, AnnouncementListQuery, AnnouncementUpdateInput } from "./announcements.validation.js";

export const announcementsController = {
  async list(request: Request, response: Response) { return sendSuccess(response, await announcementsService.list(request.query as AnnouncementListQuery), "Announcements retrieved"); },
  async get(request: Request, response: Response) { return sendSuccess(response, await announcementsService.getById(request.params.id as string), "Announcement retrieved"); },
  async create(request: Request, response: Response) { return sendSuccess(response, await announcementsService.create(request.body as AnnouncementInput), "Announcement created", 201); },
  async update(request: Request, response: Response) { return sendSuccess(response, await announcementsService.update(request.params.id as string, request.body as AnnouncementUpdateInput), "Announcement updated"); },
  async remove(request: Request, response: Response) { await announcementsService.remove(request.params.id as string); return sendSuccess(response, null, "Announcement deleted"); }
};
