// Prisma seed script (CommonJS)
// Run: pnpm prisma db seed
// Creates an admin user and a few sample records so the app can start.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Admin user (password = "password123")
  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.fr' },
    update: {},
    create: {
      email: 'admin@test.fr',
      name: 'Admin',
      password:
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Brq3EW', // bcrypt of password123
      role: 'admin',
      active: true,
    },
  });

  // Global setting example
  await prisma.globalSetting.upsert({
    where: { key: 'app.version' },
    update: { value: 'dev' },
    create: { key: 'app.version', value: 'dev' },
  });

  // Minimal catalog example
  const items = [
    {
      sku: 'p-chaine',
      category: 'piece',
      name: 'Chaine 11v',
      priceHT: 18,
      priceTTC: 21.6,
      vatRate: 20,
      active: true,
      stockQty: 5,
    },
    {
      sku: 's-revision',
      category: 'service',
      name: 'Révision générale',
      priceHT: 60,
      priceTTC: 72,
      vatRate: 20,
      active: true,
      stockQty: 0,
    },
  ];

  for (const it of items) {
    await prisma.catalogItem.upsert({
      where: { sku: it.sku },
      update: {
        name: it.name,
        priceHT: it.priceHT,
        priceTTC: it.priceTTC,
        vatRate: it.vatRate,
        active: it.active,
      },
      create: it,
    });
  }

  // Ensure invoice sequence for current year exists
  const year = new Date().getFullYear();
  await prisma.invoiceSequence.upsert({
    where: { year },
    update: {},
    create: { year, lastNumber: 0 },
  });

  console.log('✅ Seed completed. Admin: admin@test.fr / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
