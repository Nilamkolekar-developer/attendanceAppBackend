const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { createTravel, myTravels, pendingTravelApprovals, decideTravel, listAllTravels } = require('../controllers/travelController');

router.post('/', requireAuth, createTravel);
router.get('/me', requireAuth, myTravels);
router.get('/pending', requireAuth, pendingTravelApprovals);
router.put('/:id/decision', requireAuth, decideTravel);
router.get('/', requireAuth, requireRole('ADMIN', 'HR', 'ACCOUNTANT'), listAllTravels);

module.exports = router;