module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-in-production',
  JWT_EXPIRES_IN: '7d',
};
