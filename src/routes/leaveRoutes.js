const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { createLeave, myLeaves, pendingApprovals, decideLeave, listAllLeaves } = require('../controllers/leaveController');

router.post('/', requireAuth, createLeave);
router.get('/me', requireAuth, myLeaves);
router.get('/pending', requireAuth, pendingApprovals);
router.put('/:id/decision', requireAuth, decideLeave);
router.get('/', requireAuth, requireRole('ADMIN', 'HR', 'ACCOUNTANT'), listAllLeaves);

module.exports = router;