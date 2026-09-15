const prisma = require('../config/db');

// POST /travel — employee submits a travel expense request. Approver auto-set from manager.
async function createTravel(req, res) {
  const { destination, purpose, fromDate, toDate, estimatedAmount } = req.body;
  if (!destination || !purpose || !fromDate || !toDate || estimatedAmount == null) {
    return res.status(400).json({ error: 'destination, purpose, fromDate, toDate, and estimatedAmount are required' });
  }

  try {
    const applicant = await prisma.employee.findUnique({ where: { id: req.employee.id } });

    let approverId = applicant.managerId;
    if (!approverId) {
      const fallbackAdmin = await prisma.employee.findFirst({ where: { role: 'ADMIN' } });
      approverId = fallbackAdmin?.id || null;
    }

    const travel = await prisma.travelRequest.create({
      data: {
        employeeId: req.employee.id,
        approverId,
        destination,
        purpose,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        estimatedAmount: parseFloat(estimatedAmount),
      },
      include: { approver: { select: { id: true, name: true } } },
    });

    if (approverId) {
      await prisma.notification.create({
        data: {
          employeeId: approverId,
          title: 'New Travel Request',
          message: `${applicant.name} has requested travel to ${destination} (${new Date(fromDate).toLocaleDateString('en-GB')} - ${new Date(toDate).toLocaleDateString('en-GB')}).`,
          type: 'TRAVEL_REQUEST',
          relatedId: travel.id,
        },
      });
    }

    res.status(201).json(travel);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit travel request' });
  }
}

// GET /travel/me — employee's own travel request history
async function myTravels(req, res) {
  const travels = await prisma.travelRequest.findMany({
    where: { employeeId: req.employee.id },
    include: { approver: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(travels);
}

// GET /travel/pending — approver's queue
async function pendingTravelApprovals(req, res) {
  const travels = await prisma.travelRequest.findMany({
    where: { approverId: req.employee.id, status: 'PENDING' },
    include: { employee: { select: { id: true, name: true, department: { select: { name: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(travels);
}
// GET /travel — Admin sees every travel request across the company
async function listAllTravels(req, res) {
  const travels = await prisma.travelRequest.findMany({
    include: {
      employee: { select: { id: true, name: true, department: { select: { name: true } } } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(travels);
}
// PUT /travel/:id/decision — approver approves/rejects
async function decideTravel(req, res) {
  const { id } = req.params;
  const { status, reviewNote } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
  }

  try {
    const travel = await prisma.travelRequest.findUnique({ where: { id } });
    if (!travel) return res.status(404).json({ error: 'Travel request not found' });
    if (travel.approverId !== req.employee.id) {
      return res.status(403).json({ error: 'You are not the approver for this request' });
    }

    const updated = await prisma.travelRequest.update({
      where: { id },
      data: { status, reviewNote: reviewNote || null, reviewedAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        employeeId: travel.employeeId,
        title: status === 'APPROVED' ? 'Travel Request Approved' : 'Travel Request Rejected',
        message: status === 'APPROVED'
          ? `Your travel request to ${travel.destination} was approved.`
          : `Your travel request to ${travel.destination} was rejected.${reviewNote ? ` Note: ${reviewNote}` : ''}`,
        type: status === 'APPROVED' ? 'TRAVEL_APPROVED' : 'TRAVEL_REJECTED',
        relatedId: travel.id,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update travel request' });
  }
}

module.exports = { createTravel, myTravels, pendingTravelApprovals, decideTravel,listAllTravels };