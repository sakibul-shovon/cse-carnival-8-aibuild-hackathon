import { z } from "zod";
import { getEvents } from "@/services/events";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService } from "./service";

const schema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .nullish()
    .describe("Filter to events occurring on this date (spans multi-day events)."),
  upcoming_only: z
    .boolean()
    .nullish()
    .describe("If true, only return events that are not completed or cancelled and have not already ended."),
});

export const getEventsTool: ToolDefinition<typeof schema> = {
  name: "get_events",
  description:
    "Get campus events. Optionally filter to a specific date and/or only upcoming events. Returns name, description, date/time, venue, organizer, capacity, registered count, and status.",
  schema,
  progressLabel: "Checking campus events",
  async execute({ date, upcoming_only }, ctx) {
    const res = await fromService(await getEvents());
    if (!res.ok) return res;

    let items = res.data;
    if (date) {
      // Include multi-day events whose span covers the requested date.
      items = items.filter((e) => e.date <= date && (e.end_date ?? e.date) >= date);
    }
    if (upcoming_only) {
      items = items.filter(
        (e) =>
          e.status !== "completed" &&
          e.status !== "cancelled" &&
          (e.end_date ?? e.date) >= ctx.now.date,
      );
    }

    return toolOk(items);
  },
};
