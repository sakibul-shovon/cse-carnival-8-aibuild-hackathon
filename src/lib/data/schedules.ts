import type { Schedule } from "../types";

export type ScheduleInput = {
  id: string;
  course: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
};
export type ScheduleUpdate = Partial<Omit<ScheduleInput, "id">>;

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return body.error;
  } catch {
    // fall through to generic message
  }
  return `Request failed with status ${res.status}.`;
}

export async function fetchSchedules(signal?: AbortSignal): Promise<Schedule[]> {
  const res = await fetch("/api/schedules", { cache: "no-store", signal });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: Schedule[] };
  return body.data ?? [];
}

export async function createSchedule(input: ScheduleInput): Promise<Schedule> {
  const res = await fetch("/api/schedules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: Schedule };
  return body.data;
}

export async function updateSchedule(
  id: string,
  input: ScheduleUpdate
): Promise<Schedule> {
  const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { data: Schedule };
  return body.data;
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
