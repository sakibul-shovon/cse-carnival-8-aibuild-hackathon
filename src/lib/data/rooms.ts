import type { Room, RoomBooking, RoomStatus, RoomType } from "@/types/database";

export type RoomInput = {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  floor: number;
  status: RoomStatus;
};
export type RoomUpdate = Partial<Omit<RoomInput, "id">>;

export type BookingInput = {
  booking_id: string;
  room_id: string;
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
};

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through
  }
  return `Request failed with status ${res.status}.`;
}

// ─── Rooms ──────────────────────────────────────────────────────────────────

export async function fetchRooms(signal?: AbortSignal): Promise<Room[]> {
  const res = await fetch("/api/rooms", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Room[] }).data ?? [];
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Room }).data;
}

export async function updateRoom(id: string, input: RoomUpdate): Promise<Room> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Room }).data;
}

export async function deleteRoom(id: string): Promise<void> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function fetchBookings(signal?: AbortSignal): Promise<RoomBooking[]> {
  const res = await fetch("/api/bookings", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: RoomBooking[] }).data ?? [];
}

export async function fetchRoomBookings(
  roomId: string,
  signal?: AbortSignal
): Promise<RoomBooking[]> {
  const res = await fetch(
    `/api/rooms/${encodeURIComponent(roomId)}/bookings`,
    { cache: "no-store", signal }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: RoomBooking[] }).data ?? [];
}

// The backend is the sole authority for booking validation and conflicts.
export async function createBooking(
  input: Omit<BookingInput, "booking_id"> & { booking_id?: string }
): Promise<RoomBooking> {
  const booking_id =
    input.booking_id ?? `bk-${crypto.randomUUID().slice(0, 12)}`;
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, booking_id }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: RoomBooking }).data;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const res = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
