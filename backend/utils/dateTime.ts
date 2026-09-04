import type { DayOfWeek } from "@prisma/client";
import { AppError } from "./AppError.js";

const days: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY"
];

export function timeToDate(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function combineDateAndTime(date: string, time: string): Date {
  const result = new Date(`${date}T${time}:00.000Z`);
  if (Number.isNaN(result.valueOf())) {
    throw new AppError("Invalid date or time", 400, "INVALID_DATE_TIME");
  }
  return result;
}

export function dayOfWeekForDate(date: Date): DayOfWeek {
  const day = days[date.getUTCDay()];
  if (!day) throw new AppError("Unable to determine day of week", 400, "INVALID_DATE");
  return day;
}
