function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.employee.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

module.exports = requireRole;