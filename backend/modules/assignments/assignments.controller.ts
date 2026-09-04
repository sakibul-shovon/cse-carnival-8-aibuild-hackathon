import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { assignmentsService } from "./assignments.service.js";
import type { AssignmentInput, AssignmentListQuery, AssignmentUpdateInput } from "./assignments.validation.js";

export const assignmentsController = {
  async list(request: Request, response: Response) {
    const query = request.query as AssignmentListQuery;
    query.userId ??= (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await assignmentsService.list(query), "Assignments retrieved");
  },
  async get(request: Request, response: Response) { return sendSuccess(response, await assignmentsService.getById(request.params.id as string), "Assignment retrieved"); },
  async create(request: Request, response: Response) { return sendSuccess(response, await assignmentsService.create(request.body as AssignmentInput), "Assignment created", 201); },
  async update(request: Request, response: Response) { return sendSuccess(response, await assignmentsService.update(request.params.id as string, request.body as AssignmentUpdateInput), "Assignment updated"); },
  async remove(request: Request, response: Response) { await assignmentsService.remove(request.params.id as string); return sendSuccess(response, null, "Assignment deleted"); },
  async setStatus(request: Request, response: Response) {
    const userId = (request as AuthenticatedRequest).auth.userId;
    return sendSuccess(response, await assignmentsService.setStatus(request.params.id as string, userId, request.body.status), "Assignment status updated");
  }
};
