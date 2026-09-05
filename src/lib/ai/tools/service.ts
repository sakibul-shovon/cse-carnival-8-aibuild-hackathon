import type { ServiceResponse } from "@/services/utils";
import { toolError, toolOk, type ToolResult } from "./registry";

/** Maps a backend `ServiceResponse` to a tool `ToolResult`. */
export function fromService<T>(
  res: ServiceResponse<T>,
  errorCode = "SERVICE_ERROR",
): ToolResult<T> {
  if (res.error !== null) return toolError(errorCode, res.error);
  return toolOk(res.data as T);
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
