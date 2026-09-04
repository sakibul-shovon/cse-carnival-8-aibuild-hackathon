import { AppError } from "../../utils/AppError.js";
import { combineDateAndTime, dayOfWeekForDate } from "../../utils/dateTime.js";
import { scheduleModel } from "../schedule/schedule.model.js";
import { roomsModel } from "./rooms.model.js";
import type { AvailabilityQuery, BookingInput, RoomInput, RoomListQuery, RoomUpdateInput } from "./rooms.validation.js";

export const roomsService = {
  list(query: RoomListQuery = {}) { return roomsModel.findMany(query); },
  async getById(id: string) {
    const room = await roomsModel.findById(id);
    if (!room) throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    return room;
  },
  create(input: RoomInput) { return roomsModel.create(input); },
  async update(id: string, input: RoomUpdateInput) {
    await this.getById(id);
    return roomsModel.update(id, input);
  },
  async remove(id: string) {
    await this.getById(id);
    await roomsModel.delete(id);
  },
  findAvailable(query: AvailabilityQuery) {
    return roomsModel.findAvailable(query, dayOfWeekForDate(combineDateAndTime(query.date, query.startTime)));
  },
  async book(roomId: string, externalUserId: string, input: BookingInput) {
    const room = await this.getById(roomId);
    if (room.status !== "AVAILABLE") throw new AppError("Room is not available for booking", 409, "ROOM_UNAVAILABLE");
    const startsAt = combineDateAndTime(input.date, input.startTime);
    const endsAt = combineDateAndTime(input.date, input.endTime);
    const [bookingConflict, scheduleConflict, eventConflict] = await Promise.all([
      roomsModel.findBookingConflict(room.id, startsAt, endsAt),
      scheduleModel.findRoomConflict(room.id, dayOfWeekForDate(startsAt), input.startTime, input.endTime),
      roomsModel.findEventConflict(room.id, startsAt, endsAt)
    ]);
    if (bookingConflict || scheduleConflict || eventConflict) {
      throw new AppError("Room is already occupied during this time", 409, "ROOM_BOOKING_CONFLICT");
    }
    return roomsModel.createBooking(room.id, externalUserId, input);
  }
};
