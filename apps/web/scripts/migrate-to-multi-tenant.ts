/**
 * Migration script: Single-tenant → Multi-tenant
 * 
 * This script:
 * 1. Creates a default tenant for existing data
 * 2. Assigns all existing records to this tenant
 * 3. Validates the migration
 * 
 * Run with: npx ts-node scripts/migrate-to-multi-tenant.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration to multi-tenant architecture...\n');

  try {
    // Step 1: Create default tenant
    console.log('Step 1: Creating default tenant...');
    const defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Atelier Principal',
        slug: 'principal',
        shopName: 'Atelier Principal',
        active: true,
        plan: 'pro', // Give existing tenant pro plan
      },
    });
    console.log(`✅ Created tenant: ${defaultTenant.name} (${defaultTenant.id})\n`);

    const tenantId = defaultTenant.id;

    // Step 2: Migrate Users
    console.log('Step 2: Migrating users...');
    const users = await prisma.user.findMany();
    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${users.length} users\n`);

    // Step 3: Migrate Customers
    console.log('Step 3: Migrating customers...');
    const customers = await prisma.customer.findMany();
    for (const customer of customers) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${customers.length} customers\n`);

    // Step 4: Migrate CustomerBikes
    console.log('Step 4: Migrating customer bikes...');
    const bikes = await prisma.customerBike.findMany();
    for (const bike of bikes) {
      await prisma.customerBike.update({
        where: { id: bike.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${bikes.length} customer bikes\n`);

    // Step 5: Migrate WorkOrders
    console.log('Step 5: Migrating work orders...');
    const workOrders = await prisma.workOrder.findMany();
    for (const wo of workOrders) {
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${workOrders.length} work orders\n`);

    // Step 6: Migrate WorkOrderParts
    console.log('Step 6: Migrating work order parts...');
    const parts = await prisma.workOrderPart.findMany();
    for (const part of parts) {
      await prisma.workOrderPart.update({
        where: { id: part.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${parts.length} work order parts\n`);

    // Step 7: Migrate Invoices
    console.log('Step 7: Migrating invoices...');
    const invoices = await prisma.invoice.findMany();
    for (const invoice of invoices) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${invoices.length} invoices\n`);

    // Step 8: Migrate InvoiceLines
    console.log('Step 8: Migrating invoice lines...');
    const lines = await prisma.invoiceLine.findMany();
    for (const line of lines) {
      await prisma.invoiceLine.update({
        where: { id: line.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${lines.length} invoice lines\n`);

    // Step 9: Migrate InvoicePayments
    console.log('Step 9: Migrating invoice payments...');
    const payments = await prisma.invoicePayment.findMany();
    for (const payment of payments) {
      await prisma.invoicePayment.update({
        where: { id: payment.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${payments.length} invoice payments\n`);

    // Step 10: Migrate InvoiceSequences
    console.log('Step 10: Migrating invoice sequences...');
    const sequences = await prisma.invoiceSequence.findMany();
    for (const seq of sequences) {
      await prisma.invoiceSequence.update({
        where: { id: seq.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${sequences.length} invoice sequences\n`);

    // Step 11: Migrate CatalogItems
    console.log('Step 11: Migrating catalog items...');
    const catalogItems = await prisma.catalogItem.findMany();
    for (const item of catalogItems) {
      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${catalogItems.length} catalog items\n`);

    // Step 12: Migrate StockMovements
    console.log('Step 12: Migrating stock movements...');
    const movements = await prisma.stockMovement.findMany();
    for (const movement of movements) {
      await prisma.stockMovement.update({
        where: { id: movement.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${movements.length} stock movements\n`);

    // Step 13: Migrate Suppliers
    console.log('Step 13: Migrating suppliers...');
    const suppliers = await prisma.supplier.findMany();
    for (const supplier of suppliers) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${suppliers.length} suppliers\n`);

    // Step 14: Migrate SupplierCredentials
    console.log('Step 14: Migrating supplier credentials...');
    const credentials = await prisma.supplierCredential.findMany();
    for (const cred of credentials) {
      await prisma.supplierCredential.update({
        where: { id: cred.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${credentials.length} supplier credentials\n`);

    // Step 15: Migrate SupplierItems
    console.log('Step 15: Migrating supplier items...');
    const supplierItems = await prisma.supplierItem.findMany();
    for (const item of supplierItems) {
      await prisma.supplierItem.update({
        where: { id: item.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${supplierItems.length} supplier items\n`);

    // Step 16: Migrate CalendarEvents
    console.log('Step 16: Migrating calendar events...');
    const events = await prisma.calendarEvent.findMany();
    for (const event of events) {
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${events.length} calendar events\n`);

    // Step 17: Migrate CalendarBlocks
    console.log('Step 17: Migrating calendar blocks...');
    const blocks = await prisma.calendarBlock.findMany();
    for (const block of blocks) {
      await prisma.calendarBlock.update({
        where: { id: block.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${blocks.length} calendar blocks\n`);

    // Step 18: Migrate Bookings
    console.log('Step 18: Migrating bookings...');
    const bookings = await prisma.booking.findMany();
    for (const booking of bookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${bookings.length} bookings\n`);

    // Step 19: Migrate CalendarConfigs
    console.log('Step 19: Migrating calendar configs...');
    const configs = await prisma.calendarConfig.findMany();
    for (const config of configs) {
      await prisma.calendarConfig.update({
        where: { id: config.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${configs.length} calendar configs\n`);

    // Step 20: Migrate AppSettings
    console.log('Step 20: Migrating app settings...');
    const appSettings = await prisma.appSetting.findMany();
    for (const setting of appSettings) {
      await prisma.appSetting.update({
        where: { id: setting.id },
        data: { tenantId },
      });
    }
    console.log(`✅ Migrated ${appSettings.length} app settings\n`);

    // Step 21: Migrate GlobalSettings to TenantSettings
    console.log('Step 21: Migrating global settings to tenant settings...');
    const globalSettings = await prisma.globalSetting.findMany();
    for (const setting of globalSettings) {
      await prisma.tenantSetting.create({
        data: {
          tenantId,
          key: setting.key,
          value: setting.value,
        },
      });
    }
    console.log(`✅ Migrated ${globalSettings.length} global settings to tenant settings\n`);

    // Step 22: Validation
    console.log('Step 22: Validating migration...');
    const tenantData = {
      users: await prisma.user.count({ where: { tenantId } }),
      customers: await prisma.customer.count({ where: { tenantId } }),
      invoices: await prisma.invoice.count({ where: { tenantId } }),
      catalogItems: await prisma.catalogItem.count({ where: { tenantId } }),
    };
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Tenant: ${defaultTenant.name} (${defaultTenant.slug})`);
    console.log(`   Users: ${tenantData.users}`);
    console.log(`   Customers: ${tenantData.customers}`);
    console.log(`   Invoices: ${tenantData.invoices}`);
    console.log(`   Catalog Items: ${tenantData.catalogItems}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Test the application');
    console.log('   2. Verify data isolation');
    console.log('   3. Create additional tenants for testing');
    console.log(`   4. Access tenant at: https://principal.atelier-velo.fr\n`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
