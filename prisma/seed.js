const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.employee.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@company.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const deviceKey = 'device-key-change-me';
  await prisma.device.upsert({
    where: { apiKey: deviceKey },
    update: {},
    create: {
      name: 'Main Office - Front Desk',
      location: 'HQ Lobby',
      apiKey: deviceKey,
    },
  });

  const departmentNames = ['Developer', 'Tester', 'HR', 'Sales', 'Marketing', 'Support'];
  for (const name of departmentNames) {
    await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Holiday has no unique constraint, so guard with a count check
  // instead of upsert — safe to run this seed script multiple times.
  const existingHolidays = await prisma.holiday.count();
  if (existingHolidays === 0) {
    await prisma.holiday.createMany({
      data: [
        { name: 'Diwali', date: new Date('2026-11-08') },
        { name: 'Christmas', date: new Date('2026-12-25') },
        { name: 'Republic Day', date: new Date('2027-01-26') },
      ],
    });
  }

  console.log('Seed complete. Admin login: admin@company.com / admin123');
  console.log('Device API key:', deviceKey);
  console.log('Departments seeded:', departmentNames.join(', '));
  console.log('Holidays seeded:', existingHolidays === 0 ? 'Diwali, Christmas, Republic Day' : 'already existed, skipped');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());