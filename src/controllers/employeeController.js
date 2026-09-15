const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const EMPLOYEE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  dob: true,
  joiningDate: true,
  motherName: true,
  fatherName: true,
  bloodGroup: true,
  photoUrl: true,
  createdAt: true,
  department: { select: { id: true, name: true } },
  managerId: true,
  manager: { select: { id: true, name: true } },
};

// POST /employees — admin creates a new employee account
async function createEmployee(req, res) {
  const {
    name, email, password, departmentId, role,
    dob, joiningDate, motherName, fatherName, bloodGroup, managerId,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' });
  }

  try {
    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An employee with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        passwordHash,
        departmentId: departmentId || null,
        role: role || 'EMPLOYEE',
        dob: dob ? new Date(dob) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        motherName: motherName || null,
        fatherName: fatherName || null,
        bloodGroup: bloodGroup || null,
        managerId: managerId || null,
      },
      select: EMPLOYEE_SELECT,
    });

    res.status(201).json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

// GET /employees — admin lists all employees
async function listEmployees(req, res) {
  const employees = await prisma.employee.findMany({
    select: EMPLOYEE_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json(employees);
}

// GET /employees/:id — fetch one employee (used to pre-fill the edit form)
async function getEmployee(req, res) {
  const { id } = req.params;
  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
}

// PUT /employees/:id — admin edits an employee. Password is optional —
// only updated if a new one is provided.
async function updateEmployee(req, res) {
  const { id } = req.params;
  const {
    name, email, password, departmentId, role,
    dob, joiningDate, motherName, fatherName, bloodGroup, managerId,
  } = req.body;

  try {
    const data = {
      name,
      email,
      departmentId: departmentId || null,
      role,
      dob: dob ? new Date(dob) : null,
      joiningDate: joiningDate ? new Date(joiningDate) : null,
      motherName: motherName || null,
      fatherName: fatherName || null,
      bloodGroup: bloodGroup || null,
      managerId: managerId || null,
    };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const employee = await prisma.employee.update({
      where: { id },
      data,
      select: EMPLOYEE_SELECT,
    });

    res.json(employee);
  } catch (err) {
    console.error(err);
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.status(500).json({ error: 'Failed to update employee' });
  }
}

// GET /employees/managers — list potential approvers for the "Reports To" dropdown
async function listManagers(req, res) {
  const managers = await prisma.employee.findMany({
    where: { role: { in: ['MANAGER', 'TEAMLEAD', 'ADMIN'] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });
  res.json(managers);
}

// GET /employees/birthdays — anyone can see whose birthday falls in the current month
async function listBirthdaysThisMonth(req, res) {
  const employees = await prisma.employee.findMany({
    where: { dob: { not: null } },
    select: { id: true, name: true, dob: true, photoUrl: true },
  });

  const currentMonth = new Date().getMonth();
  const upcoming = employees
    .filter((e) => new Date(e.dob).getMonth() === currentMonth)
    .sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());

  res.json(upcoming);
}

// POST /employees/:id/photo — admin uploads/replaces an employee's profile photo
async function uploadPhoto(req, res) {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const photoUrl = `/uploads/${req.file.filename}`;
    const employee = await prisma.employee.update({
      where: { id },
      data: { photoUrl },
      select: EMPLOYEE_SELECT,
    });
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
}

module.exports = {
  createEmployee, listEmployees, getEmployee, updateEmployee, uploadPhoto, listManagers, listBirthdaysThisMonth, EMPLOYEE_SELECT,
};