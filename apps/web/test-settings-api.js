/**
 * Test des routes settings pour diagnostiquer les erreurs 500
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testSettings() {
  console.log('\n🔍 TEST ROUTES SETTINGS\n');
  console.log('='.repeat(60));
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Vérifier la connexion Prisma
    console.log('\n1️⃣ Test connexion Prisma...');
    await prisma.$connect();
    console.log('✅ Prisma connecté');
    
    // 2. Vérifier qu'il y a au moins un utilisateur
    console.log('\n2️⃣ Vérification utilisateurs...');
    const users = await prisma.user.findMany();
    console.log(`  Utilisateurs trouvés: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ Aucun utilisateur - Création d\'un utilisateur de test...');
      const newUser = await prisma.user.create({
        data: {
          email: 'admin@atelier-velo.fr',
          name: 'Admin',
          role: 'admin',
          password: 'temp' // À changer
        }
      });
      console.log('✅ Utilisateur créé:', newUser.id);
    } else {
      console.log('✅ Utilisateur(s) existant(s)');
      users.forEach(u => console.log(`   - ${u.email} (${u.id})`));
    }
    
    const firstUser = await prisma.user.findFirst();
    
    // 3. Tester AppSetting
    console.log('\n3️⃣ Test AppSetting...');
    let appSetting = await prisma.appSetting.findUnique({
      where: { userId: firstUser.id }
    });
    
    if (!appSetting) {
      console.log('  Aucun AppSetting - Création...');
      appSetting = await prisma.appSetting.create({
        data: {
          userId: firstUser.id,
          shopName: 'Atelier Vélo+',
          shopEmail: 'contact@upgradedbikes.com',
          shopPhone: '01 23 45 67 89'
        }
      });
      console.log('✅ AppSetting créé');
    } else {
      console.log('✅ AppSetting existe');
    }
    
    console.log('  Données:', {
      shopName: appSetting.shopName,
      shopEmail: appSetting.shopEmail,
      shopPhone: appSetting.shopPhone
    });
    
    // 4. Tester GlobalSetting
    console.log('\n4️⃣ Test GlobalSetting...');
    const testKey = 'pricing.defaultMultiplier';
    let globalSetting = await prisma.globalSetting.findUnique({
      where: { key: testKey }
    });
    
    if (!globalSetting) {
      console.log(`  Aucun GlobalSetting pour "${testKey}" - Création...`);
      globalSetting = await prisma.globalSetting.create({
        data: {
          key: testKey,
          value: '1.5'
        }
      });
      console.log('✅ GlobalSetting créé');
    } else {
      console.log('✅ GlobalSetting existe');
    }
    
    console.log('  Données:', {
      key: globalSetting.key,
      value: globalSetting.value
    });
    
    // 5. Test UPDATE
    console.log('\n5️⃣ Test UPDATE AppSetting...');
    const updated = await prisma.appSetting.update({
      where: { userId: firstUser.id },
      data: { shopName: 'Atelier Vélo+ (Test)' }
    });
    console.log('✅ UPDATE réussi:', updated.shopName);
    
    // 6. Remettre l'ancien nom
    await prisma.appSetting.update({
      where: { userId: firstUser.id },
      data: { shopName: 'Atelier Vélo+' }
    });
    
    console.log('\n✅ TOUS LES TESTS PASSÉS !');
    console.log('\n💡 Les routes API devraient fonctionner maintenant.');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    console.error('\nStack:', error.stack);
    
    if (error.message.includes('SQLITE_CANTOPEN')) {
      console.error('\n🔧 SOLUTION: La base SQLite n\'existe pas ou n\'est pas accessible');
      console.error('   Exécute: cd apps/web && npx prisma migrate dev --name init');
    }
    
    if (error.message.includes('no such table')) {
      console.error('\n🔧 SOLUTION: Les tables n\'existent pas');
      console.error('   Exécute: cd apps/web && npx prisma migrate dev --name init');
    }
    
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

testSettings();
