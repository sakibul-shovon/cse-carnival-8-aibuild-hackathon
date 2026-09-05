import { z } from "zod";
import { getSchedules } from "@/services/schedules";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService, timeToMinutes, WEEKDAYS } from "./service";

const schema = z.object({
  current_day: z.enum(WEEKDAYS).describe("The day to start searching from."),
  current_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "current_time must be 24h HH:MM")
    .describe("Current time in 24h HH:MM."),
});

// University week runs Sunday–Thursday; classes only exist on those days.
const TEACHING_DAYS = WEEKDAYS.slice(0, 5);

export const getNextClassTool: ToolDefinition<typeof schema> = {
  name: "get_next_class",
  description:
    "Find the student's next class relative to a given day and time. Searches the current day forward through the Sunday–Thursday week. Returns the single upcoming class, or nothing if there are no more classes.",
  schema,
  progressLabel: "Finding your next class",
  async execute({ current_day, current_time }) {
    const res = await fromService(await getSchedules());
    if (!res.ok) return res;

    const startIndex = WEEKDAYS.indexOf(current_day);
    const nowMinutes = timeToMinutes(current_time);

    // Search up to 5 teaching days ahead (wraps through the week).
    for (let offset = 0; offset < 7; offset++) {
      const dayName = WEEKDAYS[(startIndex + offset) % 7];
      if (!TEACHING_DAYS.includes(dayName)) continue;

      const dayClasses = res.data
        .filter((c) => c.day === dayName)
        .filter((c) => offset > 0 || timeToMinutes(c.start_time) > nowMinutes)
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      if (dayClasses.length > 0) {
        return toolOk({ next_class: dayClasses[0], is_today: offset === 0 });
      }
    }

    return toolOk({ next_class: null, is_today: false });
  },
};
