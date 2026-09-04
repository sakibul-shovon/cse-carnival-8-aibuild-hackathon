import type { DayOfWeek, Prisma } from "@prisma/client";
import { database } from "../../config/database.js";
import { timeToDate } from "../../utils/dateTime.js";
import type { ScheduleInput, ScheduleListQuery, ScheduleUpdateInput } from "./schedule.validation.js";

const scheduleInclude = { course: true, room: true } satisfies Prisma.ScheduleInclude;

export const scheduleModel = {
  findMany(query: ScheduleListQuery) {
    return database.schedule.findMany({
      where: {
        dayOfWeek: query.day,
        semester: query.semester,
        ...(query.userId
          ? { course: { enrollments: { some: { user: { externalId: query.userId } } } } }
          : {})
      },
      include: scheduleInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
  },

  findById(id: string) {
    return database.schedule.findUnique({ where: { id }, include: scheduleInclude });
  },

  findRoomConflict(roomId: string, dayOfWeek: DayOfWeek, startTime: string, endTime: string, excludeId?: string) {
    return database.schedule.findFirst({
      where: {
        roomId,
        dayOfWeek,
        id: excludeId ? { not: excludeId } : undefined,
        startTime: { lt: timeToDate(endTime) },
        endTime: { gt: timeToDate(startTime) }
      }
    });
  },

  create(input: ScheduleInput) {
    return database.$transaction(async (transaction) => {
      const course = await transaction.course.upsert({
        where: { code: input.courseCode.toUpperCase() },
        update: { title: input.courseTitle, department: input.department },
        create: { code: input.courseCode.toUpperCase(), title: input.courseTitle, department: input.department }
      });
      const room = await transaction.room.findUniqueOrThrow({ where: { number: input.roomNumber.toUpperCase() } });
      return transaction.schedule.create({
        data: {
          courseId: course.id,
          roomId: room.id,
          dayOfWeek: input.dayOfWeek,
          startTime: timeToDate(input.startTime),
          endTime: timeToDate(input.endTime),
          instructor: input.instructor,
          section: input.section,
          semester: input.semester
        },
        include: scheduleInclude
      });
    });
  },

  update(id: string, input: ScheduleUpdateInput) {
    return database.$transaction(async (transaction) => {
      const existing = await transaction.schedule.findUniqueOrThrow({ where: { id } });
      const course = input.courseCode
        ? await transaction.course.upsert({
            where: { code: input.courseCode.toUpperCase() },
            update: { title: input.courseTitle, department: input.department },
            create: {
              code: input.courseCode.toUpperCase(),
              title: input.courseTitle ?? input.courseCode,
              department: input.department ?? "CSE"
            }
          })
        : undefined;
      const room = input.roomNumber
        ? await transaction.room.findUniqueOrThrow({ where: { number: input.roomNumber.toUpperCase() } })
        : undefined;
      return transaction.schedule.update({
        where: { id },
        data: {
          courseId: course?.id,
          roomId: room?.id,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime ? timeToDate(input.startTime) : undefined,
          endTime: input.endTime ? timeToDate(input.endTime) : undefined,
          instructor: input.instructor,
          section: input.section,
          semester: input.semester
        },
        include: scheduleInclude
      });
    });
  },

  delete(id: string) {
    return database.schedule.delete({ where: { id } });
  }
};
