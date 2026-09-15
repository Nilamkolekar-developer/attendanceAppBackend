require('dotenv').config();
require('express-async-errors'); // lets async controller errors reach the error handler automatically

const app = require('./src/app');
const { PORT } = require('./src/config/env');

app.listen(PORT, () => {
  console.log(`Attendance API running on http://localhost:${PORT}`);
});
