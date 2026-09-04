import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Prisma } from "@prisma/client";
import { database } from "../../backend/config/database.js";

interface LegacySchedule { id: string; course: string; title: string; day: string; start_time: string; end_time: string; room: string; instructor: string; section: string }
interface LegacyRoom { id: string; room_number: string; type: string; capacity: number; equipment: string[]; floor: number; status: string; bookings: Array<{ booking_id: string; booked_by: string; date: string; start_time: string; end_time: string; purpose: string }> }
interface LegacyEvent { id: string; name: string; description: string; date: string; start_time: string; end_time: string; end_date: string; venue: string; organizer: string; capacity: number; registered: number; registrations: Array<{ student_id: string; name: string }>; status: string }
interface LegacyAnnouncement { id: string; title: string; body: string; date: string; priority: string; posted_by: string; expires: string }
interface LegacyAssignment { id: string; course: string; course_title: string; title: string; description: string; assigned_date: string; deadline: string; submission_platform: string; status: string; marks: number }

const seedDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../seed");
const dayMap: Record<string, "SUNDAY" | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY"> = {
  Sunday: "SUNDAY", Monday: "MONDAY", Tuesday: "TUESDAY", Wednesday: "WEDNESDAY", Thursday: "THURSDAY", Friday: "FRIDAY", Saturday: "SATURDAY"
};

async function load<T>(fileName: string): Promise<T> {
  return JSON.parse(await readFile(path.join(seedDirectory, fileName), "utf8")) as T;
}

const atMidnight = (date: string) => new Date(`${date}T00:00:00.000Z`);
const atEndOfDay = (date: string) => new Date(`${date}T23:59:59.000Z`);
const atTime = (date: string, time: string) => new Date(`${date}T${time}:00.000Z`);
const timeOnly = (time: string) => new Date(`1970-01-01T${time}:00.000Z`);

async function main(): Promise<void> {
  const [schedules, rooms, events, announcements, assignments] = await Promise.all([
    load<LegacySchedule[]>("schedules.json"), load<LegacyRoom[]>("rooms.json"), load<LegacyEvent[]>("events.json"),
    load<LegacyAnnouncement[]>("announcements.json"), load<LegacyAssignment[]>("assignments.json")
  ]);

  await database.$transaction([
    database.chatMemory.deleteMany(), database.notification.deleteMany(),
    database.assignmentSubmission.deleteMany(), database.assignment.deleteMany(), database.eventRegistration.deleteMany(),
    database.campusEvent.deleteMany(), database.roomBooking.deleteMany(), database.schedule.deleteMany(),
    database.courseEnrollment.deleteMany(), database.roomFeature.deleteMany(), database.course.deleteMany(),
    database.room.deleteMany(), database.announcement.deleteMany(), database.user.deleteMany()
  ]);

  const notificationsToCreate: Prisma.NotificationCreateManyInput[] = [];

  const primaryUser = await database.user.create({
    data: { id: "user-student-001", externalId: "20-40532", name: "Sakibul Hassan", email: "sakibul.hassan@campusos.local", role: "STUDENT" }
  });

  notificationsToCreate.push({
    userId: primaryUser.id,
    sourceType: "SYSTEM",
    sourceId: null,
    message: "Welcome to CampusOS. This is your live campus intelligence feed.",
    sendAt: new Date(),
    status: "SENT"
  });

  const registrationUsers = new Map<string, string>([[primaryUser.externalId, primaryUser.id]]);
  for (const registration of events.flatMap((event) => event.registrations)) {
    if (registrationUsers.has(registration.student_id)) continue;
    const user = await database.user.create({
      data: {
        externalId: registration.student_id,
        name: registration.name,
        email: `${registration.student_id.replace(/[^a-zA-Z0-9]/g, "")}@campusos.local`,
        role: "STUDENT"
      }
    });
    registrationUsers.set(user.externalId, user.id);
  }

  const roomIds = new Map<string, string>();
  for (const room of rooms) {
    const created = await database.room.create({
      data: {
        id: room.id,
        number: room.room_number.toUpperCase(),
        type: room.type.toUpperCase() as "CLASSROOM" | "LAB" | "SEMINAR" | "AUDITORIUM" | "STUDY",
        capacity: room.capacity,
        floor: room.floor,
        status: room.status.toUpperCase() as "AVAILABLE" | "MAINTENANCE" | "CLOSED",
        features: { create: [...new Set(room.equipment.map((name) => name.toLowerCase()))].map((name) => ({ name })) }
      }
    });
    roomIds.set(room.room_number.toUpperCase(), created.id);
    for (const booking of room.bookings) {
      await database.roomBooking.create({
        data: {
          id: booking.booking_id, roomId: created.id, userId: primaryUser.id, bookedBy: booking.booked_by,
          purpose: booking.purpose, startsAt: atTime(booking.date, booking.start_time), endsAt: atTime(booking.date, booking.end_time)
        }
      });
    }
  }

  const courseFixtures = new Map<string, string>();
  for (const item of [...schedules.map((s) => ({ code: s.course, title: s.title })), ...assignments.map((a) => ({ code: a.course, title: a.course_title }))]) {
    courseFixtures.set(item.code, item.title);
  }
  const courseIds = new Map<string, string>();
  for (const [code, title] of courseFixtures) {
    const course = await database.course.create({ data: { code, title, department: code.split(" ")[0] ?? "CSE" } });
    courseIds.set(code, course.id);
    await database.courseEnrollment.create({ data: { userId: primaryUser.id, courseId: course.id, section: "B" } });
  }

  for (const schedule of schedules) {
    const courseId = courseIds.get(schedule.course);
    const roomId = roomIds.get(schedule.room.toUpperCase());
    if (!courseId || !roomId) throw new Error(`Unresolved schedule relation for ${schedule.id}`);
    await database.schedule.create({
      data: {
        id: schedule.id, courseId, roomId, dayOfWeek: dayMap[schedule.day]!,
        startTime: timeOnly(schedule.start_time), endTime: timeOnly(schedule.end_time),
        instructor: schedule.instructor, section: schedule.section, semester: "Fall 2026"
      }
    });
  }

  for (const event of events) {
    const created = await database.campusEvent.create({
      data: {
        id: event.id, name: event.name, description: event.description,
        startsAt: atTime(event.date, event.start_time), endsAt: atTime(event.end_date, event.end_time),
        roomId: roomIds.get(event.venue.toUpperCase()), venueLabel: event.venue, organizer: event.organizer,
        capacity: event.capacity, status: event.status.toUpperCase() as "UPCOMING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
      }
    });
    const registeredIds = new Set<string>();
    for (const registration of event.registrations) {
      const userId = registrationUsers.get(registration.student_id);
      if (userId && !registeredIds.has(userId)) {
        await database.eventRegistration.create({ data: { eventId: created.id, userId } });
        registeredIds.add(userId);
        if (userId === primaryUser.id) {
          notificationsToCreate.push({
            userId: primaryUser.id,
            sourceType: "EVENT",
            sourceId: created.id,
            message: `You're registered for "${event.name}" on ${event.date} at ${event.start_time}.`,
            sendAt: atTime(event.date, event.start_time),
            status: "PENDING"
          });
        }
      }
    }
    for (let index = registeredIds.size; index < event.registered; index += 1) {
      const externalId = `seed-${event.id}-${index + 1}`;
      const user = await database.user.create({
        data: { externalId, name: `Seed Student ${index + 1}`, email: `${externalId}@campusos.local`, role: "STUDENT" }
      });
      await database.eventRegistration.create({ data: { eventId: created.id, userId: user.id } });
    }
  }

  for (const announcement of announcements) {
    const priority = announcement.priority.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    await database.announcement.create({
      data: {
        id: announcement.id, title: announcement.title, body: announcement.body, priority,
        postedBy: announcement.posted_by, publishedAt: atMidnight(announcement.date), expiresAt: atEndOfDay(announcement.expires)
      }
    });
    if (priority === "HIGH" || priority === "URGENT") {
      notificationsToCreate.push({
        userId: primaryUser.id,
        sourceType: "ANNOUNCEMENT",
        sourceId: announcement.id,
        message: `${priority === "URGENT" ? "Urgent" : "Important"} announcement: ${announcement.title}`,
        sendAt: atMidnight(announcement.date),
        status: "SENT"
      });
    }
  }

  for (const assignment of assignments) {
    const courseId = courseIds.get(assignment.course);
    if (!courseId) throw new Error(`Unresolved assignment course for ${assignment.id}`);
    const status = assignment.status.toUpperCase() as "PENDING" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";
    await database.assignment.create({
      data: {
        id: assignment.id, courseId, title: assignment.title, description: assignment.description,
        assignedAt: atMidnight(assignment.assigned_date), dueAt: atEndOfDay(assignment.deadline),
        submissionPlatform: assignment.submission_platform, marks: assignment.marks,
        submissions: {
          create: {
            userId: primaryUser.id,
            status,
            submittedAt: assignment.status === "submitted" ? atMidnight(assignment.deadline) : null
          }
        }
      }
    });
    if (status === "PENDING" || status === "IN_PROGRESS") {
      notificationsToCreate.push({
        userId: primaryUser.id,
        sourceType: "ASSIGNMENT",
        sourceId: assignment.id,
        message: `"${assignment.title}" is due ${assignment.deadline}.`,
        sendAt: atMidnight(assignment.deadline),
        status: "PENDING"
      });
    }
  }

  if (notificationsToCreate.length) {
    await database.notification.createMany({ data: notificationsToCreate });
  }

  console.info(
    `Seeded ${rooms.length} rooms, ${schedules.length} schedules, ${events.length} events, ${announcements.length} announcements, ${assignments.length} assignments, and ${notificationsToCreate.length} notifications.`
  );
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => database.$disconnect());
