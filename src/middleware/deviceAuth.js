const prisma = require('../config/db');

// Office fingerprint devices don't log in as a "user" — they authenticate
// with a fixed API key issued when the device is registered.
// Expects: X-Device-Key: <apiKey>
async function requireDeviceKey(req, res, next) {
  const apiKey = req.headers['x-device-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing device API key' });
  }

  const device = await prisma.device.findUnique({ where: { apiKey } });
  if (!device) {
    return res.status(401).json({ error: 'Invalid device API key' });
  }

  req.device = device;
  next();
}

module.exports = { requireDeviceKey };
