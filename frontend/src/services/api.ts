import axios from 'axios';
import type {
  Schedule,
  Room,
  Event,
  Announcement,
  Assignment,
  RoomBooking,
  EventRegistration,
} from '../types/index';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== SCHEDULES ==========
export const scheduleAPI = {
  getAll: () => api.get<Schedule[]>('/schedules'),
  getOne: (id: number) => api.get<Schedule>(`/schedules/${id}`),
  create: (data: Omit<Schedule, 'id'>) => api.post<Schedule>('/schedules', data),
  update: (id: number, data: Partial<Schedule>) => api.put<Schedule>(`/schedules/${id}`, data),
  delete: (id: number) => api.delete(`/schedules/${id}`),
};

// ========== ROOMS ==========
export const roomAPI = {
  getAll: () => api.get<Room[]>('/rooms'),
  getOne: (id: number) => api.get<Room>(`/rooms/${id}`),
  create: (data: Omit<Room, 'id' | 'bookings'>) => api.post<Room>('/rooms', data),
  update: (id: number, data: Partial<Room>) => api.put<Room>(`/rooms/${id}`, data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
  bookRoom: (id: number, booking: Omit<RoomBooking, 'id' | 'room_id'>) =>
    api.post<RoomBooking>(`/rooms/${id}/book`, booking),
  cancelBooking: (roomId: number, bookingId: number) =>
    api.delete(`/rooms/${roomId}/bookings/${bookingId}`),
};

// ========== EVENTS ==========
export const eventAPI = {
  getAll: () => api.get<Event[]>('/events'),
  getOne: (id: number) => api.get<Event>(`/events/${id}`),
  create: (data: Omit<Event, 'id' | 'registered' | 'registrations'>) =>
    api.post<Event>('/events', data),
  update: (id: number, data: Partial<Event>) => api.put<Event>(`/events/${id}`, data),
  delete: (id: number) => api.delete(`/events/${id}`),
  registerEvent: (id: number, registration: Omit<EventRegistration, 'id' | 'event_id'>) =>
    api.post<EventRegistration>(`/events/${id}/register`, registration),
  cancelRegistration: (eventId: number, registrationId: number) =>
    api.delete(`/events/${eventId}/registrations/${registrationId}`),
};

// ========== ANNOUNCEMENTS ==========
export const announcementAPI = {
  getAll: () => api.get<Announcement[]>('/announcements'),
  getOne: (id: number) => api.get<Announcement>(`/announcements/${id}`),
  create: (data: Omit<Announcement, 'id'>) => api.post<Announcement>('/announcements', data),
  update: (id: number, data: Partial<Announcement>) =>
    api.put<Announcement>(`/announcements/${id}`, data),
  delete: (id: number) => api.delete(`/announcements/${id}`),
};

// ========== ASSIGNMENTS ==========
export const assignmentAPI = {
  getAll: () => api.get<Assignment[]>('/assignments'),
  getOne: (id: number) => api.get<Assignment>(`/assignments/${id}`),
  create: (data: Omit<Assignment, 'id'>) => api.post<Assignment>('/assignments', data),
  update: (id: number, data: Partial<Assignment>) => api.put<Assignment>(`/assignments/${id}`, data),
  delete: (id: number) => api.delete(`/assignments/${id}`),
};