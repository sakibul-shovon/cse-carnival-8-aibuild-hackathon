import express from 'express';
import { db } from '../db/client.js';

const router = express.Router();

// GET /api/events
router.get('/', async (req, res, next) => {
  try {
    const { status, after } = req.query;
    const events = await db.events.getAll({ status, after });
    res.json(events);
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id
router.get('/:id', async (req, res, next) => {
  try {
    const event = await db.events.getById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'not_found', message: `Event '${req.params.id}' not found` });
    }
    res.json(event);
  } catch (err) {
    next(err);
  }
});

// POST /api/events
router.post('/', async (req, res, next) => {
  try {
    const { name, description, date, start_time, end_time, end_date, venue, organizer, capacity } = req.body;
    if (!name || !date || !start_time || !end_time || capacity === undefined) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: name, date, start_time, end_time, capacity'
      });
    }

    const id = req.body.id || `evt-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const created = await db.events.create({
      id,
      name,
      description: description || '',
      date,
      start_time,
      end_time,
      end_date: end_date || date,
      venue: venue || '',
      organizer: organizer || '',
      capacity: Number(capacity),
      registered: req.body.registered || 0,
      status: req.body.status || 'upcoming'
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/events/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.events.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Event '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/events/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.events.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'not_found', message: `Event '${req.params.id}' not found` });
    }
    res.json({ success: true, message: `Event '${req.params.id}' deleted` });
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/register
router.post('/:id/register', async (req, res, next) => {
  try {
    const { student_id, name } = req.body;
    if (!student_id || !name) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: student_id, name'
      });
    }

    const event = await db.events.registerStudent(req.params.id, { student_id, name });
    res.status(201).json({
      success: true,
      message: `Student ${name} (${student_id}) successfully registered for '${event.name}'`,
      event
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/events/:id/registrations/:studentId
router.delete('/:id/registrations/:studentId', async (req, res, next) => {
  try {
    const success = await db.events.cancelRegistration(req.params.id, req.params.studentId);
    if (!success) {
      return res.status(404).json({
        error: 'registration_not_found',
        message: `Registration for student '${req.params.studentId}' not found for event '${req.params.id}'`
      });
    }
    res.json({ success: true, message: `Registration for student '${req.params.studentId}' cancelled` });
  } catch (err) {
    next(err);
  }
});

export default router;
