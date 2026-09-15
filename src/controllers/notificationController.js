const prisma = require('../config/db');

// GET /notifications/me
async function myNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { employeeId: req.employee.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
}

// GET /notifications/unread-count
async function unreadCount(req, res) {
  const count = await prisma.notification.count({
    where: { employeeId: req.employee.id, isRead: false },
  });
  res.json({ count });
}

// PUT /notifications/:id/read
async function markRead(req, res) {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(notification);
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: 'Notification not found' });
  }
}

module.exports = { myNotifications, unreadCount, markRead };