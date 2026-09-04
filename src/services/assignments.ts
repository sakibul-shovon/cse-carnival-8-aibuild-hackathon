import { createClient } from '../lib/supabase/server';
import { Assignment } from '../types/database';
import { CreateAssignmentSchema, UpdateAssignmentSchema, AssignmentInput, UpdateAssignmentInput } from '../lib/validations/assignments';
import { ServiceResponse, successResponse, errorResponse } from './utils';

export async function getAssignments(): Promise<ServiceResponse<Assignment[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('assignments').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getAssignmentById(id: string): Promise<ServiceResponse<Assignment>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('assignments').select('*').eq('id', id).single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function createAssignment(input: AssignmentInput): Promise<ServiceResponse<Assignment>> {
  try {
    const parsed = CreateAssignmentSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('assignments').insert(parsed).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function updateAssignment(id: string, input: UpdateAssignmentInput): Promise<ServiceResponse<Assignment>> {
  try {
    const parsed = UpdateAssignmentSchema.parse(input);
    const supabase = await createClient();
    const { data, error } = await supabase.from('assignments').update(parsed).eq('id', id).select().single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function deleteAssignment(id: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
