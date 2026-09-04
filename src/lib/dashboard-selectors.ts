import {
  daysFromToday,
  getDayName,
  isUniversityDay,
  nowMinutes,
  timeToMinutes,
  toIsoDate,
} from "./datetime";
import type {
  Announcement,
  Assignment,
  CampusEvent,
  DashboardData,
  Room,
  Schedule,
} from "./types";

export function todaysClasses(
  schedules: Schedule[],
  now: Date = new Date()
): Schedule[] {
  const today = getDayName(now);
  if (!isUniversityDay(today)) return [];
  return [...schedules]
    .filter((s) => s.day === today)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

export function nextClass(
  schedules: Schedule[],
  now: Date = new Date()
): Schedule | null {
  const current = nowMinutes(now);
  const upcoming = todaysClasses(schedules, now).filter(
    (s) => timeToMinutes(s.start_time) >= current
  );
  return upcoming[0] ?? null;
}

export function activeAnnouncements(
  announcements: Announcement[],
  now: Date = new Date()
): Announcement[] {
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  return [...announcements]
    .filter((a) => !a.expires || daysFromToday(a.expires, now) >= 0)
    .sort((a, b) => {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      return b.date.localeCompare(a.date);
    });
}

export function upcomingEvents(
  events: CampusEvent[],
  now: Date = new Date()
): CampusEvent[] {
  return [...events]
    .filter((e) => e.status !== "cancelled" && e.status !== "completed")
    .filter((e) => daysFromToday(e.end_date || e.date, now) >= 0)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
}

export function upcomingDeadlines(
  assignments: Assignment[],
  now: Date = new Date()
): Assignment[] {
  return [...assignments]
    .filter((a) => a.status === "pending" || a.status === "late")
    .filter((a) => daysFromToday(a.deadline, now) >= -1)
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export type RoomAvailability = {
  total: number;
  availableNow: number;
  freeRooms: Room[];
};

// A room is "free now" if marked available and it has no booking overlapping the
// current time today. Overlap rule from AGENTS.md: start < end AND end > start.
export function roomAvailability(
  rooms: Room[],
  now: Date = new Date()
): RoomAvailability {
  const today = toIsoDate(now);
  const current = nowMinutes(now);

  const freeRooms = rooms.filter((room) => {
    if (room.status !== "available") return false;
    const busy = (room.bookings ?? []).some((b) => {
      if (b.date !== today) return false;
      const start = timeToMinutes(b.start_time);
      const end = timeToMinutes(b.end_time);
      return current >= start && current < end;
    });
    return !busy;
  });

  return {
    total: rooms.length,
    availableNow: freeRooms.length,
    freeRooms,
  };
}

export type DashboardStats = {
  classesToday: number;
  pendingAssignments: number;
  activeAnnouncements: number;
  upcomingEvents: number;
  roomsAvailable: number;
  roomsTotal: number;
};

export function dashboardStats(
  data: DashboardData,
  now: Date = new Date()
): DashboardStats {
  const rooms = roomAvailability(data.rooms, now);
  return {
    classesToday: todaysClasses(data.schedules, now).length,
    pendingAssignments: data.assignments.filter(
      (a) => a.status === "pending" || a.status === "late"
    ).length,
    activeAnnouncements: activeAnnouncements(data.announcements, now).length,
    upcomingEvents: upcomingEvents(data.events, now).length,
    roomsAvailable: rooms.availableNow,
    roomsTotal: rooms.total,
  };
}
