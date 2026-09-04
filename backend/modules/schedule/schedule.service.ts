import { AppError } from "../../utils/AppError.js";
import { scheduleModel } from "./schedule.model.js";
import type { ScheduleInput, ScheduleListQuery, ScheduleUpdateInput } from "./schedule.validation.js";

export const scheduleService = {
  list(query: ScheduleListQuery) {
    return scheduleModel.findMany(query);
  },

  async getById(id: string) {
    const schedule = await scheduleModel.findById(id);
    if (!schedule) throw new AppError("Schedule not found", 404, "SCHEDULE_NOT_FOUND");
    return schedule;
  },

  async create(input: ScheduleInput) {
    const room = await import("../rooms/rooms.model.js").then(({ roomsModel }) =>
      roomsModel.findByNumber(input.roomNumber)
    );
    if (!room) throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    const conflict = await scheduleModel.findRoomConflict(room.id, input.dayOfWeek, input.startTime, input.endTime);
    if (conflict) throw new AppError("The room already has a class during this time", 409, "SCHEDULE_CONFLICT");
    return scheduleModel.create(input);
  },

  async update(id: string, input: ScheduleUpdateInput) {
    const current = await this.getById(id);
    const day = input.dayOfWeek ?? current.dayOfWeek;
    const startTime = input.startTime ?? current.startTime.toISOString().slice(11, 16);
    const endTime = input.endTime ?? current.endTime.toISOString().slice(11, 16);
    const roomNumber = input.roomNumber ?? current.room.number;
    const room = await import("../rooms/rooms.model.js").then(({ roomsModel }) => roomsModel.findByNumber(roomNumber));
    if (!room) throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    const conflict = await scheduleModel.findRoomConflict(room.id, day, startTime, endTime, id);
    if (conflict) throw new AppError("The room already has a class during this time", 409, "SCHEDULE_CONFLICT");
    return scheduleModel.update(id, input);
  },

  async remove(id: string) {
    await this.getById(id);
    await scheduleModel.delete(id);
  }
};
