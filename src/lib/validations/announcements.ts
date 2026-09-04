import { z } from 'zod';

export const AnnouncementPriorityEnum = z.enum(['high', 'medium', 'low']);

export const AnnouncementSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  priority: AnnouncementPriorityEnum,
  posted_by: z.string().min(1, 'Posted by is required'),
  expires: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expires date must be in YYYY-MM-DD format'),
});

export const CreateAnnouncementSchema = AnnouncementSchema;
export const UpdateAnnouncementSchema = AnnouncementSchema.partial();

export type AnnouncementInput = z.infer<typeof AnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof UpdateAnnouncementSchema>;
