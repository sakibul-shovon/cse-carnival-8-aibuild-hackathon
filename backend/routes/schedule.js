const express = require('express');
const router = express.Router();
const db = require('../db');
const checkRole = require('../middleware/checkRole');

router.get('/', checkRole(['teacher','student','admin']), (req, res) => {
  res.json(db.prepare('SELECT * FROM schedule').all());
});

// optional: teacher/admin can edit schedule
router.post('/', checkRole(['teacher','admin']), (req, res) => {
  const { course, day, time, room, instructor } = req.body;
  const info = db.prepare(
    `INSERT INTO schedule (course, day, time, room, instructor) VALUES (?,?,?,?,?)`
  ).run(course, day, time, room, instructor);
  res.json({ id: info.lastInsertRowid, ...req.body });
});

module.exports = router;