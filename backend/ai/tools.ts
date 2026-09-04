import { z } from "zod";
import { announcementsService } from "../modules/announcements/announcements.service.js";
import { assignmentsService } from "../modules/assignments/assignments.service.js";
import { eventsService } from "../modules/events/events.service.js";
import { roomsService } from "../modules/rooms/rooms.service.js";
import { scheduleService } from "../modules/schedule/schedule.service.js";
import { AppError } from "../utils/AppError.js";

export const campusTools = [
  {
    type: "function",
    name: "getSchedule",
    description: "Get the class schedule, optionally filtered by student and day of week.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        userId: { type: ["string", "null"], description: "Campus student ID, or null for the current user." },
        day: { type: ["string", "null"], enum: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", null] }
      },
      required: ["userId", "day"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "findAvailableRooms",
    description: "Find rooms that have no class, event, or booking conflict in a time window.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in YYYY-MM-DD format." },
        startTime: { type: "string", description: "Start time in HH:mm 24-hour format." },
        endTime: { type: "string", description: "End time in HH:mm 24-hour format." },
        minCapacity: { type: ["integer", "null"], description: "Minimum number of seats, or null." },
        type: { type: ["string", "null"], enum: ["CLASSROOM", "LAB", "SEMINAR", "AUDITORIUM", "STUDY", null] },
        features: { type: "array", items: { type: "string" }, description: "Required equipment or room features." }
      },
      required: ["date", "startTime", "endTime", "minCapacity", "type", "features"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getUpcomingAssignments",
    description: "Get assignments due in a date window for a student.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        userId: { type: ["string", "null"], description: "Campus student ID, or null for the current user." },
        from: { type: ["string", "null"], description: "ISO date-time lower bound, or null for now." },
        dueBefore: { type: ["string", "null"], description: "ISO date-time upper bound, or null for no upper bound." },
        status: { type: ["string", "null"], enum: ["PENDING", "IN_PROGRESS", "SUBMITTED", "GRADED", null] }
      },
      required: ["userId", "from", "dueBefore", "status"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getCampusEvents",
    description: "Get campus events in an optional date window.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        from: { type: ["string", "null"], description: "ISO date-time lower bound, or null." },
        to: { type: ["string", "null"], description: "ISO date-time upper bound, or null." },
        status: { type: ["string", "null"], enum: ["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED", null] }
      },
      required: ["from", "to", "status"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getAnnouncements",
    description: "Get campus announcements filtered by priority and active state.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        priority: { type: ["string", "null"], enum: ["LOW", "MEDIUM", "HIGH", "URGENT", null] },
        activeOnly: { type: "boolean" }
      },
      required: ["priority", "activeOnly"],
      additionalProperties: false
    }
  }
] as const;

const scheduleArguments = z.object({
  userId: z.string().nullable(),
  day: z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]).nullable()
});
const roomArguments = z.object({
  date: z.string().date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  minCapacity: z.number().int().positive().nullable(),
  type: z.enum(["CLASSROOM", "LAB", "SEMINAR", "AUDITORIUM", "STUDY"]).nullable(),
  features: z.array(z.string())
});
const assignmentArguments = z.object({
  userId: z.string().nullable(), from: z.string().datetime().nullable(), dueBefore: z.string().datetime().nullable(),
  status: z.enum(["PENDING", "IN_PROGRESS", "SUBMITTED", "GRADED"]).nullable()
});
const eventArguments = z.object({
  from: z.string().datetime().nullable(), to: z.string().datetime().nullable(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"]).nullable()
});
const announcementArguments = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).nullable(), activeOnly: z.boolean()
});

export async function executeCampusTool(name: string, rawArguments: unknown, currentUserId: string): Promise<unknown> {
  switch (name) {
    case "getSchedule": {
      const args = scheduleArguments.parse(rawArguments);
      return scheduleService.list({ userId: args.userId ?? currentUserId, day: args.day ?? undefined });
    }
    case "findAvailableRooms": {
      const args = roomArguments.parse(rawArguments);
      return roomsService.findAvailable({ ...args, minCapacity: args.minCapacity ?? undefined, type: args.type ?? undefined });
    }
    case "getUpcomingAssignments": {
      const args = assignmentArguments.parse(rawArguments);
      return assignmentsService.list({
        userId: args.userId ?? currentUserId,
        from: args.from ?? new Date().toISOString(),
        dueBefore: args.dueBefore ?? undefined,
        status: args.status ?? undefined
      });
    }
    case "getCampusEvents": {
      const args = eventArguments.parse(rawArguments);
      return eventsService.list({ from: args.from ?? undefined, to: args.to ?? undefined, status: args.status ?? undefined });
    }
    case "getAnnouncements": {
      const args = announcementArguments.parse(rawArguments);
      return announcementsService.list({ priority: args.priority ?? undefined, activeOnly: args.activeOnly });
    }
    default:
      throw new AppError(`Unknown AI tool: ${name}`, 400, "UNKNOWN_AI_TOOL");
  }
}
