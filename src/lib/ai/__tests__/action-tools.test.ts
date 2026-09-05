import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampusNow } from "@/types/ai";
import type { ToolContext } from "../tools/registry";

const getRooms = vi.fn();
const getEvents = vi.fn();
const createBooking = vi.fn();
const registerForEvent = vi.fn();
const cancelRegistration = vi.fn();

vi.mock("@/services/rooms", () => ({ getRooms: () => getRooms() }));
vi.mock("@/services/events", () => ({ getEvents: () => getEvents() }));
vi.mock("@/services/room_bookings", () => ({ createBooking: (i: unknown) => createBooking(i) }));
vi.mock("@/services/event_registrations", () => ({
  registerForEvent: (i: unknown) => registerForEvent(i),
  cancelRegistration: (i: unknown) => cancelRegistration(i),
}));

const { bookRoomTool } = await import("../tools/book-room");
const { registerForEventTool } = await import("../tools/register-for-event");
const { cancelRegistrationTool } = await import("../tools/cancel-registration");

const NOW: CampusNow = {
  date: "2026-09-04", time: "10:30", weekday: "Friday", timezone: "Asia/Dhaka",
  timestamp: "2026-09-04T04:30:00.000Z", weekStart: "2026-08-30", weekEnd: "2026-09-03",
};
const ctx: ToolContext = { now: NOW };
const ok = <T>(data: T) => ({ data, error: null });
const fail = (error: string) => ({ data: null, error });
const asErr = (r: { ok: boolean }) => (r as unknown as { error: { code: string; message: string } }).error;
const asData = (r: { ok: boolean }) => (r as unknown as { data: Record<string, unknown> }).data;

const rooms = [
  { id: "room-002", room_number: "7A02", type: "classroom", capacity: 40, equipment: ["projector"], floor: 7, status: "available" },
];
const events = [
  { id: "evt-002", name: "Guest Lecture: Deep Learning in Medical Imaging", status: "upcoming", capacity: 70, registered: 62 },
  { id: "evt-006", name: "Workshop: Git & GitHub for Beginners", status: "full", capacity: 30, registered: 30 },
];

beforeEach(() => vi.clearAllMocks());

describe("book_room", () => {
  it("resolves room_number to id and books", async () => {
    getRooms.mockResolvedValue(ok(rooms));
    createBooking.mockResolvedValue(ok({ booking_id: "bk-x", room_id: "room-002", date: "2026-09-05" }));
    const r = await bookRoomTool.execute(
      { room_number: "7a02", date: "2026-09-05", start_time: "15:00", end_time: "17:00", purpose: "study", booked_by: "Sakibul" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ room_id: "room-002", start_time: "15:00" }));
    expect(createBooking.mock.calls[0][0].booking_id).toMatch(/^bk-/);
    expect(asData(r).room_number).toBe("7A02");
  });

  it("rejects a nonexistent room without calling the booking service", async () => {
    getRooms.mockResolvedValue(ok(rooms));
    const r = await bookRoomTool.execute(
      { room_number: "9Z99", date: "2026-09-05", start_time: "15:00", end_time: "17:00", purpose: "x", booked_by: "y" },
      ctx,
    );
    expect(asErr(r).code).toBe("ROOM_NOT_FOUND");
    expect(createBooking).not.toHaveBeenCalled();
  });

  it("rejects inverted times before resolving the room", async () => {
    const r = await bookRoomTool.execute(
      { room_number: "7A02", date: "2026-09-05", start_time: "17:00", end_time: "15:00", purpose: "x", booked_by: "y" },
      ctx,
    );
    expect(asErr(r).code).toBe("INVALID_TIME");
    expect(getRooms).not.toHaveBeenCalled();
  });

  it("passes backend conflict errors through as failures", async () => {
    getRooms.mockResolvedValue(ok(rooms));
    createBooking.mockResolvedValue(fail("Room already booked: the requested time slot overlaps an existing booking"));
    const r = await bookRoomTool.execute(
      { room_number: "7A02", date: "2026-09-05", start_time: "15:00", end_time: "17:00", purpose: "x", booked_by: "y" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(asErr(r).message).toMatch(/already booked/);
  });
});

describe("register_for_event", () => {
  it("resolves an event by name substring and registers", async () => {
    getEvents.mockResolvedValue(ok(events));
    registerForEvent.mockResolvedValue(ok({ id: "reg-1", event_id: "evt-002", student_id: "20-40532", name: "Sakibul" }));
    const r = await registerForEventTool.execute(
      { event_name_or_id: "deep learning", student_name: "Sakibul", student_id: "20-40532" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(registerForEvent).toHaveBeenCalledWith({ event_id: "evt-002", student_id: "20-40532", name: "Sakibul" });
    expect(asData(r).event_name).toMatch(/Deep Learning/);
  });

  it("returns EVENT_NOT_FOUND for no match", async () => {
    getEvents.mockResolvedValue(ok(events));
    const r = await registerForEventTool.execute(
      { event_name_or_id: "quantum picnic", student_name: "A", student_id: "1" },
      ctx,
    );
    expect(asErr(r).code).toBe("EVENT_NOT_FOUND");
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("flags ambiguous name matches", async () => {
    getEvents.mockResolvedValue(ok([
      { id: "e1", name: "AI Workshop Beginner", status: "upcoming", capacity: 30, registered: 1 },
      { id: "e2", name: "AI Workshop Advanced", status: "upcoming", capacity: 30, registered: 1 },
    ]));
    const r = await registerForEventTool.execute(
      { event_name_or_id: "ai workshop", student_name: "A", student_id: "1" },
      ctx,
    );
    expect(asErr(r).code).toBe("EVENT_AMBIGUOUS");
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("relays a full-event rejection from the backend", async () => {
    getEvents.mockResolvedValue(ok(events));
    registerForEvent.mockResolvedValue(fail("Event full: no registration slots available"));
    const r = await registerForEventTool.execute(
      { event_name_or_id: "evt-006", student_name: "A", student_id: "1" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(asErr(r).message).toMatch(/full/);
  });
});

describe("cancel_registration", () => {
  it("resolves the event and cancels", async () => {
    getEvents.mockResolvedValue(ok(events));
    cancelRegistration.mockResolvedValue(ok(null));
    const r = await cancelRegistrationTool.execute(
      { event_name_or_id: "evt-002", student_id: "20-40532" },
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(cancelRegistration).toHaveBeenCalledWith({ event_id: "evt-002", student_id: "20-40532" });
    expect(asData(r)).toMatchObject({ cancelled: true });
  });

  it("relays a not-found cancellation from the backend", async () => {
    getEvents.mockResolvedValue(ok(events));
    cancelRegistration.mockResolvedValue(fail("Registration not found: no matching registration exists"));
    const r = await cancelRegistrationTool.execute(
      { event_name_or_id: "evt-002", student_id: "99-99999" },
      ctx,
    );
    expect(r.ok).toBe(false);
    expect(asErr(r).message).toMatch(/not found/);
  });
});
