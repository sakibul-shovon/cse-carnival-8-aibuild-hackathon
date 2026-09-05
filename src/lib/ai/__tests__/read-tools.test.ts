import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampusNow } from "@/types/ai";
import type { ToolContext } from "../tools/registry";

const getSchedules = vi.fn();
const getAssignments = vi.fn();
const getAnnouncements = vi.fn();
const getEvents = vi.fn();
const getAvailableRooms = vi.fn();

vi.mock("@/services/schedules", () => ({ getSchedules: () => getSchedules() }));
vi.mock("@/services/assignments", () => ({ getAssignments: () => getAssignments() }));
vi.mock("@/services/announcements", () => ({ getAnnouncements: () => getAnnouncements() }));
vi.mock("@/services/events", () => ({ getEvents: () => getEvents() }));
vi.mock("@/services/room_bookings", () => ({ getAvailableRooms: (i: unknown) => getAvailableRooms(i) }));

const { getScheduleTool } = await import("../tools/get-schedule");
const { getNextClassTool } = await import("../tools/get-next-class");
const { getAssignmentsTool } = await import("../tools/get-assignments");
const { getAnnouncementsTool } = await import("../tools/get-announcements");
const { getEventsTool } = await import("../tools/get-events");
const { checkRoomAvailabilityTool } = await import("../tools/check-room-availability");

const NOW: CampusNow = {
  date: "2026-09-04",
  time: "10:30",
  weekday: "Friday",
  timezone: "Asia/Dhaka",
  timestamp: "2026-09-04T04:30:00.000Z",
  weekStart: "2026-08-30",
  weekEnd: "2026-09-03",
};
const ctx: ToolContext = { now: NOW };
const ok = <T>(data: T) => ({ data, error: null });
const fail = (error: string) => ({ data: null, error });

// Test helpers to read data off a ToolResult<unknown>.
type AnyResult = { ok: boolean; data?: unknown };
const rows = (r: AnyResult) => (r as { data: Array<{ id: string; day?: string }> }).data;
const ids = (r: AnyResult) => rows(r).map((x) => x.id);

const sched = (over: Partial<Record<string, string>> = {}) => ({
  id: "sch", course: "CSE 4113", title: "PRML", day: "Sunday",
  start_time: "13:00", end_time: "13:50", room: "7A07", instructor: "X", section: "B", ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("get_schedule", () => {
  it("returns all classes when no day given", async () => {
    getSchedules.mockResolvedValue(ok([sched(), sched({ day: "Monday" })]));
    const r = await getScheduleTool.execute({}, ctx);
    expect(rows(r)).toHaveLength(2);
  });
  it("filters by day", async () => {
    getSchedules.mockResolvedValue(ok([sched({ day: "Sunday" }), sched({ day: "Monday" })]));
    const r = await getScheduleTool.execute({ day: "Monday" }, ctx);
    expect(rows(r)).toHaveLength(1);
    expect(rows(r)[0].day).toBe("Monday");
  });
  it("maps service errors to tool errors", async () => {
    getSchedules.mockResolvedValue(fail("db down"));
    const r = await getScheduleTool.execute({}, ctx);
    expect(r).toMatchObject({ ok: false, error: { message: "db down" } });
  });
});

describe("get_next_class", () => {
  it("picks the next class later the same day", async () => {
    getSchedules.mockResolvedValue(ok([
      sched({ id: "a", day: "Sunday", start_time: "09:00" }),
      sched({ id: "b", day: "Sunday", start_time: "13:00" }),
    ]));
    const r = await getNextClassTool.execute({ current_day: "Sunday", current_time: "10:00" }, ctx);
    expect(r.ok && r.data).toMatchObject({ is_today: true, next_class: { id: "b" } });
  });
  it("rolls to a later day when none remain today", async () => {
    getSchedules.mockResolvedValue(ok([
      sched({ id: "a", day: "Sunday", start_time: "09:00" }),
      sched({ id: "c", day: "Tuesday", start_time: "08:00" }),
    ]));
    const r = await getNextClassTool.execute({ current_day: "Sunday", current_time: "10:00" }, ctx);
    expect(r.ok && r.data).toMatchObject({ is_today: false, next_class: { id: "c" } });
  });
  it("wraps to next week when no classes remain later this week", async () => {
    getSchedules.mockResolvedValue(ok([sched({ id: "s", day: "Sunday", start_time: "09:00" })]));
    const r = await getNextClassTool.execute({ current_day: "Thursday", current_time: "23:00" }, ctx);
    expect(r.ok && r.data).toMatchObject({ is_today: false, next_class: { id: "s" } });
  });
  it("returns null when there are no classes at all", async () => {
    getSchedules.mockResolvedValue(ok([]));
    const r = await getNextClassTool.execute({ current_day: "Thursday", current_time: "23:00" }, ctx);
    expect(r.ok && r.data).toMatchObject({ next_class: null });
  });
});

describe("get_assignments", () => {
  const a = (o = {}) => ({
    id: "x", course: "CSE 4113", course_title: "PRML", title: "T", description: "",
    assigned_date: "2026-08-28", deadline: "2026-09-09", submission_platform: "GC",
    status: "pending", marks: 10, ...o,
  });
  it("filters by course substring, status, and due_before", async () => {
    getAssignments.mockResolvedValue(ok([
      a({ id: "1", course: "CSE 4113", status: "pending", deadline: "2026-09-09" }),
      a({ id: "2", course: "CSE 4130", status: "submitted", deadline: "2026-09-10" }),
      a({ id: "3", course: "CSE 4113", status: "pending", deadline: "2026-09-20" }),
    ]));
    const byCourse = await getAssignmentsTool.execute({ course: "4113" }, ctx);
    expect(ids(byCourse)).toEqual(["1", "3"]);
    const byStatus = await getAssignmentsTool.execute({ status: "submitted" }, ctx);
    expect(ids(byStatus)).toEqual(["2"]);
    const byDue = await getAssignmentsTool.execute({ due_before: "2026-09-10" }, ctx);
    expect(ids(byDue)).toEqual(["1", "2"]);
  });
});

describe("get_announcements", () => {
  const ann = (o = {}) => ({
    id: "x", title: "T", body: "B", date: "2026-09-01", priority: "high",
    posted_by: "Dept", expires: "2026-09-10", ...o,
  });
  it("filters by priority and active_only against ctx.now", async () => {
    getAnnouncements.mockResolvedValue(ok([
      ann({ id: "1", priority: "high", expires: "2026-09-10" }),
      ann({ id: "2", priority: "low", expires: "2026-09-10" }),
      ann({ id: "3", priority: "high", expires: "2026-09-01" }), // expired vs 09-04
    ]));
    const high = await getAnnouncementsTool.execute({ priority: "high" }, ctx);
    expect(ids(high)).toEqual(["1", "3"]);
    const active = await getAnnouncementsTool.execute({ active_only: true }, ctx);
    expect(ids(active)).toEqual(["1", "2"]);
  });
});

describe("get_events", () => {
  const ev = (o = {}) => ({
    id: "x", name: "E", description: "", date: "2026-09-08", start_time: "14:00",
    end_time: "16:00", end_date: "2026-09-08", venue: "7C05", organizer: "CSE",
    capacity: 70, registered: 10, status: "upcoming", ...o,
  });
  it("filters by date across multi-day spans", async () => {
    getEvents.mockResolvedValue(ok([
      ev({ id: "1", date: "2026-09-10", end_date: "2026-09-11" }),
      ev({ id: "2", date: "2026-09-08", end_date: "2026-09-08" }),
    ]));
    const r = await getEventsTool.execute({ date: "2026-09-11" }, ctx);
    expect(ids(r)).toEqual(["1"]);
  });
  it("upcoming_only drops cancelled/completed/past", async () => {
    getEvents.mockResolvedValue(ok([
      ev({ id: "1", status: "upcoming", end_date: "2026-09-08" }),
      ev({ id: "2", status: "cancelled", end_date: "2026-09-08" }),
      ev({ id: "3", status: "completed", end_date: "2026-09-08" }),
      ev({ id: "4", status: "upcoming", end_date: "2026-09-01" }),
    ]));
    const r = await getEventsTool.execute({ upcoming_only: true }, ctx);
    expect(ids(r)).toEqual(["1"]);
  });
});

describe("check_room_availability", () => {
  it("rejects inverted time windows before hitting the backend", async () => {
    const r = await checkRoomAvailabilityTool.execute(
      { date: "2026-09-05", start_time: "16:00", end_time: "14:00" }, ctx,
    );
    expect(r).toMatchObject({ ok: false, error: { code: "INVALID_TIME" } });
    expect(getAvailableRooms).not.toHaveBeenCalled();
  });
  it("passes params through and returns matching rooms", async () => {
    getAvailableRooms.mockResolvedValue(ok([{ id: "room-001", room_number: "7A01" }]));
    const params = { date: "2026-09-05", start_time: "14:00", end_time: "16:00", min_capacity: 5, required_equipment: ["projector"] };
    const r = await checkRoomAvailabilityTool.execute(params, ctx);
    expect(getAvailableRooms).toHaveBeenCalledWith(params);
    expect(rows(r)).toHaveLength(1);
  });
  it("maps backend errors", async () => {
    getAvailableRooms.mockResolvedValue(fail("Start time must be before end time"));
    const r = await checkRoomAvailabilityTool.execute(
      { date: "2026-09-05", start_time: "14:00", end_time: "16:00" }, ctx,
    );
    expect(r).toMatchObject({ ok: false });
  });
});
