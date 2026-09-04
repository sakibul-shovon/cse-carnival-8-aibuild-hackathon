import { z } from 'zod';

export const AssignmentStatusEnum = z.enum(['pending', 'submitted', 'graded', 'late']);

export const AssignmentSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  course: z.string().min(1, 'Course is required'),
  course_title: z.string().min(1, 'Course title is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  assigned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned date must be in YYYY-MM-DD format'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Deadline must be in YYYY-MM-DD format'),
  submission_platform: z.string().min(1, 'Submission platform is required'),
  status: AssignmentStatusEnum,
  marks: z.number().int().nonnegative('Marks must be non-negative'),
});

export const CreateAssignmentSchema = AssignmentSchema;
export const UpdateAssignmentSchema = AssignmentSchema.partial();

export type AssignmentInput = z.infer<typeof AssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentSchema>;
