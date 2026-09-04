import { createClient } from '../lib/supabase/server';
import { Announcement } from '../types/database';
import { CreateAnnouncementSchema, UpdateAnnouncementSchema, AnnouncementInput, UpdateAnnouncementInput } from '../lib/validations/announcements';
import { ServiceResponse, successResponse, errorResponse } from './utils';

export async function getAnnouncements(): Promise<ServiceResponse<Announcement[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('announcements').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getAnnouncementById(id: string): Promise<ServiceResponse<Announcement>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('announcements').select('*').eq('id', id).single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function createAnnouncement(input: AnnouncementInput): Promise<ServiceResponse<Announcement>> {
  try {
    const parsed = CreateAnnouncementSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('announcements').insert(parsed).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function updateAnnouncement(id: string, input: UpdateAnnouncementInput): Promise<ServiceResponse<Announcement>> {
  try {
    const parsed = UpdateAnnouncementSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('announcements').update(parsed).eq('id', id).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function deleteAnnouncement(id: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
