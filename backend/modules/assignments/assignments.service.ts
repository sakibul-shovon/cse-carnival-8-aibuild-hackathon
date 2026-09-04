import type { AssignmentStatus } from "@prisma/client";
import { AppError } from "../../utils/AppError.js";
import { assignmentsModel } from "./assignments.model.js";
import type { AssignmentInput, AssignmentListQuery, AssignmentUpdateInput } from "./assignments.validation.js";

export const assignmentsService = {
  list(query: AssignmentListQuery = {}) { return assignmentsModel.findMany(query); },
  async getById(id: string) {
    const assignment = await assignmentsModel.findById(id);
    if (!assignment) throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
    return assignment;
  },
  create(input: AssignmentInput) { return assignmentsModel.create(input); },
  async update(id: string, input: AssignmentUpdateInput) { await this.getById(id); return assignmentsModel.update(id, input); },
  async remove(id: string) { await this.getById(id); await assignmentsModel.delete(id); },
  async setStatus(id: string, externalUserId: string, status: AssignmentStatus) {
    await this.getById(id);
    return assignmentsModel.setStatus(id, externalUserId, status);
  }
};
