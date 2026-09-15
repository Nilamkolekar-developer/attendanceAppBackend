const { PrismaClient } = require('@prisma/client');

// One shared Prisma client for the whole app — never instantiate
// PrismaClient in more than one place, it manages its own connection pool.
const prisma = new PrismaClient();

module.exports = prisma;
