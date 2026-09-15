const prisma = require('../config/db');

async function mobileCheckIn(req, res) {
  const { latitude, longitude } = req.body;
  const employeeId = req.employee.id;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Find an open record from today (checked in, not yet checked out)
  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId, checkInAt: { gte: todayStart }, checkOutAt: null },
  });

  if (openRecord) {
    // Second tap today = check-out
    const updated = await prisma.attendanceRecord.update({
      where: { id: openRecord.id },
      data: { checkOutAt: new Date() },
    });
    return res.json({ action: 'check-out', record: updated });
  }

  // First tap today = check-in
  const created = await prisma.attendanceRecord.create({
    data: {
      employeeId,
      source: 'MOBILE',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });
  res.status(201).json({ action: 'check-in', record: created });
}

// POST /attendance/device-checkin
// Called by the office fingerprint scanner (via requireDeviceKey), not a person.
// Body: { employeeCode } — however the device identifies the matched employee.
async function deviceCheckIn(req, res) {
  const { employeeId } = req.body;
  const deviceId = req.device.id;

  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId is required' });
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return res.status(404).json({ error: 'Unknown employee' });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const openRecord = await prisma.attendanceRecord.findFirst({
    where: { employeeId, checkInAt: { gte: todayStart }, checkOutAt: null },
  });

  if (openRecord) {
    const updated = await prisma.attendanceRecord.update({
      where: { id: openRecord.id },
      data: { checkOutAt: new Date() },
    });
    return res.json({ action: 'check-out', record: updated });
  }

  const created = await prisma.attendanceRecord.create({
    data: { employeeId, source: 'DEVICE', deviceId },
  });
  res.status(201).json({ action: 'check-in', record: created });
}

// GET /attendance/me — employee views their own history
async function myAttendance(req, res) {
  const records = await prisma.attendanceRecord.findMany({
    where: { employeeId: req.employee.id },
    orderBy: { checkInAt: 'desc' },
    take: 50,
  });
  res.json(records);
}

// PUT /attendance/:id — Admin/HR corrects a check-in/check-out time
async function updateAttendance(req, res) {
  const { id } = req.params;
  const { checkInAt, checkOutAt } = req.body;
  try {
    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        checkInAt: checkInAt ? new Date(checkInAt) : undefined,
        checkOutAt: checkOutAt !== undefined ? (checkOutAt ? new Date(checkOutAt) : null) : undefined,
      },
      include: { employee: { select: { id: true, name: true } } },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'Attendance record not found' });
  }
}

// GET /attendance — admin views everyone's records, with optional filters
async function listAttendance(req, res) {
  const { employeeId, from, to } = req.query;

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (from || to) {
    where.checkInAt = {};
    if (from) where.checkInAt.gte = new Date(from);
    if (to) where.checkInAt.lte = new Date(to);
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    include: { employee: { select: { name: true, email: true } }, device: true },
    orderBy: { checkInAt: 'desc' },
  });
  res.json(records);
}

module.exports = { mobileCheckIn, deviceCheckIn, myAttendance, listAttendance, updateAttendance };
