import type { AgentReply, Announcement, ApiResponse, Assignment, CampusEvent, Notification, Room, Schedule } from "../types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store"
  });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    throw new ApiClientError(payload.message || "Request failed", response.status, payload.error?.code);
  }
  return payload.data;
}

function queryString(values: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const api = {
  getSchedules: (params: { day?: string; userId?: string } = {}) => request<Schedule[]>(`/schedules${queryString(params)}`),
  getRooms: () => request<Room[]>("/rooms"),
  getEvents: (params: { from?: string; to?: string } = {}) => request<CampusEvent[]>(`/events${queryString(params)}`),
  getAssignments: (params: { userId?: string; dueBefore?: string } = {}) => request<Assignment[]>(`/assignments${queryString(params)}`),
  getAnnouncements: (params: { activeOnly?: boolean } = {}) => request<Announcement[]>(`/announcements${queryString(params)}`),
  getNotifications: (params: { status?: Notification["status"]; limit?: number } = {}) => request<Notification[]>(`/notifications${queryString(params)}`),
  markNotificationRead: (id: string) => request<Notification>(`/notifications/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "READ" })
  }),
  sendMessage: (message: string, sessionId?: string) => request<AgentReply>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, sessionId })
  })
};
