import { ToolRegistry } from "./registry";
import { getCurrentDatetimeTool } from "./get-current-datetime";
import { getScheduleTool } from "./get-schedule";
import { getNextClassTool } from "./get-next-class";
import { getAssignmentsTool } from "./get-assignments";
import { getAnnouncementsTool } from "./get-announcements";
import { getEventsTool } from "./get-events";
import { checkRoomAvailabilityTool } from "./check-room-availability";
import { bookRoomTool } from "./book-room";
import { registerForEventTool } from "./register-for-event";
import { cancelRegistrationTool } from "./cancel-registration";

export type { ToolContext, ToolDefinition, ToolResult } from "./registry";
export { ToolRegistry, toolOk, toolError } from "./registry";

/** Default registry used by the agent: the utility clock tool plus all 9 campus tools. */
export function createDefaultRegistry(): ToolRegistry {
  return new ToolRegistry()
    .register(getCurrentDatetimeTool)
    .register(getScheduleTool)
    .register(getNextClassTool)
    .register(getAssignmentsTool)
    .register(getAnnouncementsTool)
    .register(getEventsTool)
    .register(checkRoomAvailabilityTool)
    .register(bookRoomTool)
    .register(registerForEventTool)
    .register(cancelRegistrationTool);
}
