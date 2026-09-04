import { z } from "zod";

export const dayOfWeekSchema = z.enum([
  "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"
]);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm time");

export const scheduleListQuerySchema = z.object({
  day: dayOfWeekSchema.optional(),
  userId: z.string().min(1).optional(),
  semester: z.string().min(1).optional()
});

export const scheduleParamsSchema = z.object({ id: z.string().min(1) });

const scheduleFieldsSchema = z.object({
  courseCode: z.string().trim().min(2).max(24),
  courseTitle: z.string().trim().min(2).max(190),
  department: z.string().trim().min(2).max(80).default("CSE"),
  roomNumber: z.string().trim().min(1).max(20),
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  instructor: z.string().trim().min(2).max(120),
  section: z.string().trim().min(1).max(20),
  semester: z.string().trim().min(2).max(40).default("Fall 2026")
});

export const scheduleBodySchema = scheduleFieldsSchema.refine((value) => value.startTime < value.endTime, {
  message: "startTime must be before endTime",
  path: ["endTime"]
});

export const scheduleUpdateBodySchema = scheduleFieldsSchema.partial().refine(
  (value) => !value.startTime || !value.endTime || value.startTime < value.endTime,
  { message: "startTime must be before endTime", path: ["endTime"] }
);
export type ScheduleInput = z.infer<typeof scheduleBodySchema>;
export type ScheduleUpdateInput = z.infer<typeof scheduleUpdateBodySchema>;
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>;
