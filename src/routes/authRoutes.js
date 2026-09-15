const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { login, getMe, updateMe, uploadMyPhoto } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.post('/me/photo', requireAuth, upload.single('photo'), uploadMyPhoto);

module.exports = router;