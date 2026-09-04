const express = require('express');
const router = express.Router();
const db = require('../db');
const checkRole = require('../middleware/checkRole');

// Teacher issues an assignment
router.post('/', checkRole(['teacher']), (req, res) => {
  const {
    course, course_title, title, description,
    assigned_date, deadline, submission_platform, marks
  } = req.body;

  const id = 'asgn-' + Date.now();

  db.prepare(`
    INSERT INTO assignments
      (id, course, course_title, title, description, assigned_date, deadline, submission_platform, status, marks, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, course, course_title, title, description,
    assigned_date || new Date().toISOString().split('T')[0],
    deadline, submission_platform || null, 'pending', marks || null,
    req.user.id
  );

  res.json({ id, course, course_title, title, description, deadline });
});

// Anyone views assignments (students see their own submission status joined in)
router.get('/', checkRole(['teacher', 'student', 'admin']), (req, res) => {
  const assignments = db.prepare('SELECT * FROM assignments').all();

  if (req.user.role === 'student') {
    const withStatus = assignments.map(a => {
      const sub = db.prepare(
        'SELECT status FROM submissions WHERE assignment_id=? AND student_id=?'
      ).get(a.id, req.user.id);
      return { ...a, my_submission_status: sub ? sub.status : 'not_submitted' };
    });
    return res.json(withStatus);
  }

  res.json(assignments);
});

// Student submits
router.post('/:id/submit', checkRole(['student']), (req, res) => {
  const assignmentId = req.params.id;

  const assignment = db.prepare('SELECT * FROM assignments WHERE id=?').get(assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const existing = db.prepare(
    'SELECT * FROM submissions WHERE assignment_id=? AND student_id=?'
  ).get(assignmentId, req.user.id);

  if (existing) {
    db.prepare(
      `UPDATE submissions SET status='submitted', submitted_at=datetime('now') WHERE id=?`
    ).run(existing.id);
  } else {
    db.prepare(
      `INSERT INTO submissions (assignment_id, student_id, status, submitted_at) VALUES (?,?,'submitted',datetime('now'))`
    ).run(assignmentId, req.user.id);
  }

  res.json({ success: true });
});

module.exports = router;