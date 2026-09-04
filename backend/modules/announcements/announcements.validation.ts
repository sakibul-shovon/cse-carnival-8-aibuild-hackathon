import { z } from "zod";

export const announcementParamsSchema = z.object({ id: z.string().min(1) });
export const announcementListQuerySchema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  activeOnly: z.enum(["true", "false"]).transform((value) => value === "true").optional()
});
const announcementFieldsSchema = z.object({
  title: z.string().trim().min(3).max(190),
  body: z.string().trim().min(3).max(10000),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  postedBy: z.string().trim().min(2).max(120),
  publishedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().nullable().default(null)
});
export const announcementBodySchema = announcementFieldsSchema;
export const announcementUpdateBodySchema = announcementFieldsSchema.partial();

export type AnnouncementInput = z.infer<typeof announcementBodySchema>;
export type AnnouncementUpdateInput = z.infer<typeof announcementUpdateBodySchema>;
export type AnnouncementListQuery = z.infer<typeof announcementListQuerySchema>;
