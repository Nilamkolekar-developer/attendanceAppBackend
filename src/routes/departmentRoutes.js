const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { listDepartments, createDepartment } = require('../controllers/departmentController');

router.get('/', requireAuth, listDepartments);
router.post('/', requireAuth, requireRole('ADMIN'), createDepartment);

module.exports = router;