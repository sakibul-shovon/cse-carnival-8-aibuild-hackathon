import * as campus from '../services/campusService.js'

const ok = (response, data, status = 200) => response.status(status).json({ success: true, data })
const run = (handler, status = 200) => async (request, response, next) => { try { const data = await handler(request); ok(response, data, status) } catch (error) { next(error) } }
const body = (request) => request.body ?? {}

export const schedules = {
  list: run((request) => campus.listSchedules(request.query)), get: run((request) => campus.getSchedule(request.params.id)),
  create: run((request) => campus.createSchedule(body(request)), 201), update: run((request) => campus.updateSchedule(request.params.id, body(request))), delete: run(async (request) => { await campus.deleteSchedule(request.params.id); return null }),
}
export const rooms = {
  list: run((request) => campus.listRooms(request.query)), get: run((request) => campus.getRoom(request.params.id)), available: run((request) => campus.findAvailableRooms({ date: request.query.date, start_time: request.query.start_time, end_time: request.query.end_time, capacity: request.query.capacity, equipment: request.query.equipment ? String(request.query.equipment).split(',') : [] })),
  bookings: run((request) => campus.listBookings(request.params.id)), book: run((request) => campus.bookRoom({ ...body(request), room_id: request.params.id })), cancelBooking: run(async (request) => { await campus.cancelBooking(request.params.bookingId); return null }),
}
export const events = {
  list: run((request) => campus.listEvents(request.query)), get: run((request) => campus.getEvent(request.params.id)), create: run((request) => campus.createEvent(body(request)), 201), update: run((request) => campus.updateEvent(request.params.id, body(request))), delete: run(async (request) => { await campus.deleteEvent(request.params.id); return null }),
  register: run((request) => campus.registerEvent(request.params.id, body(request)), 201), cancelRegistration: run(async (request) => { await campus.cancelEventRegistration(request.params.id, request.params.studentId); return null }), registrations: run((request) => campus.eventRegistrations(request.params.id)),
}
export const announcements = {
  list: run((request) => campus.listAnnouncements(request.query)), get: run((request) => campus.getAnnouncement(request.params.id)), create: run((request) => campus.createAnnouncement(body(request)), 201), update: run((request) => campus.updateAnnouncement(request.params.id, body(request))), delete: run(async (request) => { await campus.deleteAnnouncement(request.params.id); return null }),
}
export const assignments = {
  list: run((request) => campus.listAssignments(request.query)), get: run((request) => campus.getAssignment(request.params.id)), create: run((request) => campus.createAssignment(body(request)), 201), update: run((request) => campus.updateAssignment(request.params.id, body(request))), delete: run(async (request) => { await campus.deleteAssignment(request.params.id); return null }),
}
