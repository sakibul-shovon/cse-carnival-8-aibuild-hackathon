import type { Prisma } from "@prisma/client";
import { database } from "../../config/database.js";
import type { EventInput, EventListQuery, EventUpdateInput } from "./events.validation.js";

const eventInclude = {
  room: true,
  _count: { select: { registrations: true } }
} satisfies Prisma.CampusEventInclude;

export const eventsModel = {
  findMany(query: EventListQuery = {}) {
    return database.campusEvent.findMany({
      where: {
        status: query.status,
        startsAt: query.from || query.to
          ? { gte: query.from ? new Date(query.from) : undefined, lte: query.to ? new Date(query.to) : undefined }
          : undefined
      },
      include: eventInclude,
      orderBy: { startsAt: "asc" }
    });
  },
  findById(id: string) {
    return database.campusEvent.findUnique({ where: { id }, include: eventInclude });
  },
  create(input: EventInput, roomId: string | null) {
    return database.campusEvent.create({
      data: {
        name: input.name,
        description: input.description,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        roomId,
        venueLabel: input.venueLabel,
        organizer: input.organizer,
        capacity: input.capacity,
        status: input.status
      },
      include: eventInclude
    });
  },
  update(id: string, input: EventUpdateInput, roomId: string | null | undefined) {
    return database.campusEvent.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        roomId,
        venueLabel: input.venueLabel,
        organizer: input.organizer,
        capacity: input.capacity,
        status: input.status
      },
      include: eventInclude
    });
  },
  delete(id: string) { return database.campusEvent.delete({ where: { id } }); },
  register(eventId: string, externalUserId: string) {
    return database.eventRegistration.create({
      data: { event: { connect: { id: eventId } }, user: { connect: { externalId: externalUserId } } }
    });
  },
  findRegistration(eventId: string, externalUserId: string) {
    return database.eventRegistration.findFirst({ where: { eventId, user: { externalId: externalUserId } } });
  }
};
