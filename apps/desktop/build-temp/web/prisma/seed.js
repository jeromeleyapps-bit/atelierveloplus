const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@test.fr' },
    update: {},
    create: {
      email: 'admin@test.fr',
      name: 'Admin',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Brq3EW', // password123
      role: 'admin',
      active: true,
    },
  });
}

main().catch(e => (console.error(e), process.exit(1)))
  .finally(() => prisma.$disconnect());