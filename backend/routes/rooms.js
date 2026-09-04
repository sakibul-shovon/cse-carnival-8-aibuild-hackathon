const express = require('express');
const router = express.Router();
const db = require('../db');
const checkRole = require('../middleware/checkRole');

// GET all rooms
router.get('/', checkRole(['teacher','student','admin']), (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms').all();
  rooms.forEach(r => {
    r.equipment = r.equipment ? JSON.parse(r.equipment) : [];
    r.bookings = r.bookings ? JSON.parse(r.bookings) : [];
  });
  res.json(rooms);
});

// POST new room
router.post('/', checkRole(['admin']), (req, res) => {
  const { id, room_number, type, capacity, equipment, floor, status } = req.body;
  const eq = JSON.stringify(equipment || []);
  const bookings = JSON.stringify([]);
  db.prepare(
    `INSERT INTO rooms (id, room_number, type, capacity, equipment, floor, status, bookings)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(id, room_number, type, capacity, eq, floor, status || 'available', bookings);
  res.json({ success: true });
});

// PUT update room
router.put('/:id', checkRole(['admin']), (req, res) => {
  const { room_number, type, capacity, equipment, floor, status } = req.body;
  const eq = JSON.stringify(equipment || []);
  db.prepare(
    `UPDATE rooms SET room_number=?, type=?, capacity=?, equipment=?, floor=?, status=?
     WHERE id=?`
  ).run(room_number, type, capacity, eq, floor, status, req.params.id);
  res.json({ success: true });
});

// DELETE room
router.delete('/:id', checkRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM rooms WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// BOOK room – separate endpoint, also used by agent
router.post('/:id/book', checkRole(['student','teacher','admin']), (req, res) => {
  const { date, start_time, end_time, booked_by, purpose } = req.body;
  if (!date || !start_time || !end_time || !booked_by) {
    return res.status(400).json({ error: 'date, start_time, end_time, booked_by required' });
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const bookings = room.bookings ? JSON.parse(room.bookings) : [];

  // check conflict
  const conflict = bookings.some(b =>
    b.date === date &&
    ((start_time >= b.start_time && start_time < b.end_time) ||
     (end_time > b.start_time && end_time <= b.end_time) ||
     (start_time <= b.start_time && end_time >= b.end_time))
  );
  if (conflict) return res.status(409).json({ error: 'Room already booked at that time' });

  const newBooking = {
    booking_id: 'bk-' + Date.now(),
    booked_by,
    date,
    start_time,
    end_time,
    purpose: purpose || ''
  };
  bookings.push(newBooking);
  db.prepare('UPDATE rooms SET bookings=? WHERE id=?').run(JSON.stringify(bookings), req.params.id);
  res.json(newBooking);
});

module.exports = router;