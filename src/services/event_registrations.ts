import { createClient } from '../lib/supabase/server';
import { Event, EventRegistration } from '../types/database';
import { RegisterForEventSchema, CancelRegistrationSchema, RegisterForEventInput, CancelRegistrationInput } from '../lib/validations/event_registrations';
import { ServiceResponse, successResponse, errorResponse } from './utils';

// ─── Get Registrations ───────────────────────────────────────────────────────

export async function getRegistrationsByEvent(
  eventId: string
): Promise<ServiceResponse<EventRegistration[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId);
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getRegistrationStatus(
  eventId: string,
  studentId: string
): Promise<ServiceResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw error;
    return successResponse(data !== null);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// ─── Register for Event ──────────────────────────────────────────────────────

export async function registerForEvent(
  input: RegisterForEventInput
): Promise<ServiceResponse<EventRegistration>> {
  try {
    const parsed = RegisterForEventSchema.parse(input);
    const { event_id, student_id, name } = parsed;

    const supabase = await createClient();

    // 1. Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, status, capacity, registered')
      .eq('id', event_id)
      .single();

    if (eventError || !event) return errorResponse('Event not found');

    // 2. Reject cancelled events
    if (event.status === 'cancelled') {
      return errorResponse('Event cancelled: registration is not allowed');
    }

    // 3. Reject completed events
    if (event.status === 'completed') {
      return errorResponse('Event completed: registration is no longer allowed');
    }

    // 4. Check capacity — registered >= capacity means full
    if (event.registered >= event.capacity) {
      return errorResponse('Event full: no registration slots available');
    }

    // 5. Prevent duplicate registration using student_id
    const { data: existing, error: dupError } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (dupError) throw dupError;
    if (existing) return errorResponse('Already registered: this student is already registered for this event');

    // 6. Create the registration
    const { data: registration, error: insertError } = await supabase
      .from('event_registrations')
      .insert({ event_id, student_id, name })
      .select()
      .single();

    if (insertError) {
      // Handle DB-level unique constraint violation
      if (insertError.code === '23505') {
        return errorResponse('Already registered: this student is already registered for this event');
      }
      throw insertError;
    }

    // 7. Increment registered count on the event atomically
    const newRegistered = event.registered + 1;
    const newStatus = newRegistered >= event.capacity ? 'full' : event.status;

    const { error: updateError } = await supabase
      .from('events')
      .update({ registered: newRegistered, status: newStatus })
      .eq('id', event_id);

    if (updateError) throw updateError;

    return successResponse(registration);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// ─── Cancel Registration ─────────────────────────────────────────────────────

export async function cancelRegistration(
  input: CancelRegistrationInput
): Promise<ServiceResponse<null>> {
  try {
    const parsed = CancelRegistrationSchema.parse(input);
    const { event_id, student_id } = parsed;

    const supabase = await createClient();

    // 1. Verify the registration exists
    const { data: registration, error: fetchError } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!registration) return errorResponse('Registration not found: no matching registration exists');

    // 2. Delete the registration
    const { error: deleteError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('event_id', event_id)
      .eq('student_id', student_id);

    if (deleteError) throw deleteError;

    // 3. Decrement the registered count and restore status if needed
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('registered, status, capacity')
      .eq('id', event_id)
      .single();

    if (!eventError && event) {
      const newRegistered = Math.max(0, event.registered - 1);
      // If event was marked 'full', revert to 'upcoming' now that a slot opened
      const newStatus = event.status === 'full' ? 'upcoming' : event.status;

      await supabase
        .from('events')
        .update({ registered: newRegistered, status: newStatus })
        .eq('id', event_id);
    }

    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
