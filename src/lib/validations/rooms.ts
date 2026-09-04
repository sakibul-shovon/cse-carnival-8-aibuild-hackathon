import { z } from 'zod';

export const RoomTypeEnum = z.enum(['classroom', 'lab', 'seminar']);
export const RoomStatusEnum = z.enum(['available', 'unavailable']);

export const RoomSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  room_number: z.string().min(1, 'Room number is required'),
  type: RoomTypeEnum,
  capacity: z.number().int().positive('Capacity must be positive'),
  equipment: z.array(z.string()),
  floor: z.number().int(),
  status: RoomStatusEnum,
});

export const CreateRoomSchema = RoomSchema;
export const UpdateRoomSchema = RoomSchema.partial();

export type RoomInput = z.infer<typeof RoomSchema>;
export type UpdateRoomInput = z.infer<typeof UpdateRoomSchema>;
