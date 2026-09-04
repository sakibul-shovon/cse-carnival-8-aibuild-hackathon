import { z } from 'zod';

export const CreateBookingSchema = z.object({
  booking_id: z.string().min(1, 'Booking ID is required'),
  room_id: z.string().min(1, 'Room ID is required'),
  booked_by: z.string().min(1, 'Booked by is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'),
  purpose: z.string().min(1, 'Purpose is required'),
});

export const CheckAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'),
  min_capacity: z.number().int().positive().optional(),
  required_equipment: z.array(z.string()).optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilitySchema>;
