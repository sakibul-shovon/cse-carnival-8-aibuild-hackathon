import { z } from 'zod';

export const EventStatusEnum = z.enum(['upcoming', 'ongoing', 'completed', 'cancelled', 'full']);

export const EventSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  venue: z.string().min(1, 'Venue is required'),
  organizer: z.string().min(1, 'Organizer is required'),
  capacity: z.number().int().positive('Capacity must be positive'),
  registered: z.number().int().nonnegative('Registered must be non-negative'),
  status: EventStatusEnum,
});

export const CreateEventSchema = EventSchema;
export const UpdateEventSchema = EventSchema.partial();

export type EventInput = z.infer<typeof EventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
