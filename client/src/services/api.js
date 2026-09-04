import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats').then(res => res.data),
};

export const scheduleService = {
  getAll: (params) => api.get('/schedules', { params }).then(res => res.data),
  getById: (id) => api.get(`/schedules/${id}`).then(res => res.data),
  create: (data) => api.post('/schedules', data).then(res => res.data),
  update: (id, data) => api.put(`/schedules/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/schedules/${id}`).then(res => res.data),
};

export const roomService = {
  getAll: (params) => api.get('/rooms', { params }).then(res => res.data),
  getById: (id) => api.get(`/rooms/${id}`).then(res => res.data),
  create: (data) => api.post('/rooms', data).then(res => res.data),
  update: (id, data) => api.put(`/rooms/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/rooms/${id}`).then(res => res.data),
  book: (id, data) => api.post(`/rooms/${id}/book`, data).then(res => res.data),
  cancelBooking: (id, bookingId) => api.delete(`/rooms/${id}/bookings/${bookingId}`).then(res => res.data),
};

export const eventService = {
  getAll: (params) => api.get('/events', { params }).then(res => res.data),
  getById: (id) => api.get(`/events/${id}`).then(res => res.data),
  create: (data) => api.post('/events', data).then(res => res.data),
  update: (id, data) => api.put(`/events/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/events/${id}`).then(res => res.data),
  register: (id, data) => api.post(`/events/${id}/register`, data).then(res => res.data),
  cancelRegistration: (id, data) => api.post(`/events/${id}/cancel-registration`, data).then(res => res.data),
};

export const announcementService = {
  getAll: (params) => api.get('/announcements', { params }).then(res => res.data),
  getById: (id) => api.get(`/announcements/${id}`).then(res => res.data),
  create: (data) => api.post('/announcements', data).then(res => res.data),
  update: (id, data) => api.put(`/announcements/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/announcements/${id}`).then(res => res.data),
};

export const assignmentService = {
  getAll: (params) => api.get('/assignments', { params }).then(res => res.data),
  getById: (id) => api.get(`/assignments/${id}`).then(res => res.data),
  create: (data) => api.post('/assignments', data).then(res => res.data),
  update: (id, data) => api.put(`/assignments/${id}`, data).then(res => res.data),
  delete: (id) => api.delete(`/assignments/${id}`).then(res => res.data),
};

export const agentService = {
  chat: (message, history = []) => api.post('/agent/chat', { message, history }).then(res => res.data),
};

export default api;
