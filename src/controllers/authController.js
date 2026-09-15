const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { signToken } = require('../utils/jwt');
const { EMPLOYEE_SELECT } = require('./employeeController');

// POST /auth/login
// The mobile app calls this FIRST (email/password) to get a session token.
// Biometric check happens AFTER this, as a second factor before marking attendance —
// biometrics confirm "this is really the phone owner", not "who are you".
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { department: { select: { id: true, name: true } } ,
    manager: { select: { id: true, name: true } }},
  });
  if (!employee) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, employee.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken({ id: employee.id, email: employee.email, role: employee.role });

  // Strip passwordHash before sending back — never expose it, even hashed.
  const { passwordHash, ...safeEmployee } = employee;

  res.json({ token, employee: safeEmployee });
}

// GET /auth/me — get my own full profile
async function getMe(req, res) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.employee.id },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// PUT /auth/me — update my own editable fields only.
// Deliberately does NOT accept role, email, or departmentId —
// those stay admin-controlled via /employees/:id.
async function updateMe(req, res) {
  const { name, dob, motherName, fatherName, bloodGroup } = req.body;

  try {
    const employee = await prisma.employee.update({
      where: { id: req.employee.id },
      data: {
        name,
        dob: dob ? new Date(dob) : null,
        motherName: motherName || null,
        fatherName: fatherName || null,
        bloodGroup: bloodGroup || null,
      },
      select: EMPLOYEE_SELECT,
    });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// POST /auth/me/photo — update my own profile photo
async function uploadMyPhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const photoUrl = `/uploads/${req.file.filename}`;
    const employee = await prisma.employee.update({
      where: { id: req.employee.id },
      data: { photoUrl },
      select: EMPLOYEE_SELECT,
    });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
}

module.exports = { login, getMe, updateMe, uploadMyPhoto };