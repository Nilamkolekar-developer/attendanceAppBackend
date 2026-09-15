const { verifyToken } = require('../utils/jwt');

// Protects routes that require a logged-in employee (from the mobile app).
// Expects: Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.employee = payload; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Restricts a route to admins only — use AFTER requireAuth.
function requireAdmin(req, res, next) {
  if (req.employee?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
