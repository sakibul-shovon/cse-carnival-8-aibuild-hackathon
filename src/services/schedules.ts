import { createClient } from '../lib/supabase/server';
import { Schedule } from '../types/database';
import { CreateScheduleSchema, UpdateScheduleSchema, ScheduleInput, UpdateScheduleInput } from '../lib/validations/schedules';
import { ServiceResponse, successResponse, errorResponse } from './utils';

export async function getSchedules(): Promise<ServiceResponse<Schedule[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('schedules').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getScheduleById(id: string): Promise<ServiceResponse<Schedule>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('schedules').select('*').eq('id', id).single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function createSchedule(input: ScheduleInput): Promise<ServiceResponse<Schedule>> {
  try {
    const parsed = CreateScheduleSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('schedules').insert(parsed).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<ServiceResponse<Schedule>> {
  try {
    const parsed = UpdateScheduleSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('schedules').update(parsed).eq('id', id).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function deleteSchedule(id: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
