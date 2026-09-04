import type { AgentResponse, ListResponse, ResourceMap, ResourceName, Room, User } from './types'

const baseUrl = import.meta.env.VITE_API_URL ?? '/api/v1'
export class ApiError extends Error { constructor(public code: string, message: string, public status: number, public details: Record<string, unknown> = {}) { super(message) } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error?.code ?? 'REQUEST_FAILED', data.error?.message ?? 'Something went wrong.', response.status, data.error?.details)
  return data as T
}
export const api = {
  me: () => request<User>('/users/me'),
  list: <R extends ResourceName>(resource: R) => request<ListResponse<ResourceMap[R]>>(`/${resource}`),
  create: <R extends ResourceName>(resource: R, body: Omit<ResourceMap[R], 'id'>) => request<ResourceMap[R]>(`/${resource}`, { method: 'POST', body: JSON.stringify(body) }),
  update: <R extends ResourceName>(resource: R, id: string, body: Partial<ResourceMap[R]>) => request<ResourceMap[R]>(`/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (resource: ResourceName, id: string) => request<{ id: string; deleted: true }>(`/${resource}/${id}`, { method: 'DELETE' }),
  availability: (query: URLSearchParams) => request<ListResponse<Room>>(`/rooms/availability?${query}`),
  book: (roomId: string, body: { date: string; start_time: string; end_time: string; purpose: string }) => request(`/rooms/${roomId}/bookings`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  cancelBooking: (roomId: string, bookingId: string) => request(`/rooms/${roomId}/bookings/${bookingId}`, { method: 'DELETE' }),
  register: (eventId: string) => request(`/events/${eventId}/registrations`, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: '{}' }),
  cancelRegistration: (eventId: string, studentId: string) => request(`/events/${eventId}/registrations/${studentId}`, { method: 'DELETE' }),
  chat: (message: string, conversation_id: string | null) => request<AgentResponse>('/agent/messages', { method: 'POST', body: JSON.stringify({ message, conversation_id, timezone: 'Asia/Dhaka' }) }),
}
