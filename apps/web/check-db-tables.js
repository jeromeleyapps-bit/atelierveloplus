/**
 * Vérifier les tables dans la base SQLite
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'atelier-velo.db');

console.log('\n🔍 VÉRIFICATION BASE SQLITE\n');
console.log('='.repeat(60));
console.log('Chemin:', dbPath);

try {
  const db = sqlite3(dbPath);
  
  // Lister toutes les tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  
  console.log(`\n📊 ${tables.length} tables trouvées:\n`);
  
  if (tables.length === 0) {
    console.log('❌ AUCUNE TABLE !');
    console.log('\n🔧 SOLUTION:');
    console.log('   cd apps/web');
    console.log('   npx prisma migrate reset --force');
    console.log('   npx prisma migrate dev --name init');
  } else {
    tables.forEach(t => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
      console.log(`  ✅ ${t.name.padEnd(25)} (${count.count} lignes)`);
    });
  }
  
  db.close();
  
} catch (error) {
  console.error('\n❌ ERREUR:', error.message);
  
  if (error.message.includes('SQLITE_CANTOPEN')) {
    console.error('\n🔧 La base n\'existe pas à cet emplacement');
    console.error('   Chemin attendu:', dbPath);
  }
}

console.log('\n' + '='.repeat(60) + '\n');
