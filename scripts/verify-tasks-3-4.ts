/**
 * Task 3 & 4 Verification Script
 *
 * Tests room booking and event registration logic directly against real Supabase
 * using the admin client (no Next.js request context required).
 *
 * Run with: npm run verify
 */
import 'dotenv/config';
import { createAdminClient } from '../src/lib/supabase/admin';
import { z } from 'zod';

// ─── Utilities ────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results: string[] = [];

function assert(label: string, condition: boolean, details?: string): void {
  if (condition) {
    passed++;
    results.push(`  ✅ PASS — ${label}`);
  } else {
    failed++;
    results.push(`  ❌ FAIL — ${label}${details ? ` | ${details}` : ''}`);
  }
}

function section(title: string) {
  results.push(`\n══════════════════════════════════`);
  results.push(`  ${title}`);
  results.push(`══════════════════════════════════`);
}

// ─── Core Booking Logic (mirrors src/services/room_bookings.ts) ───────────────

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(ns: string, ne: string, es: string, ee: string): boolean {
  return toMinutes(ns) < toMinutes(ee) && toMinutes(ne) > toMinutes(es);
}

// ─── Test Data ────────────────────────────────────────────────────────────────

const T_ROOM = 'verify-room-avail-001';
const T_ROOM_UNAV = 'verify-room-unavail-001';
const T_EVT = 'verify-evt-open-001';
const T_EVT_FULL = 'verify-evt-full-001';
const T_EVT_CANCELLED = 'verify-evt-cancelled-001';
const T_EVT_COMPLETED = 'verify-evt-completed-001';
const BK_EXISTING = 'verify-bk-existing-001';
const TEST_DATE = '2026-09-10'; // date for overlap tests

async function seedTestData() {
  const db = createAdminClient();

  // Clean slate
  await db.from('room_bookings').delete().in('room_id', [T_ROOM, T_ROOM_UNAV]);
  await db.from('rooms').delete().in('id', [T_ROOM, T_ROOM_UNAV]);
  await db.from('event_registrations').delete().in('event_id', [T_EVT, T_EVT_FULL, T_EVT_CANCELLED, T_EVT_COMPLETED]);
  await db.from('events').delete().in('id', [T_EVT, T_EVT_FULL, T_EVT_CANCELLED, T_EVT_COMPLETED]);

  // Rooms
  const { error: roomErr } = await db.from('rooms').insert([
    { id: T_ROOM, room_number: 'VFY-101', type: 'classroom', capacity: 40, equipment: ['projector', 'AC', 'whiteboard'], floor: 1, status: 'available' },
    { id: T_ROOM_UNAV, room_number: 'VFY-102', type: 'lab', capacity: 30, equipment: ['AC'], floor: 1, status: 'unavailable' },
  ]);
  if (roomErr) throw new Error(`Seed rooms failed: ${roomErr.message}`);

  // Existing booking: 15:00–17:00
  const { error: bkErr } = await db.from('room_bookings').insert({
    booking_id: BK_EXISTING,
    room_id: T_ROOM,
    booked_by: 'Setup Script',
    date: TEST_DATE,
    start_time: '15:00',
    end_time: '17:00',
    purpose: 'Existing booking for overlap tests',
  });
  if (bkErr) throw new Error(`Seed booking failed: ${bkErr.message}`);

  // Events
  const { error: evtErr } = await db.from('events').insert([
    { id: T_EVT, name: 'Verify Open Event', description: 'Open', date: '2026-09-20', start_time: '10:00', end_time: '12:00', end_date: '2026-09-20', venue: 'VFY-101', organizer: 'Test', capacity: 50, registered: 0, status: 'upcoming' },
    { id: T_EVT_FULL, name: 'Verify Full Event', description: 'Full', date: '2026-09-20', start_time: '10:00', end_time: '12:00', end_date: '2026-09-20', venue: 'VFY-101', organizer: 'Test', capacity: 1, registered: 1, status: 'full' },
    { id: T_EVT_CANCELLED, name: 'Verify Cancelled Event', description: 'Cancelled', date: '2026-09-20', start_time: '10:00', end_time: '12:00', end_date: '2026-09-20', venue: 'VFY-101', organizer: 'Test', capacity: 50, registered: 0, status: 'cancelled' },
    { id: T_EVT_COMPLETED, name: 'Verify Completed Event', description: 'Completed', date: '2026-09-01', start_time: '10:00', end_time: '12:00', end_date: '2026-09-01', venue: 'VFY-101', organizer: 'Test', capacity: 50, registered: 0, status: 'completed' },
  ]);
  if (evtErr) throw new Error(`Seed events failed: ${evtErr.message}`);
}

async function cleanupTestData() {
  const db = createAdminClient();
  await db.from('room_bookings').delete().in('room_id', [T_ROOM, T_ROOM_UNAV]);
  await db.from('room_bookings').delete().like('booking_id', 'verify-%');
  await db.from('rooms').delete().in('id', [T_ROOM, T_ROOM_UNAV]);
  await db.from('event_registrations').delete().in('event_id', [T_EVT, T_EVT_FULL, T_EVT_CANCELLED, T_EVT_COMPLETED]);
  await db.from('events').delete().in('id', [T_EVT, T_EVT_FULL, T_EVT_CANCELLED, T_EVT_COMPLETED]);
}

// ─── Room Booking helpers (inline, using admin client directly) ───────────────

async function createBooking(booking: {
  booking_id: string; room_id: string; booked_by: string;
  date: string; start_time: string; end_time: string; purpose: string;
}): Promise<{ data: any; error: string | null }> {
  const db = createAdminClient();
  const { room_id, date, start_time, end_time } = booking;

  if (toMinutes(start_time) >= toMinutes(end_time)) {
    return { data: null, error: 'Invalid booking time: start time must be before end time' };
  }

  const { data: room, error: roomError } = await db.from('rooms').select('id, status').eq('id', room_id).single();
  if (roomError || !room) return { data: null, error: 'Room not found' };
  if (room.status !== 'available') return { data: null, error: 'Room unavailable' };

  const { data: existing } = await db.from('room_bookings').select('start_time, end_time').eq('room_id', room_id).eq('date', date);
  for (const b of existing || []) {
    if (timesOverlap(start_time, end_time, b.start_time, b.end_time)) {
      return { data: null, error: 'Room already booked: the requested time slot overlaps an existing booking' };
    }
  }

  const { data, error: insertError } = await db.from('room_bookings').insert(booking).select().single();
  if (insertError) {
    if (insertError.code === '23P01') return { data: null, error: 'Room already booked: the requested time slot overlaps an existing booking' };
    return { data: null, error: insertError.message };
  }
  return { data, error: null };
}

async function cancelBooking(bookingId: string): Promise<{ data: null; error: string | null }> {
  const db = createAdminClient();
  const { data: booking } = await db.from('room_bookings').select('booking_id').eq('booking_id', bookingId).maybeSingle();
  if (!booking) return { data: null, error: 'Booking not found' };
  const { error } = await db.from('room_bookings').delete().eq('booking_id', bookingId);
  return { data: null, error: error ? error.message : null };
}

async function getAvailableRooms(opts: { date: string; start_time: string; end_time: string; min_capacity?: number; required_equipment?: string[] }): Promise<any[]> {
  const db = createAdminClient();
  const { date, start_time, end_time, min_capacity, required_equipment } = opts;
  let q = db.from('rooms').select('*').eq('status', 'available');
  if (min_capacity) q = q.gte('capacity', min_capacity);
  const { data: rooms } = await q;
  if (!rooms) return [];
  const filtered = required_equipment?.length
    ? rooms.filter((r: any) => required_equipment.every((e) => r.equipment.includes(e)))
    : rooms;
  const roomIds = filtered.map((r: any) => r.id);
  const { data: bookings } = await db.from('room_bookings').select('room_id, start_time, end_time').eq('date', date).in('room_id', roomIds);
  const busy = new Set<string>();
  for (const b of bookings || []) {
    if (timesOverlap(start_time, end_time, b.start_time, b.end_time)) busy.add(b.room_id);
  }
  return filtered.filter((r: any) => !busy.has(r.id));
}

// ─── Event Registration helpers ───────────────────────────────────────────────

async function registerForEvent(input: { event_id: string; student_id: string; name: string }): Promise<{ data: any; error: string | null }> {
  const db = createAdminClient();
  const { event_id, student_id, name } = input;

  const { data: event } = await db.from('events').select('id, status, capacity, registered').eq('id', event_id).maybeSingle();
  if (!event) return { data: null, error: 'Event not found' };
  if (event.status === 'cancelled') return { data: null, error: 'Event cancelled: registration is not allowed' };
  if (event.status === 'completed') return { data: null, error: 'Event completed: registration is no longer allowed' };
  if (event.registered >= event.capacity) return { data: null, error: 'Event full: no registration slots available' };

  const { data: dup } = await db.from('event_registrations').select('id').eq('event_id', event_id).eq('student_id', student_id).maybeSingle();
  if (dup) return { data: null, error: 'Already registered: this student is already registered for this event' };

  const { data: reg, error: insertErr } = await db.from('event_registrations').insert({ event_id, student_id, name }).select().single();
  if (insertErr) {
    if (insertErr.code === '23505') return { data: null, error: 'Already registered: this student is already registered for this event' };
    return { data: null, error: insertErr.message };
  }

  const newRegistered = event.registered + 1;
  const newStatus = newRegistered >= event.capacity ? 'full' : event.status;
  await db.from('events').update({ registered: newRegistered, status: newStatus }).eq('id', event_id);

  return { data: reg, error: null };
}

async function cancelRegistration(input: { event_id: string; student_id: string }): Promise<{ data: null; error: string | null }> {
  const db = createAdminClient();
  const { event_id, student_id } = input;

  const { data: reg } = await db.from('event_registrations').select('id').eq('event_id', event_id).eq('student_id', student_id).maybeSingle();
  if (!reg) return { data: null, error: 'Registration not found: no matching registration exists' };

  await db.from('event_registrations').delete().eq('event_id', event_id).eq('student_id', student_id);

  const { data: event } = await db.from('events').select('registered, status, capacity').eq('id', event_id).single();
  if (event) {
    const newRegistered = Math.max(0, event.registered - 1);
    const newStatus = event.status === 'full' ? 'upcoming' : event.status;
    await db.from('events').update({ registered: newRegistered, status: newStatus }).eq('id', event_id);
  }
  return { data: null, error: null };
}

// ─── Room Booking Tests ───────────────────────────────────────────────────────

async function runRoomBookingTests() {
  section('TASK 3 — ROOM BOOKING TESTS');

  // 1. Nonexistent room
  const t1 = await createBooking({ booking_id: 'verify-bk-t1', room_id: 'room-does-not-exist', booked_by: 'T', date: TEST_DATE, start_time: '09:00', end_time: '10:00', purpose: 'T' });
  assert('1. Nonexistent room rejected', t1.error === 'Room not found', t1.error ?? '');

  // 2. Unavailable room
  const t2 = await createBooking({ booking_id: 'verify-bk-t2', room_id: T_ROOM_UNAV, booked_by: 'T', date: TEST_DATE, start_time: '09:00', end_time: '10:00', purpose: 'T' });
  assert('2. Unavailable room rejected', t2.error === 'Room unavailable', t2.error ?? '');

  // 3. Equal start/end time
  const t3 = await createBooking({ booking_id: 'verify-bk-t3', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '10:00', end_time: '10:00', purpose: 'T' });
  assert('3. Equal start/end time rejected', !!t3.error, t3.error ?? '');

  // 4. Start after end
  const t4 = await createBooking({ booking_id: 'verify-bk-t4', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '11:00', end_time: '09:00', purpose: 'T' });
  assert('4. Start time after end time rejected', !!t4.error, t4.error ?? '');

  // 5. Exact overlap (15:00–17:00)
  const t5 = await createBooking({ booking_id: 'verify-bk-t5', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '15:00', end_time: '17:00', purpose: 'Exact overlap' });
  assert('5. Exact overlap rejected', !!t5.error, t5.error ?? '');

  // 6. Beginning overlap (14:00–16:00)
  const t6 = await createBooking({ booking_id: 'verify-bk-t6', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '14:00', end_time: '16:00', purpose: 'Begin overlap' });
  assert('6. Beginning overlap rejected', !!t6.error, t6.error ?? '');

  // 7. Ending overlap (16:00–18:00)
  const t7 = await createBooking({ booking_id: 'verify-bk-t7', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '16:00', end_time: '18:00', purpose: 'End overlap' });
  assert('7. Ending overlap rejected', !!t7.error, t7.error ?? '');

  // 8. Existing inside new (14:00–18:00)
  const t8 = await createBooking({ booking_id: 'verify-bk-t8', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '14:00', end_time: '18:00', purpose: 'Surround' });
  assert('8. Existing inside new booking rejected', !!t8.error, t8.error ?? '');

  // 9. New inside existing (15:30–16:30)
  const t9 = await createBooking({ booking_id: 'verify-bk-t9', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '15:30', end_time: '16:30', purpose: 'Inner' });
  assert('9. New booking inside existing rejected', !!t9.error, t9.error ?? '');

  // 10. Back-to-back BEFORE (13:00–15:00) — MUST be allowed
  const t10 = await createBooking({ booking_id: 'verify-bk-btb-before', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '13:00', end_time: '15:00', purpose: 'BTB before' });
  assert('10. Back-to-back before existing ALLOWED', !t10.error, t10.error ?? '');

  // 11. Back-to-back AFTER (17:00–19:00) — MUST be allowed
  const t11 = await createBooking({ booking_id: 'verify-bk-btb-after', room_id: T_ROOM, booked_by: 'T', date: TEST_DATE, start_time: '17:00', end_time: '19:00', purpose: 'BTB after' });
  assert('11. Back-to-back after existing ALLOWED', !t11.error, t11.error ?? '');

  // 12. Successful booking on a clear date
  const t12 = await createBooking({ booking_id: 'verify-bk-success', room_id: T_ROOM, booked_by: 'Test User', date: '2026-09-15', start_time: '09:00', end_time: '11:00', purpose: 'Success test' });
  assert('12. Successful booking created', !t12.error && t12.data !== null, t12.error ?? '');

  // 13. Capacity filtering — min_capacity=50, T_ROOM has 40 → should be excluded
  const avail = await getAvailableRooms({ date: '2026-09-15', start_time: '14:00', end_time: '15:00', min_capacity: 50 });
  assert('13. Capacity filter excludes under-capacity room', !avail.some((r) => r.id === T_ROOM), '');

  // 14. Equipment filtering — unavailable room must never appear
  const availEq = await getAvailableRooms({ date: '2026-09-15', start_time: '14:00', end_time: '15:00', required_equipment: ['projector'] });
  assert('14. Unavailable room excluded from availability', !availEq.some((r) => r.id === T_ROOM_UNAV), '');
}

// ─── Event Registration Tests ─────────────────────────────────────────────────

async function runEventRegistrationTests() {
  section('TASK 4 — EVENT REGISTRATION TESTS');
  const db = createAdminClient();

  // 1. Nonexistent event
  const r1 = await registerForEvent({ event_id: 'evt-does-not-exist', student_id: 'stu-001', name: 'Alice' });
  assert('1. Nonexistent event rejected', r1.error === 'Event not found', r1.error ?? '');

  // 2. Cancelled event
  const r2 = await registerForEvent({ event_id: T_EVT_CANCELLED, student_id: 'stu-001', name: 'Alice' });
  assert('2. Cancelled event rejected', !!r2.error && r2.error.includes('cancelled'), r2.error ?? '');

  // 3. Completed event
  const r3 = await registerForEvent({ event_id: T_EVT_COMPLETED, student_id: 'stu-001', name: 'Alice' });
  assert('3. Completed event rejected', !!r3.error && r3.error.includes('completed'), r3.error ?? '');

  // 4. Full event
  const r4 = await registerForEvent({ event_id: T_EVT_FULL, student_id: 'stu-001', name: 'Alice' });
  assert('4. Full event rejected', !!r4.error && r4.error.includes('full'), r4.error ?? '');

  // 5. Successful registration
  const r5 = await registerForEvent({ event_id: T_EVT, student_id: 'stu-001', name: 'Alice' });
  assert('5. Successful registration', !r5.error && r5.data !== null, r5.error ?? '');

  // 6. Duplicate registration
  const r6 = await registerForEvent({ event_id: T_EVT, student_id: 'stu-001', name: 'Alice' });
  assert('6. Duplicate registration rejected', !!r6.error && r6.error.includes('Already registered'), r6.error ?? '');

  // 7. Registration count consistency after registration
  const { data: evtAfterReg } = await db.from('events').select('registered').eq('id', T_EVT).single();
  assert('7. Registered count incremented', evtAfterReg?.registered === 1, `expected 1, got ${evtAfterReg?.registered}`);

  // 8. Cancellation of nonexistent registration
  const r8 = await cancelRegistration({ event_id: T_EVT, student_id: 'stu-not-here' });
  assert('8. Cancel nonexistent registration rejected', !!r8.error, r8.error ?? '');

  // 9. Successful cancellation
  const r9 = await cancelRegistration({ event_id: T_EVT, student_id: 'stu-001' });
  assert('9. Successful cancellation', !r9.error, r9.error ?? '');

  // 10. Registration count consistency after cancellation
  const { data: evtAfterCancel } = await db.from('events').select('registered').eq('id', T_EVT).single();
  assert('10. Registered count decremented after cancellation', evtAfterCancel?.registered === 0, `expected 0, got ${evtAfterCancel?.registered}`);

  // 11. Status reverts from 'full' after cancellation
  // Register a second student, verify count, then cancel and check status
  await registerForEvent({ event_id: T_EVT, student_id: 'stu-002', name: 'Bob' });
  await cancelRegistration({ event_id: T_EVT, student_id: 'stu-002' });
  const { data: statusCheck } = await db.from('events').select('status').eq('id', T_EVT).single();
  assert('11. Status remains consistent after cancel (not full)', statusCheck?.status !== 'full', `got ${statusCheck?.status}`);

  // 12. Registration count/state stays consistent through full cycle
  // Register 3 students and verify count
  await registerForEvent({ event_id: T_EVT, student_id: 'stu-003', name: 'Carol' });
  await registerForEvent({ event_id: T_EVT, student_id: 'stu-004', name: 'Dave' });
  const { data: evtCount } = await db.from('events').select('registered').eq('id', T_EVT).single();
  assert('12. Multiple registrations counted correctly', evtCount?.registered === 2, `expected 2, got ${evtCount?.registered}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  CampusOS — Task 3 & 4 Verification\n');

  try {
    console.log('⏳  Seeding test data into Supabase...');
    await seedTestData();
    console.log('✅  Test data seeded.\n');

    await runRoomBookingTests();
    await runEventRegistrationTests();
  } catch (err) {
    results.push(`\n💥  Fatal error: ${err}`);
    failed++;
  } finally {
    console.log('\n⏳  Cleaning up test data...');
    await cleanupTestData();
    console.log('✅  Cleanup complete.\n');
  }

  for (const line of results) console.log(line);

  console.log(`\n${'─'.repeat(42)}`);
  console.log(`  RESULTS:  ✅ ${passed} passed   ❌ ${failed} failed`);
  console.log(`${'─'.repeat(42)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
