import type { CampusNow } from "@/types/ai";

const WEEKDAYS: CampusNow["weekday"][] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DEFAULT_TIMEZONE = "Asia/Dhaka";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function partsInZone(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday as CampusNow["weekday"],
  };
}

function shiftDate(year: number, month: number, day: number, deltaDays: number): string {
  const d = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/**
 * Current campus date/time resolved in the campus timezone.
 * The agent must never hardcode "today"; this is injected per request.
 */
export function getCampusNow(
  timeZone: string = process.env.CAMPUS_TIMEZONE || DEFAULT_TIMEZONE,
  at: Date = new Date(),
): CampusNow {
  const p = partsInZone(at, timeZone);
  const weekdayIndex = WEEKDAYS.indexOf(p.weekday);
  // University week runs Sunday–Thursday; Fri/Sat map to the week just ended.
  const weekStart = shiftDate(p.year, p.month, p.day, -weekdayIndex);
  const weekEnd = shiftDate(p.year, p.month, p.day, 4 - weekdayIndex);

  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
    weekday: p.weekday,
    timezone: timeZone,
    timestamp: at.toISOString(),
    weekStart,
    weekEnd,
  };
}

/** Adds `delta` days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export interface AcademicWeek {
  start: string;
  end: string;
  days: { weekday: string; date: string }[];
}

export interface RelativeDates {
  today: string;
  tomorrow: string;
  dayAfterTomorrow: string;
  yesterday: string;
  thisWeek: AcademicWeek;
  nextWeek: AcademicWeek;
}

function academicWeekFromSunday(sunday: string): AcademicWeek {
  const days = [0, 1, 2, 3, 4].map((o) => ({ weekday: WEEKDAYS[o], date: addDays(sunday, o) }));
  return { start: days[0].date, end: days[4].date, days };
}

/**
 * Resolves relative dates deterministically so the model uses exact dates
 * instead of doing error-prone date math. The academic week is Sunday–Thursday;
 * on Friday/Saturday "this week" rolls forward to the upcoming Sunday.
 */
export function resolveRelativeDates(now: CampusNow): RelativeDates {
  const idx = WEEKDAYS.indexOf(now.weekday); // 0 = Sunday … 6 = Saturday
  const daysToThisSunday = idx <= 4 ? -idx : 7 - idx;
  const thisSunday = addDays(now.date, daysToThisSunday);
  return {
    today: now.date,
    tomorrow: addDays(now.date, 1),
    dayAfterTomorrow: addDays(now.date, 2),
    yesterday: addDays(now.date, -1),
    thisWeek: academicWeekFromSunday(thisSunday),
    nextWeek: academicWeekFromSunday(addDays(thisSunday, 7)),
  };
}
