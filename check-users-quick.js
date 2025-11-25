const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true }
  });
  
  console.log(`\n=== USERS DANS LA DB (${users.length}) ===`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Created: ${u.createdAt}`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
