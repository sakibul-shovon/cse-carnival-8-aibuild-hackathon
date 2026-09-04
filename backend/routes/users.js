const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/users -> lets frontend show a "log in as" dropdown
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM users').all());
});

module.exports = router;