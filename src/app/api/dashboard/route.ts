import { NextResponse } from "next/server";
import { getSchedules } from "@/services/schedules";
import { getRooms } from "@/services/rooms";
import { getBookings } from "@/services/room_bookings";
import { getEvents } from "@/services/events";
import { getAnnouncements } from "@/services/announcements";
import { getAssignments } from "@/services/assignments";

// Aggregates live campus data for the dashboard. Bookings are grouped onto each
// room so the client-side availability selector can run without extra requests.
export async function GET() {
  const [schedules, rooms, bookings, events, announcements, assignments] =
    await Promise.all([
      getSchedules(),
      getRooms(),
      getBookings(),
      getEvents(),
      getAnnouncements(),
      getAssignments(),
    ]);

  const firstError =
    schedules.error ||
    rooms.error ||
    bookings.error ||
    events.error ||
    announcements.error ||
    assignments.error;
  if (firstError) {
    return NextResponse.json({ error: firstError }, { status: 500 });
  }

  const bookingsByRoom = new Map<string, unknown[]>();
  for (const b of bookings.data ?? []) {
    const list = bookingsByRoom.get(b.room_id) ?? [];
    list.push(b);
    bookingsByRoom.set(b.room_id, list);
  }

  const roomsWithBookings = (rooms.data ?? []).map((room) => ({
    ...room,
    bookings: bookingsByRoom.get(room.id) ?? [],
  }));

  return NextResponse.json({
    schedules: schedules.data ?? [],
    rooms: roomsWithBookings,
    events: events.data ?? [],
    announcements: announcements.data ?? [],
    assignments: assignments.data ?? [],
  });
}
