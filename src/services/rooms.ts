import { createClient } from '../lib/supabase/server';
import { Room } from '../types/database';
import { CreateRoomSchema, UpdateRoomSchema, RoomInput, UpdateRoomInput } from '../lib/validations/rooms';
import { ServiceResponse, successResponse, errorResponse } from './utils';

export async function getRooms(): Promise<ServiceResponse<Room[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('rooms').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getRoomById(id: string): Promise<ServiceResponse<Room>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function createRoom(input: RoomInput): Promise<ServiceResponse<Room>> {
  try {
    const parsed = CreateRoomSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('rooms').insert(parsed).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function updateRoom(id: string, input: UpdateRoomInput): Promise<ServiceResponse<Room>> {
  try {
    const parsed = UpdateRoomSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('rooms').update(parsed).eq('id', id).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function deleteRoom(id: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (error) throw error;
    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
