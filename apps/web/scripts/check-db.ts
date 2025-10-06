/**
 * Script to verify database connection and schema
 * Run with: npx ts-node scripts/check-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!\n');

    // Check tables
    console.log('📊 Checking tables...');
    
    const workOrdersCount = await prisma.workOrder.count();
    console.log(`  - WorkOrders: ${workOrdersCount} rows`);

    const customersCount = await prisma.customer.count();
    console.log(`  - Customers: ${customersCount} rows`);

    const catalogItemsCount = await prisma.catalogItem.count();
    console.log(`  - CatalogItems: ${catalogItemsCount} rows`);

    const invoicesCount = await prisma.invoice.count();
    console.log(`  - Invoices: ${invoicesCount} rows`);

    console.log('\n✅ All tables accessible!');

    // Test a simple query
    console.log('\n🧪 Testing a sample query...');
    const recentWorkOrders = await prisma.workOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`  Found ${recentWorkOrders.length} recent work orders`);

    console.log('\n🎉 Database health check passed!');
  } catch (error) {
    console.error('\n❌ Database check failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
