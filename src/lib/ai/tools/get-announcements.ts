import { z } from "zod";
import { getAnnouncements } from "@/services/announcements";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService } from "./service";

const schema = z.object({
  priority: z
    .enum(["high", "medium", "low"])
    .nullish()
    .describe("Filter by priority level."),
  active_only: z
    .boolean()
    .nullish()
    .describe("If true, only return announcements that have not expired as of today."),
});

export const getAnnouncementsTool: ToolDefinition<typeof schema> = {
  name: "get_announcements",
  description:
    "Get campus announcements. Optionally filter by priority and/or hide expired ones. Returns title, body, date, priority, author, and expiry date.",
  schema,
  progressLabel: "Checking announcements",
  async execute({ priority, active_only }, ctx) {
    const res = await fromService(await getAnnouncements());
    if (!res.ok) return res;

    let items = res.data;
    if (priority) items = items.filter((a) => a.priority === priority);
    if (active_only) items = items.filter((a) => a.expires >= ctx.now.date);

    return toolOk(items);
  },
};
