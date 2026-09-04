import type { DashboardData } from "../types";

const EMPTY_DASHBOARD: DashboardData = {
  schedules: [],
  rooms: [],
  events: [],
  announcements: [],
  assignments: [],
};

/**
 * Signals the backend service/API is not implemented yet (Tasks 1–4/17).
 * Callers treat this as an empty (not error) state so the dashboard can render
 * honest "not connected yet" messaging instead of fake data.
 */
export class BackendNotReadyError extends Error {
  constructor() {
    super("Campus data backend is not connected yet.");
    this.name = "BackendNotReadyError";
  }
}

/**
 * Fetches the full dashboard dataset from the live backend.
 *
 * The backend API (Supabase-backed) is implemented in Tasks 2–4 and wired up in
 * Task 17. Until `/api/dashboard` exists, a 404 is returned and surfaced as
 * `BackendNotReadyError` so the UI shows empty states. Any other failure is a
 * real error and is re-thrown for the error state. No seed/JSON data is used at
 * runtime — Supabase remains the single source of truth.
 */
export async function fetchDashboardData(
  signal?: AbortSignal
): Promise<DashboardData> {
  let res: Response;
  try {
    res = await fetch("/api/dashboard", {
      cache: "no-store",
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    throw new Error("Unable to reach the campus data service.");
  }

  if (res.status === 404) {
    throw new BackendNotReadyError();
  }

  if (!res.ok) {
    throw new Error(`Campus data service responded with ${res.status}.`);
  }

  const data = (await res.json()) as Partial<DashboardData>;
  return {
    ...EMPTY_DASHBOARD,
    ...data,
  };
}
