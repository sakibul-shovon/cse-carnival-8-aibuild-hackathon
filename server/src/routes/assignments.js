import express from 'express';
import { db } from '../db/client.js';

const router = express.Router();

// GET /api/assignments
router.get('/', async (req, res, next) => {
  try {
    const { status, course, due_before } = req.query;
    const assignments = await db.assignments.getAll({ status, course, due_before });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

// GET /api/assignments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const assignment = await db.assignments.getById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'not_found', message: `Assignment '${req.params.id}' not found` });
    }
    res.json(assignment);
  } catch (err) {
    next(err);
  }
});

// POST /api/assignments
router.post('/', async (req, res, next) => {
  try {
    const { course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks } = req.body;
    if (!course || !title || !deadline) {
      return res.status(400).json({
        error: 'missing_fields',
        message: 'Required fields: course, title, deadline'
      });
    }

    const id = req.body.id || `asgn-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const created = await db.assignments.create({
      id,
      course,
      course_title: course_title || '',
      title,
      description: description || '',
      assigned_date: assigned_date || null,
      deadline,
      submission_platform: submission_platform || 'Google Classroom',
      status: status || 'pending',
      marks: marks !== undefined ? Number(marks) : null
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/assignments/:id
router.put('/:id', async (req, res, next) => {
  try {
    const updated = await db.assignments.update(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'not_found', message: `Assignment '${req.params.id}' not found` });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const success = await db.assignments.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'not_found', message: `Assignment '${req.params.id}' not found` });
    }
    res.json({ success: true, message: `Assignment '${req.params.id}' deleted` });
  } catch (err) {
    next(err);
  }
});

export default router;
