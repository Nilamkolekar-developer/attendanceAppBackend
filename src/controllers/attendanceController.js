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

// Sunday is always off. Saturday is off only on the 2nd and 4th occurrence
// of that weekday within its month.
function isWeeklyOff(date) {
  if (date.getDay() === 0) return true;
  if (date.getDay() === 6) {
    const weekIndex = Math.floor((date.getDate() - 1) / 7) + 1;
    return weekIndex === 2 || weekIndex === 4;
  }
  return false;
}

// GET /attendance/stats — month-to-date summary for the logged-in employee:
// Present, Absent, Leave, Off Days (weekly off + holidays, not double-counted), Payable.
async function myMonthlyStats(req, res) {
  const employeeId = req.employee.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const startOfMonth = new Date(year, month, 1);
  const today = new Date(year, month, now.getDate());
  const monthEnd = new Date(year, month + 1, 0);

  try {
    const holidays = await prisma.holiday.findMany({
      where: { date: { gte: startOfMonth, lte: monthEnd } },
    });
    const holidayDates = new Set(holidays.map((h) => new Date(h.date).toDateString()));

    const leaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        fromDate: { lte: today },
        toDate: { gte: startOfMonth },
      },
    });

    const records = await prisma.attendanceRecord.findMany({
      where: { employeeId, checkInAt: { gte: startOfMonth, lte: today } },
    });
    // A punch-in alone (even with no punch-out) still counts as Present.
    // Absent only applies when there's no attendance record at all that day.
    const presentDates = new Set(records.map((r) => new Date(r.checkInAt).toDateString()));

    let present = 0;
    let offDays = 0;
    let leaveDays = 0;
    let workingDays = 0;

    for (let d = new Date(startOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toDateString();
      const isOff = isWeeklyOff(d) || holidayDates.has(dateStr);

      if (isOff) {
        offDays++;
        continue;
      }

      workingDays++;

      if (presentDates.has(dateStr)) {
        present++;
        continue;
      }

      const onLeave = leaves.some(
        (l) => new Date(l.fromDate) <= d && new Date(l.toDate) >= d
      );
      if (onLeave) leaveDays++;
    }

    const absent = Math.max(workingDays - present - leaveDays, 0);
    const payable = present + leaveDays;

    res.json({
      payable: payable.toFixed(1),
      present: present.toFixed(1),
      offDays: offDays.toFixed(1),
      leave: leaveDays.toFixed(1),
      absent: absent.toFixed(1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
}

module.exports = {
  mobileCheckIn, deviceCheckIn, myAttendance, listAttendance, updateAttendance, myMonthlyStats,
};