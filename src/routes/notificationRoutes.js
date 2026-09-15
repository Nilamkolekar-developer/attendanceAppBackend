const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { myNotifications, unreadCount, markRead } = require('../controllers/notificationController');

router.get('/me', requireAuth, myNotifications);
router.get('/unread-count', requireAuth, unreadCount);
router.put('/:id/read', requireAuth, markRead);

module.exports = router;