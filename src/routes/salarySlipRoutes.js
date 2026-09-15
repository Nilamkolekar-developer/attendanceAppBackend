const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { createSlip, mySlips, listAllSlips } = require('../controllers/salarySlipController');

router.post('/', requireAuth, requireRole('ADMIN', 'HR'), createSlip);
router.get('/me', requireAuth, mySlips);
router.get('/', requireAuth, requireRole('ADMIN', 'HR'), listAllSlips);

module.exports = router;