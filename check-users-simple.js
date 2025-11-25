const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  console.log('Users dans la DB:', users.length);
  users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
