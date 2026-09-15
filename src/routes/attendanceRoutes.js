const express = require('express');
const {
  mobileCheckIn,
  deviceCheckIn,
  myAttendance,
  listAttendance,
  updateAttendance,
} = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { requireDeviceKey } = require('../middleware/deviceAuth');

const router = express.Router();

// Mobile app (employee logged in + biometric confirmed on-device)
router.post('/mobile-checkin', requireAuth, mobileCheckIn);
router.get('/me', requireAuth, myAttendance);

// Office hardware device (authenticated via API key, not a user session)
router.post('/device-checkin', requireDeviceKey, deviceCheckIn);

// Admin/HR/Accountant reporting
router.get('/', requireAuth, requireRole('ADMIN', 'HR', 'ACCOUNTANT'), listAttendance);
router.put('/:id', requireAuth, requireRole('ADMIN', 'HR'), updateAttendance);

module.exports = router;