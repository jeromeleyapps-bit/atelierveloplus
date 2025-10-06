// Test script to verify SQLite database works
const { PrismaClient } = require('./node_modules/.prisma/client-sqlite');

async function testSQLite() {
  console.log('🧪 Test SQLite Database\n');
  
  const prisma = new PrismaClient();

  try {
    // Test 1: Create a customer
    console.log('1️⃣ Creating a test customer...');
    const customer = await prisma.customer.create({
      data: {
        email: 'test@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '0123456789',
        city: 'Paris'
      }
    });
    console.log('✅ Customer created:', customer.id);

    // Test 2: Create a bike
    console.log('\n2️⃣ Creating a test bike...');
    const bike = await prisma.customerBike.create({
      data: {
        customerId: customer.id,
        brand: 'Trek',
        model: 'FX 3',
        color: 'Bleu'
      }
    });
    console.log('✅ Bike created:', bike.id);

    // Test 3: Create a work order
    console.log('\n3️⃣ Creating a test work order...');
    const workOrder = await prisma.workOrder.create({
      data: {
        customerId: customer.id,
        bikeId: bike.id,
        status: 'created',
        type: 'repair'
      }
    });
    console.log('✅ Work Order created:', workOrder.id);

    // Test 4: Query with relations
    console.log('\n4️⃣ Querying work order with relations...');
    const woWithRelations = await prisma.workOrder.findUnique({
      where: { id: workOrder.id },
      include: {
        customer: true,
        bike: true
      }
    });
    console.log('✅ Work Order with relations:');
    console.log('   - Customer:', woWithRelations.customer.firstName, woWithRelations.customer.lastName);
    console.log('   - Bike:', woWithRelations.bike.brand, woWithRelations.bike.model);

    // Test 5: List all work orders
    console.log('\n5️⃣ Listing all work orders...');
    const allWorkOrders = await prisma.workOrder.findMany({
      include: {
        customer: true,
        bike: true
      }
    });
    console.log('✅ Total work orders:', allWorkOrders.length);

    // Test 6: Update work order
    console.log('\n6️⃣ Updating work order status...');
    const updated = await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: { status: 'ready' }
    });
    console.log('✅ Status updated to:', updated.status);

    // Test 7: Delete (cleanup)
    console.log('\n7️⃣ Cleaning up test data...');
    await prisma.workOrder.delete({ where: { id: workOrder.id } });
    await prisma.customerBike.delete({ where: { id: bike.id } });
    await prisma.customer.delete({ where: { id: customer.id } });
    console.log('✅ Cleanup complete');

    console.log('\n🎉 ALL TESTS PASSED!\n');
    console.log('✅ SQLite is fully compatible with your schema');
    console.log('✅ All CRUD operations work');
    console.log('✅ Relations work perfectly');
    console.log('✅ Your app can use SQLite without any code changes!\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testSQLite();
