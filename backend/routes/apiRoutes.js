import { Router } from 'express'
import { announcements, assignments, events, rooms, schedules } from '../controllers/campusController.js'
import { chat } from '../controllers/aiController.js'
import healthRoutes from './healthRoutes.js'

const router = Router()
router.use('/health', healthRoutes)
const crud = (base, controller) => {
  router.get(base, controller.list); router.get(`${base}/:id`, controller.get); router.post(base, controller.create); router.put(`${base}/:id`, controller.update); router.delete(`${base}/:id`, controller.delete)
}
crud('/schedules', schedules)
router.get('/rooms/available', rooms.available)
router.get('/rooms/:id/bookings', rooms.bookings)
router.post('/rooms/:id/bookings', rooms.book)
router.get('/rooms', rooms.list)
router.get('/rooms/:id', rooms.get)
router.get('/bookings', async (_request, response, next) => { try { const { listBookings } = await import('../services/campusService.js'); response.json({ success: true, data: await listBookings() }) } catch (error) { next(error) } })
router.delete('/bookings/:bookingId', rooms.cancelBooking)
crud('/events', events)
router.post('/events/:id/register', events.register)
router.delete('/events/:id/register/:studentId', events.cancelRegistration)
router.get('/events/:id/registrations', events.registrations)
crud('/announcements', announcements)
crud('/assignments', assignments)
router.post('/ai/chat', chat)

export default router
