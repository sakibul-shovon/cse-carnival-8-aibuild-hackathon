import { z } from "zod";
import { createBooking } from "@/services/room_bookings";
import { toolError, toolOk, type ToolDefinition } from "./registry";
import { fromService, timeToMinutes } from "./service";
import { resolveRoomByNumber } from "./resolve";

const schema = z.object({
  room_number: z.string().min(1).describe('Room to book, e.g. "7A02".'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").describe("Booking date."),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "start_time must be 24h HH:MM"),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "end_time must be 24h HH:MM"),
  purpose: z.string().min(1).describe("Reason for the booking."),
  booked_by: z.string().min(1).describe("Name of the person or group making the booking."),
});

export const bookRoomTool: ToolDefinition<typeof schema> = {
  name: "book_room",
  description:
    "Book a room for a time slot. Requires room number, date, start/end time, purpose, and who is booking. The backend rejects overlapping bookings and unavailable/nonexistent rooms — only report success if this returns it.",
  schema,
  progressLabel: "Booking the room",
  async execute({ room_number, date, start_time, end_time, purpose, booked_by }) {
    if (timeToMinutes(start_time) >= timeToMinutes(end_time)) {
      return toolError("INVALID_TIME", "start_time must be before end_time");
    }

    const room = await resolveRoomByNumber(room_number);
    if (!room.ok) return room;

    const res = await fromService(
      await createBooking({
        booking_id: `bk-${crypto.randomUUID()}`,
        room_id: room.value.id,
        booked_by,
        date,
        start_time,
        end_time,
        purpose,
      }),
      "BOOKING_FAILED",
    );
    if (!res.ok) return res;
    return toolOk({ ...res.data, room_number: room.value.room_number });
  },
};
