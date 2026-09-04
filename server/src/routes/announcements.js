import express from 'express';
import { db } from '../db/client.js';

const router = express.Router();

// GET /api/announcements
router.get('/', async (req, res, next) => {
  try {
    const { priority, active_only } = req.query;
    const announcements = await db.announcements.getAll({
      priority,
      active_only: active_only === 'true' || active_only === '1'
    });
    res.json(announcements);
  } catch (err) {
    next(err);
  }
});

// GET /api/announcements/:id
router.get('/:id', async (req, res, next) => {
  try {
    const announcement = await db.announcements.getById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ error: 'not_found', message: `Announcement '${req.params.id}' not found` });
    }
    res.json(announcement);
  } catch (err) {
    next(err);
  }
});

// POST /api/announcements
router.post('/', async (req, res, next) => {
  try {
    const { title, body, date, priority, posted_by, expires } = req.body;
    if (!title || !date || !priority) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: title, date, priority (high, medium, low)'
      });
    }

    const id = req.body.id || `ann-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const created = await db.announcements.create({
      id,
      title,
      body: body || '',
      date,
      priority,
      posted_by: posted_by || 'Admin',
      expires: expires || null
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/announcements/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.announcements.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Announcement '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.announcements.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'not_found', message: `Announcement '${req.params.id}' not found` });
    }
    res.json({ success: true, message: `Announcement '${req.params.id}' deleted` });
  } catch (err) {
    next(err);
  }
});

export default router;
