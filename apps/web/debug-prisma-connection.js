/**
 * Debug : Quelle base SQLite Prisma utilise-t-il ?
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const path = require('path');

console.log('\n🔍 DEBUG PRISMA CONNECTION\n');
console.log('='.repeat(60));

// Variables d'environnement
console.log('\n📋 VARIABLES ENV:');
console.log('  DATABASE_PROVIDER:', process.env.DATABASE_PROVIDER);
console.log('  SQLITE_DB_PATH:', process.env.SQLITE_DB_PATH);
console.log('  DATABASE_URL:', process.env.DATABASE_URL || 'Non défini');

// Chemin attendu
const expectedPath = path.join(__dirname, 'data', 'atelier-velo.db');
console.log('\n📂 CHEMIN ATTENDU:');
console.log('  ', expectedPath);

// Test connexion
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function test() {
  try {
    console.log('\n🔌 TEST CONNEXION...');
    
    // Vérifier les tables
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `;
    
    console.log(`\n✅ ${tables.length} tables trouvées:`);
    tables.forEach(t => console.log(`  - ${t.name}`));
    
    if (tables.length === 0) {
      console.log('\n❌ AUCUNE TABLE !');
      console.log('   La base est vide ou Prisma se connecte au mauvais fichier');
    } else {
      // Compter les clients
      const count = await prisma.customer.count();
      console.log(`\n📊 ${count} clients dans la base`);
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    
    if (error.message.includes('no such table')) {
      console.error('\n🔧 PROBLÈME: Les tables n\'existent pas');
      console.error('   Prisma se connecte à une base vide ou au mauvais fichier');
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

test();

console.log('\n' + '='.repeat(60) + '\n');
