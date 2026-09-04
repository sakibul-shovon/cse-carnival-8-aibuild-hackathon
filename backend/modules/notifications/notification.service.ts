import type { NotificationSourceType, Prisma } from "@prisma/client";
import { database } from "../../config/database.js";

/** How far ahead of an assignment's due date a reminder is generated. */
const ASSIGNMENT_DEADLINE_WINDOW_HOURS = 24;
/** How far ahead of an event's start time a reminder is generated. */
const EVENT_STARTING_SOON_WINDOW_MINUTES = 60;
/** How far ahead of an announcement's expiry a reminder is generated. */
const ANNOUNCEMENT_EXPIRING_WINDOW_HOURS = 24;

export interface NotificationSweepResult {
  assignmentsChecked: number;
  eventsChecked: number;
  announcementsChecked: number;
  notificationsCreated: number;
  runAt: string;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * A notification's natural key is (userId, sourceType, sourceId, message).
 * The message text is a fixed template per source entity, so re-running the
 * sweep against unchanged data never produces a second row for the same alert.
 */
async function usersAlreadyNotified(sourceType: NotificationSourceType, sourceId: string, message: string): Promise<Set<string>> {
  const existing = await database.notification.findMany({
    where: { sourceType, sourceId, message },
    select: { userId: true }
  });
  return new Set(existing.map((row) => row.userId));
}

async function createNotifications(rows: Prisma.NotificationCreateManyInput[]): Promise<number> {
  if (!rows.length) return 0;
  const result = await database.notification.createMany({ data: rows });
  return result.count;
}

async function checkAssignmentDeadlines(now: Date): Promise<{ checked: number; created: number }> {
  const windowEnd = addHours(now, ASSIGNMENT_DEADLINE_WINDOW_HOURS);
  const assignments = await database.assignment.findMany({
    where: { dueAt: { gte: now, lte: windowEnd } },
    include: {
      course: { include: { enrollments: { select: { user: { select: { id: true } } } } } },
      submissions: { select: { userId: true, status: true } }
    }
  });

  let created = 0;
  for (const assignment of assignments) {
    const submitted = new Set(
      assignment.submissions.filter((s) => s.status === "SUBMITTED" || s.status === "GRADED").map((s) => s.userId)
    );
    const enrolledUserIds = new Set(assignment.course.enrollments.map((e) => e.user.id));
    const pendingUserIds = [...enrolledUserIds].filter((userId) => !submitted.has(userId));
    if (!pendingUserIds.length) continue;

    const message = `"${assignment.title}" is due ${assignment.dueAt.toISOString()}.`;
    const alreadyNotified = await usersAlreadyNotified("ASSIGNMENT", assignment.id, message);
    const rows: Prisma.NotificationCreateManyInput[] = pendingUserIds
      .filter((userId) => !alreadyNotified.has(userId))
      .map((userId) => ({
        userId,
        sourceType: "ASSIGNMENT" as const,
        sourceId: assignment.id,
        message,
        sendAt: now,
        status: "PENDING" as const
      }));
    created += await createNotifications(rows);
  }

  return { checked: assignments.length, created };
}

async function checkEventsStartingSoon(now: Date): Promise<{ checked: number; created: number }> {
  const windowEnd = addMinutes(now, EVENT_STARTING_SOON_WINDOW_MINUTES);
  const events = await database.campusEvent.findMany({
    where: { startsAt: { gte: now, lte: windowEnd }, status: { in: ["UPCOMING", "ACTIVE"] } },
    include: { registrations: { select: { userId: true } } }
  });

  let created = 0;
  for (const event of events) {
    const registeredUserIds = [...new Set(event.registrations.map((r) => r.userId))];
    if (!registeredUserIds.length) continue;

    const message = `"${event.name}" starts at ${event.startsAt.toISOString()} in ${event.venueLabel}.`;
    const alreadyNotified = await usersAlreadyNotified("EVENT", event.id, message);
    const rows: Prisma.NotificationCreateManyInput[] = registeredUserIds
      .filter((userId) => !alreadyNotified.has(userId))
      .map((userId) => ({
        userId,
        sourceType: "EVENT" as const,
        sourceId: event.id,
        message,
        sendAt: now,
        status: "PENDING" as const
      }));
    created += await createNotifications(rows);
  }

  return { checked: events.length, created };
}

async function checkAnnouncementsExpiring(now: Date): Promise<{ checked: number; created: number }> {
  const windowEnd = addHours(now, ANNOUNCEMENT_EXPIRING_WINDOW_HOURS);
  const announcements = await database.announcement.findMany({
    where: { expiresAt: { gte: now, lte: windowEnd } }
  });
  if (!announcements.length) return { checked: 0, created: 0 };

  const users = await database.user.findMany({ select: { id: true } });
  let created = 0;
  for (const announcement of announcements) {
    const message = `Reminder: "${announcement.title}" expires ${announcement.expiresAt!.toISOString()}.`;
    const alreadyNotified = await usersAlreadyNotified("ANNOUNCEMENT", announcement.id, message);
    const rows: Prisma.NotificationCreateManyInput[] = users
      .filter((user) => !alreadyNotified.has(user.id))
      .map((user) => ({
        userId: user.id,
        sourceType: "ANNOUNCEMENT" as const,
        sourceId: announcement.id,
        message,
        sendAt: now,
        status: "PENDING" as const
      }));
    created += await createNotifications(rows);
  }

  return { checked: announcements.length, created };
}

export const notificationService = {
  /** Runs all three proactive checks once and returns a summary. Idempotent — safe to run on any cadence. */
  async runSweep(now: Date = new Date()): Promise<NotificationSweepResult> {
    const [assignments, events, announcements] = await Promise.all([
      checkAssignmentDeadlines(now),
      checkEventsStartingSoon(now),
      checkAnnouncementsExpiring(now)
    ]);

    return {
      assignmentsChecked: assignments.checked,
      eventsChecked: events.checked,
      announcementsChecked: announcements.checked,
      notificationsCreated: assignments.created + events.created + announcements.created,
      runAt: now.toISOString()
    };
  }
};
