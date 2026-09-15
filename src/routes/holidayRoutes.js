const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { listUpcomingHolidays, listAllHolidays, createHoliday, deleteHoliday } = require('../controllers/holidayController');

router.get('/', requireAuth, listUpcomingHolidays);
router.get('/all', requireAuth, requireRole('ADMIN', 'HR'), listAllHolidays);
router.post('/', requireAuth, requireRole('ADMIN', 'HR'), createHoliday);
router.delete('/:id', requireAuth, requireRole('ADMIN', 'HR'), deleteHoliday);

module.exports = router;