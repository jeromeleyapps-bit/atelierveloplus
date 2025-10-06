// Simple test to verify Prisma connection
// Run with: node test-connection.js

async function testConnection() {
  console.log('Testing Prisma connection...\n');
  
  try {
    // Try to import Prisma client
    const { PrismaClient } = require('@prisma/client');
    console.log('✓ Prisma client imported successfully');
    
    // Create client instance
    const prisma = new PrismaClient();
    console.log('✓ Prisma client instantiated');
    
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`✓ Query executed: ${userCount} users in database`);
    
    await prisma.$disconnect();
    console.log('✓ Database disconnected\n');
    
    console.log('SUCCESS: All tests passed!');
    console.log('\nYou can now:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Go to: http://localhost:3000');
    console.log('  3. Try creating a user account\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    
    if (error.message.includes('Cannot find module')) {
      console.error('\nSolution: Run "npx prisma generate"');
    } else if (error.message.includes('connect')) {
      console.error('\nSolution: Check your DATABASE_URL in .env file');
    } else if (error.message.includes('does not exist')) {
      console.error('\nSolution: Run "npx prisma db push" to create tables');
    }
    
    process.exit(1);
  }
}

testConnection();
