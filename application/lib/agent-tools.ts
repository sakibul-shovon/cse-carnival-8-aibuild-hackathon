import { readCampusData, saveRecord } from './campus-db';

type ToolArgs = Record<string, unknown>;
type Room = Record<string, unknown> & { id: string; room_number: string; capacity: number; equipment: string[]; status: string; bookings: Booking[] };
type Booking = { booking_id: string; booked_by: string; date: string; start_time: string; end_time: string; purpose: string };
type Event = Record<string, unknown> & { id: string; name: string; capacity: number; registered: number; status: string; registrations: Registration[] };
type Registration = { student_id: string; name: string };

const overlaps = (startA: string, endA: string, startB: string, endB: string) => startA < endB && endA > startB;

function weekday(date: string) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function findEvent(events: Event[], value: unknown) {
  const needle = String(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const exact = events.find((item) => item.name.toLowerCase().includes(needle) || needle.includes(item.name.toLowerCase()));
  if (exact) return exact;
  const terms = needle.split(' ').filter((term) => term.length > 3 && !['event', 'register', 'registration'].includes(term));
  return events.map((event) => ({ event, score: terms.filter((term) => event.name.toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score)[0]?.score >= 2
    ? events.map((event) => ({ event, score: terms.filter((term) => event.name.toLowerCase().includes(term)).length })).sort((a, b) => b.score - a.score)[0].event
    : undefined;
}

export async function executeCampusTool(name: string, args: ToolArgs): Promise<Record<string, unknown>> {
  const data = await readCampusData();
  if (name === 'get_campus_data') {
    const system = String(args.system || '');
    if (!(system in data)) return { error: 'Unknown campus system.' };
    return { system, records: data[system as keyof typeof data] };
  }

  if (name === 'find_available_rooms') {
    const date = String(args.date); const start = String(args.start_time); const end = String(args.end_time);
    const minCapacity = Number(args.min_capacity || 1); const equipment = (args.equipment as string[] | undefined)?.map((item) => item.toLowerCase()) || [];
    const day = weekday(date);
    const matches = (data.rooms as Room[]).filter((room) => {
      if (room.status !== 'available' || room.capacity < minCapacity) return false;
      if (args.type && room.type !== args.type) return false;
      if (!equipment.every((item) => room.equipment.some((existing) => existing.toLowerCase() === item))) return false;
      const bookingConflict = room.bookings.some((booking) => booking.date === date && overlaps(start, end, booking.start_time, booking.end_time));
      const classConflict = data.schedules.some((schedule) => schedule.room === room.room_number && schedule.day === day && overlaps(start, end, String(schedule.start_time), String(schedule.end_time)));
      return !bookingConflict && !classConflict;
    }).sort((a, b) => a.capacity - b.capacity || a.room_number.localeCompare(b.room_number));
    return { date, start_time: start, end_time: end, rooms: matches.map((room) => ({ room_number: room.room_number, type: room.type, capacity: room.capacity, equipment: room.equipment })) };
  }

  if (name === 'book_room') {
    const room = (data.rooms as Room[]).find((item) => item.room_number.toLowerCase() === String(args.room_number).toLowerCase());
    if (!room) return { ok: false, error: `Room ${args.room_number} does not exist.` };
    const availability = (await executeCampusTool('find_available_rooms', { date: args.date, start_time: args.start_time, end_time: args.end_time, min_capacity: 1 })) as { rooms?: { room_number: string }[] };
    const availableNumbers = availability.rooms?.map((item) => item.room_number) || [];
    if (!availableNumbers.includes(room.room_number)) return { ok: false, error: `${room.room_number} is unavailable or already occupied during that time.` };
    const booking: Booking = { booking_id: `bk-${crypto.randomUUID().slice(0, 8)}`, booked_by: String(args.booked_by || 'Sakibul Hassan'), date: String(args.date), start_time: String(args.start_time), end_time: String(args.end_time), purpose: String(args.purpose || 'Student study session') };
    room.bookings = [...room.bookings, booking]; await saveRecord('rooms', room);
    return { ok: true, room_number: room.room_number, booking };
  }

  if (name === 'cancel_room_booking') {
    const room = (data.rooms as Room[]).find((item) => item.room_number.toLowerCase() === String(args.room_number).toLowerCase());
    if (!room) return { ok: false, error: 'Room not found.' };
    const bookingId = args.booking_id ? String(args.booking_id) : room.bookings.filter((item) => item.booked_by === String(args.booked_by || 'Sakibul Hassan')).at(-1)?.booking_id;
    const booking = room.bookings.find((item) => item.booking_id === bookingId);
    if (!booking) return { ok: false, error: 'No matching booking found.' };
    if (booking.booked_by !== 'Sakibul Hassan' && booking.booked_by !== String(args.booked_by || 'Sakibul Hassan')) return { ok: false, error: 'You can only cancel your own bookings.' };
    room.bookings = room.bookings.filter((item) => item.booking_id !== bookingId); await saveRecord('rooms', room);
    return { ok: true, room_number: room.room_number, cancelled: booking };
  }

  if (name === 'register_event') {
    const event = findEvent(data.events as Event[], args.event_name);
    if (!event) return { ok: false, error: 'I could not find that event.' };
    const studentId = String(args.student_id || '20-40532'); const studentName = String(args.student_name || 'Sakibul Hassan');
    if (event.registrations.some((item) => item.student_id === studentId)) return { ok: true, already_registered: true, event: event.name };
    if (event.status === 'cancelled' || event.status === 'completed') return { ok: false, error: `Registration is closed because this event is ${event.status}.` };
    if (event.registered >= event.capacity || event.status === 'full') return { ok: false, error: 'That event is full.' };
    event.registrations = [...event.registrations, { student_id: studentId, name: studentName }]; event.registered += 1; if (event.registered >= event.capacity) event.status = 'full';
    await saveRecord('events', event); return { ok: true, event: event.name, registered: event.registered, capacity: event.capacity };
  }

  if (name === 'cancel_event_registration') {
    const event = findEvent(data.events as Event[], args.event_name);
    if (!event) return { ok: false, error: 'I could not find that event.' };
    const studentId = String(args.student_id || '20-40532');
    if (!event.registrations.some((item) => item.student_id === studentId)) return { ok: false, error: 'You are not registered for that event.' };
    event.registrations = event.registrations.filter((item) => item.student_id !== studentId); event.registered = Math.max(0, event.registered - 1); if (event.status === 'full') event.status = 'upcoming';
    await saveRecord('events', event); return { ok: true, event: event.name };
  }
  return { error: `Unknown tool: ${name}` };
}

export const campusToolDefinitions = [
  { type: 'function', name: 'get_campus_data', description: 'Read the latest records from exactly one campus system.', strict: true, parameters: { type: 'object', properties: { system: { type: 'string', enum: ['schedules', 'rooms', 'events', 'announcements', 'assignments'] } }, required: ['system'], additionalProperties: false } },
  { type: 'function', name: 'find_available_rooms', description: 'Find rooms that are actually free, including schedule and booking conflict checks.', strict: true, parameters: { type: 'object', properties: { date: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, min_capacity: { type: 'number' }, equipment: { type: 'array', items: { type: 'string' } }, type: { type: ['string', 'null'], enum: ['classroom', 'lab', 'seminar', null] } }, required: ['date', 'start_time', 'end_time', 'min_capacity', 'equipment', 'type'], additionalProperties: false } },
  { type: 'function', name: 'book_room', description: 'Book one specific room after availability is checked.', strict: true, parameters: { type: 'object', properties: { room_number: { type: 'string' }, date: { type: 'string' }, start_time: { type: 'string' }, end_time: { type: 'string' }, booked_by: { type: 'string' }, purpose: { type: 'string' } }, required: ['room_number', 'date', 'start_time', 'end_time', 'booked_by', 'purpose'], additionalProperties: false } },
  { type: 'function', name: 'cancel_room_booking', description: 'Cancel the signed-in student’s own room booking.', strict: true, parameters: { type: 'object', properties: { room_number: { type: 'string' }, booking_id: { type: ['string', 'null'] }, booked_by: { type: 'string' } }, required: ['room_number', 'booking_id', 'booked_by'], additionalProperties: false } },
  { type: 'function', name: 'register_event', description: 'Register the signed-in student for an event.', strict: true, parameters: { type: 'object', properties: { event_name: { type: 'string' }, student_id: { type: 'string' }, student_name: { type: 'string' } }, required: ['event_name', 'student_id', 'student_name'], additionalProperties: false } },
  { type: 'function', name: 'cancel_event_registration', description: 'Cancel the signed-in student’s event registration.', strict: true, parameters: { type: 'object', properties: { event_name: { type: 'string' }, student_id: { type: 'string' } }, required: ['event_name', 'student_id'], additionalProperties: false } },
] as const;
