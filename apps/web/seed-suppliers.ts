/**
 * Seed script to create test suppliers
 * Run: npx ts-node seed-suppliers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding suppliers...\n');

  // Create test suppliers
  const suppliers = [
    {
      name: 'Alltricks B2B',
      website: 'https://www.alltricks.com',
      connectorType: 'MOCK', // Will be 'ALLTRICKS' when real adapter is ready
      active: true
    },
    {
      name: 'Bike24 B2B',
      website: 'https://www.bike24.com',
      connectorType: 'MOCK', // Will be 'BIKE24' when real adapter is ready
      active: true
    },
    {
      name: 'Probikeshop B2B',
      website: 'https://www.probikeshop.fr',
      connectorType: 'MOCK', // Will be 'PROBIKESHOP' when real adapter is ready
      active: true
    }
  ];

  for (const supplier of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { name: supplier.name }
    });

    if (existing) {
      console.log(`✓ Supplier "${supplier.name}" already exists`);
    } else {
      await prisma.supplier.create({ data: supplier });
      console.log(`✓ Created supplier "${supplier.name}"`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nYou can now test B2B search:');
  console.log('POST /api/suppliers/search');
  console.log('Body: { "query": "shimano" }\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
