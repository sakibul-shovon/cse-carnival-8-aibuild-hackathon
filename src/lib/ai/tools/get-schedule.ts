import { z } from "zod";
import { getSchedules } from "@/services/schedules";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService, WEEKDAYS } from "./service";

const schema = z.object({
  day: z
    .enum(WEEKDAYS)
    .nullish()
    .describe("Day of the week to filter by. Omit to return the full weekly schedule."),
});

export const getScheduleTool: ToolDefinition<typeof schema> = {
  name: "get_schedule",
  description:
    "Get the class schedule. Optionally filter to a single day (Sunday–Thursday). Returns course, title, day, start/end time, room, instructor, and section.",
  schema,
  progressLabel: "Checking the class schedule",
  async execute({ day }) {
    const res = await fromService(await getSchedules());
    if (!res.ok) return res;
    const classes = day ? res.data.filter((c) => c.day === day) : res.data;
    return toolOk(classes);
  },
};
