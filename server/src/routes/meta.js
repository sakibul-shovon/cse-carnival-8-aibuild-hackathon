import express from 'express';

const router = express.Router();

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// GET /api/meta/now
router.get('/now', (req, res) => {
  const now = req.query.override ? new Date(req.query.override) : new Date();
  const dateStr = now.toISOString().split('T')[0];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;
  const dayStr = DAYS_OF_WEEK[now.getDay()];

  res.json({
    datetime: now.toISOString(),
    date: dateStr,
    time: timeStr,
    day: dayStr,
    timestamp: now.getTime()
  });
});

export default router;
