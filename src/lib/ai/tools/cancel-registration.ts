import { z } from "zod";
import { cancelRegistration } from "@/services/event_registrations";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService } from "./service";
import { resolveEvent } from "./resolve";

const schema = z.object({
  event_name_or_id: z.string().min(1).describe("Event name (or id) to cancel registration for."),
  student_id: z.string().min(1).describe('Student ID whose registration should be cancelled, e.g. "20-40532".'),
});

export const cancelRegistrationTool: ToolDefinition<typeof schema> = {
  name: "cancel_registration",
  description:
    "Cancel a student's registration for an event by name or id. The backend rejects cancellations when no matching registration exists — only confirm if this returns success.",
  schema,
  progressLabel: "Cancelling the registration",
  async execute({ event_name_or_id, student_id }) {
    const event = await resolveEvent(event_name_or_id);
    if (!event.ok) return event;

    const res = await fromService(
      await cancelRegistration({ event_id: event.value.id, student_id }),
      "CANCELLATION_FAILED",
    );
    if (!res.ok) return res;
    return toolOk({ cancelled: true, event_name: event.value.name });
  },
};
