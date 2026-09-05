import { z } from "zod";
import { registerForEvent } from "@/services/event_registrations";
import { toolOk, type ToolDefinition } from "./registry";
import { fromService } from "./service";
import { resolveEvent } from "./resolve";

const schema = z.object({
  event_name_or_id: z.string().min(1).describe("Event name (or id) to register for."),
  student_name: z.string().min(1).describe("Full name of the student registering."),
  student_id: z.string().min(1).describe('Student ID, e.g. "20-40532".'),
});

export const registerForEventTool: ToolDefinition<typeof schema> = {
  name: "register_for_event",
  description:
    "Register a student for an event by name or id. The backend rejects cancelled/completed/full events and duplicate registrations — only confirm success if this returns it.",
  schema,
  progressLabel: "Registering for the event",
  async execute({ event_name_or_id, student_name, student_id }) {
    const event = await resolveEvent(event_name_or_id);
    if (!event.ok) return event;

    const res = await fromService(
      await registerForEvent({ event_id: event.value.id, student_id, name: student_name }),
      "REGISTRATION_FAILED",
    );
    if (!res.ok) return res;
    return toolOk({ ...res.data, event_name: event.value.name });
  },
};
