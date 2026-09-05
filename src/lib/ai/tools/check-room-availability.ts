import { z } from "zod";
import { getAvailableRooms } from "@/services/room_bookings";
import { toolError, type ToolDefinition } from "./registry";
import { fromService, timeToMinutes } from "./service";

const schema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .describe("Date to check, YYYY-MM-DD."),
  start_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "start_time must be 24h HH:MM")
    .describe("Slot start, 24h HH:MM."),
  end_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "end_time must be 24h HH:MM")
    .describe("Slot end, 24h HH:MM."),
  min_capacity: z
    .number()
    .int()
    .positive()
    .nullish()
    .describe("Minimum room capacity required."),
  required_equipment: z
    .array(z.string())
    .nullish()
    .describe('Equipment the room must have, e.g. ["projector", "AC"].'),
});

export const checkRoomAvailabilityTool: ToolDefinition<typeof schema> = {
  name: "check_room_availability",
  description:
    "Find rooms that are free for a given date and time window, optionally filtered by minimum capacity and required equipment. Returns the list of matching available rooms.",
  schema,
  progressLabel: "Checking room availability",
  async execute(params) {
    if (timeToMinutes(params.start_time) >= timeToMinutes(params.end_time)) {
      return toolError("INVALID_TIME", "start_time must be before end_time");
    }
    // Backend schema treats these as optional (not nullable); drop nulls.
    return fromService(
      await getAvailableRooms({
        date: params.date,
        start_time: params.start_time,
        end_time: params.end_time,
        ...(params.min_capacity != null ? { min_capacity: params.min_capacity } : {}),
        ...(params.required_equipment != null ? { required_equipment: params.required_equipment } : {}),
      }),
    );
  },
};
