import { z } from "zod";
import { getAssignments } from "@/services/assignments";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService } from "./service";

const schema = z.object({
  course: z
    .string()
    .nullish()
    .describe("Filter by course code or title (case-insensitive substring, e.g. \"CSE 4113\" or \"machine learning\")."),
  status: z
    .enum(["pending", "submitted", "graded", "late"])
    .nullish()
    .describe("Filter by assignment status."),
  due_before: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "due_before must be YYYY-MM-DD")
    .nullish()
    .describe("Only include assignments due on or before this date (inclusive)."),
});

export const getAssignmentsTool: ToolDefinition<typeof schema> = {
  name: "get_assignments",
  description:
    'Get assignments. Optionally filter by course, status, and/or a due-before date. For "due this week" or "due by <date>" questions, set due_before to that date (use the resolved dates in the system prompt). Returns course, title, deadline, submission platform, status, and marks.',
  schema,
  progressLabel: "Checking assignments",
  async execute({ course, status, due_before }) {
    const res = await fromService(await getAssignments());
    if (!res.ok) return res;

    let items = res.data;
    if (course) {
      const q = course.toLowerCase();
      items = items.filter(
        (a) => a.course.toLowerCase().includes(q) || a.course_title.toLowerCase().includes(q),
      );
    }
    if (status) items = items.filter((a) => a.status === status);
    if (due_before) items = items.filter((a) => a.deadline <= due_before);

    return toolOk(items);
  },
};
