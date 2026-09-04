import { z } from "zod";

export const assignmentParamsSchema = z.object({ id: z.string().min(1) });
export const assignmentListQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "GRADED"]).optional()
});
const assignmentFieldsSchema = z.object({
  courseCode: z.string().trim().min(2).max(24),
  courseTitle: z.string().trim().min(2).max(190),
  department: z.string().trim().min(2).max(80).default("CSE"),
  title: z.string().trim().min(3).max(190),
  description: z.string().trim().max(5000).nullable().default(null),
  assignedAt: z.string().datetime(),
  dueAt: z.string().datetime(),
  submissionPlatform: z.string().trim().min(2).max(120),
  marks: z.number().int().nonnegative().max(1000)
});
export const assignmentBodySchema = assignmentFieldsSchema.refine((value) => value.assignedAt < value.dueAt, {
  message: "assignedAt must be before dueAt", path: ["dueAt"]
});
export const assignmentUpdateBodySchema = assignmentFieldsSchema.partial().refine(
  (value) => !value.assignedAt || !value.dueAt || value.assignedAt < value.dueAt,
  { message: "assignedAt must be before dueAt", path: ["dueAt"] }
);
export const assignmentStatusBodySchema = z.object({ status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "GRADED"]) });

export type AssignmentInput = z.infer<typeof assignmentBodySchema>;
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateBodySchema>;
export type AssignmentListQuery = z.infer<typeof assignmentListQuerySchema>;
