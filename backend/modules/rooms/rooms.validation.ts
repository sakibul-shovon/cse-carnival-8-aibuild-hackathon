import { z } from "zod";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:mm time");
const roomTypeSchema = z.enum(["CLASSROOM", "LAB", "SEMINAR", "AUDITORIUM", "STUDY"]);

export const roomParamsSchema = z.object({ id: z.string().min(1) });
export const roomListQuerySchema = z.object({
  type: roomTypeSchema.optional(),
  minCapacity: z.coerce.number().int().positive().optional(),
  feature: z.string().trim().min(1).optional()
});
export const roomBodySchema = z.object({
  number: z.string().trim().min(1).max(20),
  type: roomTypeSchema,
  capacity: z.number().int().positive().max(5000),
  floor: z.number().int().min(-5).max(200),
  status: z.enum(["AVAILABLE", "MAINTENANCE", "CLOSED"]).default("AVAILABLE"),
  features: z.array(z.string().trim().min(1).max(80)).max(30).default([])
});
export const roomUpdateBodySchema = roomBodySchema.partial();
export const availabilityQuerySchema = z.object({
  date: z.string().date(),
  startTime: timeSchema,
  endTime: timeSchema,
  minCapacity: z.coerce.number().int().positive().optional(),
  type: roomTypeSchema.optional(),
  features: z.preprocess(
    (value) => typeof value === "string" ? value.split(",").filter(Boolean) : value,
    z.array(z.string().trim().min(1)).default([])
  )
}).refine((value) => value.startTime < value.endTime, { message: "startTime must be before endTime", path: ["endTime"] });
export const bookingBodySchema = z.object({
  date: z.string().date(),
  startTime: timeSchema,
  endTime: timeSchema,
  bookedBy: z.string().trim().min(2).max(120),
  purpose: z.string().trim().min(3).max(255)
}).refine((value) => value.startTime < value.endTime, { message: "startTime must be before endTime", path: ["endTime"] });

export type RoomInput = z.infer<typeof roomBodySchema>;
export type RoomUpdateInput = z.infer<typeof roomUpdateBodySchema>;
export type RoomListQuery = z.infer<typeof roomListQuerySchema>;
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type BookingInput = z.infer<typeof bookingBodySchema>;
