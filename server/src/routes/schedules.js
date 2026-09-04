import express from 'express';
import { db } from '../db/client.js';

const router = express.Router();

// GET /api/schedules
router.get('/', async (req, res, next) => {
  try {
    const { day, course, room, instructor } = req.query;
    const schedules = await db.schedules.getAll({ day, course, room, instructor });
    res.json(schedules);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedules/:id
router.get('/:id', async (req, res, next) => {
  try {
    const schedule = await db.schedules.getById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ error: 'not_found', message: `Schedule '${req.params.id}' not found` });
    }
    res.json(schedule);
  } catch (err) {
    next(err);
  }
});

// POST /api/schedules
router.post('/', async (req, res, next) => {
  try {
    const { course, title, day, start_time, end_time, room, instructor, section } = req.body;
    if (!course || !title || !day || !start_time || !end_time || !room) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: course, title, day, start_time, end_time, room'
      });
    }

    const id = req.body.id || `sch-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const created = await db.schedules.create({
      id,
      course,
      title,
      day,
      start_time,
      end_time,
      room,
      instructor: instructor || 'TBA',
      section: section || ''
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedules/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.schedules.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Schedule '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.schedules.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'not_found', message: `Schedule '${req.params.id}' not found` });
    }
    res.json({ success: true, message: `Schedule '${req.params.id}' deleted` });
  } catch (err) {
    next(err);
  }
});

export default router;
