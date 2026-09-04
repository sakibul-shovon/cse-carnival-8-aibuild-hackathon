import { createClient } from '../lib/supabase/server';
import { Event } from '../types/database';
import { CreateEventSchema, UpdateEventSchema, EventInput, UpdateEventInput } from '../lib/validations/events';
import { ServiceResponse, successResponse, errorResponse } from './utils';

export async function getEvents(): Promise<ServiceResponse<Event[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getEventById(id: string): Promise<ServiceResponse<Event>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function createEvent(input: EventInput): Promise<ServiceResponse<Event>> {
  try {
    const parsed = CreateEventSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('events').insert(parsed).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function updateEvent(id: string, input: UpdateEventInput): Promise<ServiceResponse<Event>> {
  try {
    const parsed = UpdateEventSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('events').update(parsed).eq('id', id).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function deleteEvent(id: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
