import { z } from "zod";

const sourceTypeSchema = z.enum(["ANNOUNCEMENT", "ASSIGNMENT", "EVENT", "ROOM_BOOKING", "SCHEDULE", "SYSTEM"]);
const statusSchema = z.enum(["PENDING", "SENT", "READ", "FAILED"]);

export const notificationParamsSchema = z.object({ id: z.string().min(1) });
export const notificationListQuerySchema = z.object({
  status: statusSchema.optional(),
  sourceType: sourceTypeSchema.optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
});
const notificationFieldsSchema = z.object({
  userId: z.string().trim().min(1),
  sourceType: sourceTypeSchema,
  sourceId: z.string().trim().min(1).nullable().default(null),
  message: z.string().trim().min(1).max(500),
  sendAt: z.string().datetime(),
  status: statusSchema.default("PENDING")
});
export const notificationBodySchema = notificationFieldsSchema;
export const notificationUpdateBodySchema = notificationFieldsSchema.omit({ userId: true }).partial();

export type NotificationInput = z.infer<typeof notificationBodySchema>;
export type NotificationUpdateInput = z.infer<typeof notificationUpdateBodySchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
