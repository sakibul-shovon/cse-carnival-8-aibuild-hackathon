import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { scheduleService } from "./schedule.service.js";
import type { ScheduleInput, ScheduleListQuery, ScheduleUpdateInput } from "./schedule.validation.js";

export const scheduleController = {
  async list(request: Request, response: Response) {
    return sendSuccess(response, await scheduleService.list(request.query as ScheduleListQuery), "Schedules retrieved");
  },
  async get(request: Request, response: Response) {
    return sendSuccess(response, await scheduleService.getById(request.params.id as string), "Schedule retrieved");
  },
  async create(request: Request, response: Response) {
    return sendSuccess(response, await scheduleService.create(request.body as ScheduleInput), "Schedule created", 201);
  },
  async update(request: Request, response: Response) {
    return sendSuccess(response, await scheduleService.update(request.params.id as string, request.body as ScheduleUpdateInput), "Schedule updated");
  },
  async remove(request: Request, response: Response) {
    await scheduleService.remove(request.params.id as string);
    return sendSuccess(response, null, "Schedule deleted");
  }
};
