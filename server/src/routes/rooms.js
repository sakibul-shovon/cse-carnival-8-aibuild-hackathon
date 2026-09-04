import express from 'express';
import { db } from '../db/client.js';

const router = express.Router();

// GET /api/rooms
router.get('/', async (req, res, next) => {
  try {
    const { type, min_capacity, equipment, date, start_time, end_time, status } = req.query;
    const rooms = await db.rooms.getAll({
      type,
      min_capacity,
      equipment,
      date,
      start_time,
      end_time,
      status
    });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const room = await db.rooms.getById(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'not_found', message: `Room '${req.params.id}' not found` });
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms
router.post('/', async (req, res, next) => {
  try {
    const { room_number, type, capacity, equipment, floor, status } = req.body;
    if (!room_number || !type || capacity === undefined) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: room_number, type, capacity'
      });
    }

    const id = req.body.id || `room-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const created = await db.rooms.create({
      id,
      room_number,
      type,
      capacity: Number(capacity),
      equipment: Array.isArray(equipment) ? equipment : (equipment ? [equipment] : []),
      floor: floor !== undefined ? Number(floor) : null,
      status: status || 'available'
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.rooms.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Room '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.rooms.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'not_found', message: `Room '${req.params.id}' not found` });
    }
    res.json({ success: true, message: `Room '${req.params.id}' deleted` });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms/:id/book
router.post('/:id/book', async (req, res, next) => {
  try {
    const { booked_by, date, start_time, end_time, purpose } = req.body;
    if (!booked_by || !date || !start_time || !end_time) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: booked_by, date, start_time, end_time'
      });
    }

    const booking = await db.rooms.addBooking(req.params.id, {
      booked_by,
      date,
      start_time,
      end_time,
      purpose
    });

    res.status(201).json({
      success: true,
      message: `Room successfully booked for ${booked_by} on ${date} (${start_time} - ${end_time})`,
      booking
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id/bookings/:bookingId
router.delete('/:id/bookings/:bookingId', async (req, res, next) => {
  try {
    const success = await db.rooms.deleteBooking(req.params.id, req.params.bookingId);
    if (!success) {
      return res.status(404).json({
        error: 'booking_not_found',
        message: `Booking '${req.params.bookingId}' not found for room '${req.params.id}'`
      });
    }
    res.json({ success: true, message: `Booking '${req.params.bookingId}' cancelled` });
  } catch (err) {
    next(err);
  }
});

export default router;
