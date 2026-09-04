import type { DayOfWeek, Prisma } from "@prisma/client";
import { database } from "../../config/database.js";
import { combineDateAndTime, timeToDate } from "../../utils/dateTime.js";
import type { AvailabilityQuery, BookingInput, RoomInput, RoomListQuery, RoomUpdateInput } from "./rooms.validation.js";

const roomInclude = {
  features: true,
  bookings: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }
} satisfies Prisma.RoomInclude;

export const roomsModel = {
  findMany(query: RoomListQuery = {}) {
    return database.room.findMany({
      where: {
        type: query.type,
        capacity: query.minCapacity ? { gte: query.minCapacity } : undefined,
        features: query.feature ? { some: { name: { equals: query.feature } } } : undefined
      },
      include: roomInclude,
      orderBy: { number: "asc" }
    });
  },
  findById(id: string) {
    return database.room.findUnique({ where: { id }, include: roomInclude });
  },
  findByNumber(number: string) {
    return database.room.findUnique({ where: { number: number.toUpperCase() }, include: roomInclude });
  },
  findAvailable(query: AvailabilityQuery, dayOfWeek: DayOfWeek) {
    const startsAt = combineDateAndTime(query.date, query.startTime);
    const endsAt = combineDateAndTime(query.date, query.endTime);
    return database.room.findMany({
      where: {
        status: "AVAILABLE",
        type: query.type,
        capacity: query.minCapacity ? { gte: query.minCapacity } : undefined,
        AND: query.features.map((name) => ({ features: { some: { name } } })),
        bookings: { none: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } },
        events: { none: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, status: { not: "CANCELLED" } } },
        schedules: {
          none: {
            dayOfWeek,
            startTime: { lt: timeToDate(query.endTime) },
            endTime: { gt: timeToDate(query.startTime) }
          }
        }
      },
      include: { features: true },
      orderBy: [{ capacity: "asc" }, { number: "asc" }]
    });
  },
  create(input: RoomInput) {
    return database.room.create({
      data: {
        number: input.number.toUpperCase(), type: input.type, capacity: input.capacity, floor: input.floor, status: input.status,
        features: { create: [...new Set(input.features.map((name) => name.toLowerCase()))].map((name) => ({ name })) }
      },
      include: roomInclude
    });
  },
  update(id: string, input: RoomUpdateInput) {
    return database.$transaction(async (transaction) => {
      if (input.features) await transaction.roomFeature.deleteMany({ where: { roomId: id } });
      return transaction.room.update({
        where: { id },
        data: {
          number: input.number?.toUpperCase(), type: input.type, capacity: input.capacity, floor: input.floor, status: input.status,
          features: input.features
            ? { create: [...new Set(input.features.map((name) => name.toLowerCase()))].map((name) => ({ name })) }
            : undefined
        },
        include: roomInclude
      });
    });
  },
  delete(id: string) {
    return database.room.delete({ where: { id } });
  },
  findBookingConflict(roomId: string, startsAt: Date, endsAt: Date) {
    return database.roomBooking.findFirst({ where: { roomId, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
  },
  findEventConflict(roomId: string, startsAt: Date, endsAt: Date) {
    return database.campusEvent.findFirst({
      where: {
        roomId,
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        status: { not: "CANCELLED" }
      }
    });
  },
  createBooking(roomId: string, externalUserId: string, input: BookingInput) {
    return database.roomBooking.create({
      data: {
        room: { connect: { id: roomId } },
        user: { connect: { externalId: externalUserId } },
        bookedBy: input.bookedBy,
        purpose: input.purpose,
        startsAt: combineDateAndTime(input.date, input.startTime),
        endsAt: combineDateAndTime(input.date, input.endTime)
      }
    });
  }
};
