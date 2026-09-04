const express = require('express');
const router = express.Router();
const db = require('../db');
const checkRole = require('../middleware/checkRole');

router.get('/', checkRole(['teacher', 'student', 'admin']), (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY date DESC').all());
});

router.post('/', checkRole(['teacher', 'admin']), (req, res) => {
  const { title, body, date, priority, expires } = req.body;

  if (!title || !body || !date) {
    return res.status(400).json({ error: 'title, body, and date are required' });
  }

  const id = 'ann-' + Date.now();

  db.prepare(
    `INSERT INTO announcements (id, title, body, date, priority, posted_by, expires) VALUES (?,?,?,?,?,?,?)`
  ).run(id, title, body, date, priority || 'medium', req.user.name, expires || null);

  res.json({ id, title, body, date, priority: priority || 'medium', posted_by: req.user.name, expires: expires || null });
});

router.put('/:id', checkRole(['teacher', 'admin']), (req, res) => {
  const { title, body, date, priority, expires } = req.body;

  const existing = db.prepare('SELECT * FROM announcements WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  db.prepare(
    `UPDATE announcements SET title=?, body=?, date=?, priority=?, expires=? WHERE id=?`
  ).run(
    title ?? existing.title,
    body ?? existing.body,
    date ?? existing.date,
    priority ?? existing.priority,
    expires ?? existing.expires,
    req.params.id
  );

  res.json({ success: true });
});

router.delete('/:id', checkRole(['teacher', 'admin']), (req, res) => {
  const existing = db.prepare('SELECT * FROM announcements WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Announcement not found' });

  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;