import { getRooms } from "@/services/rooms";
import { getEvents } from "@/services/events";
import type { Event, Room } from "@/types/database";

type Resolved<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };

/** Finds a room by its human room number (e.g. "7A02"), case-insensitive. */
export async function resolveRoomByNumber(roomNumber: string): Promise<Resolved<Room>> {
  const res = await getRooms();
  if (res.error !== null) return { ok: false, error: { code: "SERVICE_ERROR", message: res.error } };
  const target = roomNumber.trim().toLowerCase();
  const room = (res.data ?? []).find((r) => r.room_number.toLowerCase() === target);
  if (!room) return { ok: false, error: { code: "ROOM_NOT_FOUND", message: `No room "${roomNumber}" exists.` } };
  return { ok: true, value: room };
}

/**
 * Resolves an event from a name or id. Matches id exactly, otherwise by
 * case-insensitive name substring. Reports ambiguity so the agent can ask.
 */
export async function resolveEvent(nameOrId: string): Promise<Resolved<Event>> {
  const res = await getEvents();
  if (res.error !== null) return { ok: false, error: { code: "SERVICE_ERROR", message: res.error } };
  const events = res.data ?? [];
  const q = nameOrId.trim().toLowerCase();

  const byId = events.find((e) => e.id.toLowerCase() === q);
  if (byId) return { ok: true, value: byId };

  const exactName = events.filter((e) => e.name.toLowerCase() === q);
  const matches = exactName.length > 0 ? exactName : events.filter((e) => e.name.toLowerCase().includes(q));

  if (matches.length === 0) {
    return { ok: false, error: { code: "EVENT_NOT_FOUND", message: `No event matching "${nameOrId}" was found.` } };
  }
  if (matches.length > 1) {
    const names = matches.slice(0, 5).map((e) => e.name).join("; ");
    return { ok: false, error: { code: "EVENT_AMBIGUOUS", message: `Multiple events match "${nameOrId}": ${names}. Ask which one.` } };
  }
  return { ok: true, value: matches[0] };
}
