import type { Event, EventRegistration, EventStatus } from "@/types/database";

export type EventInput = {
  id: string;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  status: EventStatus;
};
export type EventUpdate = Partial<Omit<EventInput, "id">>;

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through
  }
  return `Request failed with status ${res.status}.`;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function fetchEvents(signal?: AbortSignal): Promise<Event[]> {
  const res = await fetch("/api/events", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Event[] }).data ?? [];
}

export async function createEvent(input: EventInput): Promise<Event> {
  const res = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Event }).data;
}

export async function updateEvent(id: string, input: EventUpdate): Promise<Event> {
  const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: Event }).data;
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`/api/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

// ─── Registrations ───────────────────────────────────────────────────────────

export async function fetchEventRegistrations(
  eventId: string,
  signal?: AbortSignal
): Promise<EventRegistration[]> {
  const res = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/registrations`,
    { cache: "no-store", signal }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: EventRegistration[] }).data ?? [];
}

// The backend owns registration rules (capacity/full, cancelled, completed, duplicates).
export async function registerForEvent(
  eventId: string,
  input: { student_id: string; name: string }
): Promise<EventRegistration> {
  const res = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/registrations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { data: EventRegistration }).data;
}

export async function cancelRegistration(
  eventId: string,
  studentId: string
): Promise<void> {
  const res = await fetch(
    `/api/events/${encodeURIComponent(eventId)}/registrations/${encodeURIComponent(studentId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(await parseError(res));
}
