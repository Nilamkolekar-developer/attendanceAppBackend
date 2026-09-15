const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const travelRoutes = require('./routes/travelRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const salarySlipRoutes = require('./routes/salarySlipRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/employees', employeeRoutes);
app.use('/departments', departmentRoutes);
app.use('/leaves', leaveRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/notifications', notificationRoutes);
app.use('/travel', travelRoutes);
app.use('/holidays', holidayRoutes)
app.use('/salary-slips', salarySlipRoutes);

// Central error handler — catches anything thrown in async controllers
// (pair with express-async-errors, or wrap controllers in try/catch)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

module.exports = app;