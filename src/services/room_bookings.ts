import { createClient } from '../lib/supabase/server';
import { Room, RoomBooking } from '../types/database';
import { CreateBookingSchema, CheckAvailabilitySchema, CreateBookingInput, CheckAvailabilityInput } from '../lib/validations/room_bookings';
import { ServiceResponse, successResponse, errorResponse } from './utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Converts "HH:MM" string to minutes since midnight for arithmetic comparison.
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Returns true when [newStart, newEnd) overlaps [existingStart, existingEnd).
 * The overlap rule:   new_start < existing_end  AND  new_end > existing_start
 * Back-to-back (13:00-15:00, 15:00-17:00) returns false — correctly allowed.
 */
function timesOverlap(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
): boolean {
  const ns = toMinutes(newStart);
  const ne = toMinutes(newEnd);
  const es = toMinutes(existingStart);
  const ee = toMinutes(existingEnd);
  return ns < ee && ne > es;
}

// ─── Room Availability ───────────────────────────────────────────────────────

/**
 * Returns all rooms that are available for the given time slot.
 * Optionally filters by minimum capacity and required equipment.
 */
export async function getAvailableRooms(
  input: CheckAvailabilityInput
): Promise<ServiceResponse<Room[]>> {
  try {
    const parsed = CheckAvailabilitySchema.parse(input);
    const { date, start_time, end_time, min_capacity, required_equipment } = parsed;

    // Validate time logic
    if (toMinutes(start_time) >= toMinutes(end_time)) {
      return errorResponse('Start time must be before end time');
    }

    const supabase = await createClient();

    // Fetch all available rooms, applying capacity filter at DB level when possible
    let query = supabase.from('rooms').select('*').eq('status', 'available');
    if (min_capacity !== undefined) {
      query = query.gte('capacity', min_capacity);
    }

    const { data: rooms, error: roomsError } = await query;
    if (roomsError) throw roomsError;
    if (!rooms || rooms.length === 0) return successResponse([]);

    // Equipment filter (array containment)
    let filteredRooms: Room[] = rooms;
    if (required_equipment && required_equipment.length > 0) {
      filteredRooms = rooms.filter((room: Room) =>
        required_equipment.every((eq) => room.equipment.includes(eq))
      );
    }

    if (filteredRooms.length === 0) return successResponse([]);

    // Fetch existing bookings for the given date across all candidate rooms
    const roomIds = filteredRooms.map((r: Room) => r.id);
    const { data: bookings, error: bookingsError } = await supabase
      .from('room_bookings')
      .select('room_id, start_time, end_time')
      .eq('date', date)
      .in('room_id', roomIds);

    if (bookingsError) throw bookingsError;

    // Filter out rooms with overlapping bookings
    const bookedRoomIds = new Set<string>();
    for (const booking of bookings || []) {
      if (timesOverlap(start_time, end_time, booking.start_time, booking.end_time)) {
        bookedRoomIds.add(booking.room_id);
      }
    }

    const availableRooms = filteredRooms.filter((r: Room) => !bookedRoomIds.has(r.id));
    return successResponse(availableRooms);
  } catch (err: any) {
    return errorResponse(err);
  }
}

/**
 * Checks whether a specific room is available for the given time slot.
 */
export async function checkRoomAvailability(
  roomId: string,
  input: CheckAvailabilityInput
): Promise<ServiceResponse<boolean>> {
  try {
    const parsed = CheckAvailabilitySchema.parse(input);
    const { date, start_time, end_time } = parsed;

    if (toMinutes(start_time) >= toMinutes(end_time)) {
      return errorResponse('Start time must be before end time');
    }

    const supabase = await createClient();

    // Verify room exists and is available
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', roomId)
      .single();

    if (roomError || !room) return errorResponse('Room not found');
    if (room.status !== 'available') return errorResponse('Room unavailable');

    // Check existing bookings for overlap
    const { data: bookings, error: bookingsError } = await supabase
      .from('room_bookings')
      .select('start_time, end_time')
      .eq('room_id', roomId)
      .eq('date', date);

    if (bookingsError) throw bookingsError;

    for (const booking of bookings || []) {
      if (timesOverlap(start_time, end_time, booking.start_time, booking.end_time)) {
        return successResponse(false);
      }
    }

    return successResponse(true);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// ─── Get Bookings ────────────────────────────────────────────────────────────

export async function getBookings(): Promise<ServiceResponse<RoomBooking[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('room_bookings').select('*');
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getBookingsByRoom(roomId: string): Promise<ServiceResponse<RoomBooking[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('room_id', roomId)
      .order('date', { ascending: true });
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

export async function getBookingById(bookingId: string): Promise<ServiceResponse<RoomBooking>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('room_bookings')
      .select('*')
      .eq('booking_id', bookingId)
      .single();
    if (error) throw error;
    return successResponse(data);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// ─── Create Booking ──────────────────────────────────────────────────────────

export async function createBooking(
  input: CreateBookingInput
): Promise<ServiceResponse<RoomBooking>> {
  try {
    const parsed = CreateBookingSchema.parse(input);
    const { room_id, date, start_time, end_time } = parsed;

    // 1. Validate time logic
    if (toMinutes(start_time) >= toMinutes(end_time)) {
      return errorResponse('Invalid booking time: start time must be before end time');
    }

    const supabase = await createClient();

    // 2. Verify room exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', room_id)
      .single();

    if (roomError || !room) return errorResponse('Room not found');

    // 3. Verify room is available
    if (room.status !== 'available') return errorResponse('Room unavailable');

    // 4. Check for overlapping bookings (application-level guard before DB constraint)
    const { data: existingBookings, error: fetchError } = await supabase
      .from('room_bookings')
      .select('start_time, end_time')
      .eq('room_id', room_id)
      .eq('date', date);

    if (fetchError) throw fetchError;

    for (const existing of existingBookings || []) {
      if (timesOverlap(start_time, end_time, existing.start_time, existing.end_time)) {
        return errorResponse('Room already booked: the requested time slot overlaps an existing booking');
      }
    }

    // 5. Insert booking — database EXCLUDE constraint provides final safety net
    const { data: booking, error: insertError } = await supabase
      .from('room_bookings')
      .insert(parsed)
      .select()
      .single();

    if (insertError) {
      // Translate DB constraint violation to user-friendly message
      if (insertError.code === '23P01') {
        return errorResponse('Room already booked: the requested time slot overlaps an existing booking');
      }
      throw insertError;
    }

    return successResponse(booking);
  } catch (err: any) {
    return errorResponse(err);
  }
}

// ─── Cancel Booking ──────────────────────────────────────────────────────────

export async function cancelBooking(bookingId: string): Promise<ServiceResponse<null>> {
  try {
    const supabase = await createClient();

    // Verify booking exists before deleting
    const { data: booking, error: fetchError } = await supabase
      .from('room_bookings')
      .select('booking_id')
      .eq('booking_id', bookingId)
      .single();

    if (fetchError || !booking) return errorResponse('Booking not found');

    const { error: deleteError } = await supabase
      .from('room_bookings')
      .delete()
      .eq('booking_id', bookingId);

    if (deleteError) throw deleteError;

    return successResponse(null);
  } catch (err: any) {
    return errorResponse(err);
  }
}
