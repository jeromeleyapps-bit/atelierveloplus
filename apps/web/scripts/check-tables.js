// Check what tables exist in the database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  console.log('Checking database tables...\n');
  
  try {
    // Query to get all tables in public schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    if (tables.length === 0) {
      console.log('❌ No tables found in database!\n');
      console.log('You need to create the tables. Run this command:\n');
      console.log('  npx prisma db push\n');
      console.log('Wait for it to complete (may take 30-60 seconds).\n');
      process.exit(1);
    }
    
    console.log(`✓ Found ${tables.length} tables:\n`);
    tables.forEach(t => {
      console.log(`  - ${t.table_name}`);
    });
    
    console.log('\n✓ Database schema exists!');
    
    // Try to count users
    try {
      const userCount = await prisma.user.count();
      console.log(`✓ User table accessible (${userCount} users)\n`);
      
      console.log('SUCCESS: Database is ready!');
      console.log('\nYou can now:');
      console.log('  1. Run: npm run dev');
      console.log('  2. Go to: http://localhost:3000');
      console.log('  3. Create your first user account\n');
    } catch (err) {
      console.log('\n⚠️  Tables exist but User table not accessible');
      console.log('Error:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
