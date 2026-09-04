import { z } from "zod";

export const eventParamsSchema = z.object({ id: z.string().min(1) });
export const eventListQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional()
});
const eventFieldsSchema = z.object({
  name: z.string().trim().min(3).max(190),
  description: z.string().trim().max(5000).nullable().default(null),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  roomNumber: z.string().trim().min(1).max(20).nullable().default(null),
  venueLabel: z.string().trim().min(1).max(120),
  organizer: z.string().trim().min(2).max(120),
  capacity: z.number().int().positive().max(100000),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).default("UPCOMING")
});
export const eventBodySchema = eventFieldsSchema.refine((value) => value.startsAt < value.endsAt, {
  message: "startsAt must be before endsAt", path: ["endsAt"]
});
export const eventUpdateBodySchema = eventFieldsSchema.partial().refine(
  (value) => !value.startsAt || !value.endsAt || value.startsAt < value.endsAt,
  { message: "startsAt must be before endsAt", path: ["endsAt"] }
);
export const eventRegistrationBodySchema = z.object({ userId: z.string().min(1).optional() });

export type EventInput = z.infer<typeof eventBodySchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateBodySchema>;
export type EventListQuery = z.infer<typeof eventListQuerySchema>;
