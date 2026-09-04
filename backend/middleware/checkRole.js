// expects the frontend to send X-User-Id header on every request
function checkRole(allowedRoles) {
  return (req, res, next) => {
    const db = require('../db');
    const userId = req.header('X-User-Id');
    if (!userId) return res.status(401).json({ error: 'Missing X-User-Id header' });

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(401).json({ error: 'Invalid user' });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: `Role '${user.role}' not permitted for this action` });
    }
    req.user = user;
    next();
  };
}
module.exports = checkRole;