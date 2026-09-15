const prisma = require('../config/db');

// POST /leaves — employee applies for leave. Approver is auto-set from their manager.
async function createLeave(req, res) {
  const { fromDate, toDate, reason } = req.body;
  if (!fromDate || !toDate || !reason) {
    return res.status(400).json({ error: 'fromDate, toDate, and reason are required' });
  }

  try {
    const applicant = await prisma.employee.findUnique({ where: { id: req.employee.id } });

    let approverId = applicant.managerId;
    if (!approverId) {
      const fallbackAdmin = await prisma.employee.findFirst({ where: { role: 'ADMIN' } });
      approverId = fallbackAdmin?.id || null;
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: req.employee.id,
        approverId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason,
      },
      include: { approver: { select: { id: true, name: true } } },
    });

    // Notify the approver that a new request needs their attention.
    if (approverId) {
      await prisma.notification.create({
        data: {
          employeeId: approverId,
          title: 'New Leave Request',
          message: `${applicant.name} has requested leave from ${new Date(fromDate).toLocaleDateString('en-GB')} to ${new Date(toDate).toLocaleDateString('en-GB')}.`,
          type: 'LEAVE_REQUEST',
          relatedId: leave.id,
        },
      });
    }

    res.status(201).json(leave);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
}
// GET /leaves — Admin sees every leave request across the company
async function listAllLeaves(req, res) {
  const leaves = await prisma.leaveRequest.findMany({
    include: {
      employee: { select: { id: true, name: true, department: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(leaves);
}
// GET /leaves/me — employee's own leave history
async function myLeaves(req, res) {
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: req.employee.id },
    include: { approver: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(leaves);
}

// GET /leaves/pending — approver's queue
async function pendingApprovals(req, res) {
  const leaves = await prisma.leaveRequest.findMany({
    where: { approverId: req.employee.id, status: 'PENDING' },
    include: { employee: { select: { id: true, name: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(leaves);
}

// PUT /leaves/:id/decision — approver approves/rejects
async function decideLeave(req, res) {
  const { id } = req.params;
  const { status, reviewNote } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
  }

  try {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.approverId !== req.employee.id) {
      return res.status(403).json({ error: 'You are not the approver for this request' });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewNote: reviewNote || null, reviewedAt: new Date() },
    });

    // Notify the employee of the decision.
    await prisma.notification.create({
      data: {
        employeeId: leave.employeeId,
        title: status === 'APPROVED' ? 'Leave Approved' : 'Leave Rejected',
        message: status === 'APPROVED'
          ? `Your leave request from ${leave.fromDate.toLocaleDateString('en-GB')} to ${leave.toDate.toLocaleDateString('en-GB')} was approved.`
          : `Your leave request from ${leave.fromDate.toLocaleDateString('en-GB')} to ${leave.toDate.toLocaleDateString('en-GB')} was rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
        type: status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        relatedId: leave.id,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
}

module.exports = { createLeave, myLeaves, pendingApprovals, decideLeave, listAllLeaves };