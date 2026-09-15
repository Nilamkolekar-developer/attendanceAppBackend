const prisma = require('../config/db');

// GET /departments — anyone logged in can fetch the list (needed for the dropdown)
async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  res.json(departments);
}

// POST /departments — admin adds a new department
async function createDepartment(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const existing = await prisma.department.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ error: 'Department already exists' });

    const dept = await prisma.department.create({ data: { name } });
    res.status(201).json(dept);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create department' });
  }
}

module.exports = { listDepartments, createDepartment };