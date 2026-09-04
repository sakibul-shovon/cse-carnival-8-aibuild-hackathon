const express = require('express');
const router = express.Router();
const db = require('../db');
const checkRole = require('../middleware/checkRole');

// GET all events
router.get('/', checkRole(['teacher','student','admin']), (req, res) => {
  const events = db.prepare('SELECT * FROM events').all();
  events.forEach(e => {
    e.registrations = e.registrations ? JSON.parse(e.registrations) : [];
  });
  res.json(events);
});

// POST new event
router.post('/', checkRole(['admin']), (req, res) => {
  const { id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity } = req.body;
  const registrations = JSON.stringify([]);
  db.prepare(
    `INSERT INTO events
     (id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registered, registrations, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?)`
  ).run(id, name, description, date, start_time, end_time, end_date, venue, organizer, capacity, registrations, 'upcoming');
  res.json({ success: true });
});

// PUT update event
router.put('/:id', checkRole(['admin']), (req, res) => {
  const { name, description, date, start_time, end_time, end_date, venue, organizer, capacity, status } = req.body;
  db.prepare(
    `UPDATE events SET name=?, description=?, date=?, start_time=?, end_time=?, end_date=?, venue=?, organizer=?, capacity=?, status=?
     WHERE id=?`
  ).run(name, description, date, start_time, end_time, end_date, venue, organizer, capacity, status, req.params.id);
  res.json({ success: true });
});

// DELETE event
router.delete('/:id', checkRole(['admin']), (req, res) => {
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// REGISTER for event
router.post('/:id/register', checkRole(['student','teacher','admin']), (req, res) => {
  const { student_id, name } = req.body;
  if (!student_id || !name) return res.status(400).json({ error: 'student_id and name required' });

  const event = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const registrations = event.registrations ? JSON.parse(event.registrations) : [];

  if (registrations.some(r => r.student_id === student_id)) {
    return res.status(409).json({ error: 'Already registered' });
  }
  if (registrations.length >= event.capacity) {
    return res.status(409).json({ error: 'Event full' });
  }

  registrations.push({ student_id, name });
  const newCount = registrations.length;
  db.prepare('UPDATE events SET registrations=?, registered=? WHERE id=?')
    .run(JSON.stringify(registrations), newCount, req.params.id);
  res.json({ success: true });
});

module.exports = router;