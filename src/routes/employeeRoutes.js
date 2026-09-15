const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const upload = require('../middleware/upload');
const {
  createEmployee, listEmployees, getEmployee, updateEmployee, uploadPhoto, listManagers, listBirthdaysThisMonth,
} = require('../controllers/employeeController');

router.post('/:id/photo', requireAuth, requireRole('ADMIN', 'HR'), upload.single('photo'), uploadPhoto);
router.post('/', requireAuth, requireRole('ADMIN', 'HR'), createEmployee);
router.get('/', requireAuth, requireRole('ADMIN', 'HR', 'MANAGER', 'TEAMLEAD'), listEmployees);
router.get('/managers', requireAuth, requireRole('ADMIN', 'HR'), listManagers);
router.get('/birthdays', requireAuth, listBirthdaysThisMonth);
router.get('/:id', requireAuth, requireRole('ADMIN', 'HR', 'MANAGER'), getEmployee);
router.put('/:id', requireAuth, requireRole('ADMIN', 'HR'), updateEmployee);

module.exports = router;