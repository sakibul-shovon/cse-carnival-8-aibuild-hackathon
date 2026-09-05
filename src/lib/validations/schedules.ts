import { z } from 'zod';

export const ScheduleSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  course: z.string().min(1, 'Course is required'),
  title: z.string().min(1, 'Title is required'),
  day: z.string().min(1, 'Day is required'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'),
  room: z.string().min(1, 'Room is required'),
  instructor: z.string().min(1, 'Instructor is required'),
  section: z.string().min(1, 'Section is required'),
});

export const CreateScheduleSchema = ScheduleSchema;
export const UpdateScheduleSchema = ScheduleSchema.partial();

export type ScheduleInput = z.infer<typeof ScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;
