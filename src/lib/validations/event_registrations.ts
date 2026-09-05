import { z } from 'zod';

export const RegisterForEventSchema = z.object({
  event_id: z.string().min(1, 'Event ID is required'),
  student_id: z.string().min(1, 'Student ID is required'),
  name: z.string().min(1, 'Student name is required'),
});

export const CancelRegistrationSchema = z.object({
  event_id: z.string().min(1, 'Event ID is required'),
  student_id: z.string().min(1, 'Student ID is required'),
});

export type RegisterForEventInput = z.infer<typeof RegisterForEventSchema>;
export type CancelRegistrationInput = z.infer<typeof CancelRegistrationSchema>;
