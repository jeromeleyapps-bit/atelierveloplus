// Test direct de la base de données
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Test de connexion à la base de données...');
    
    // Tester la lecture
    const settings = await prisma.appSetting.findMany();
    console.log('✓ Lecture OK - Nombre de settings:', settings.length);
    
    // Afficher les colonnes disponibles
    if (settings.length > 0) {
      console.log('Colonnes disponibles:', Object.keys(settings[0]));
    }
    
    // Tester si les nouvelles colonnes existent
    const testSetting = await prisma.appSetting.findFirst();
    if (testSetting) {
      console.log('\nTest des nouvelles colonnes:');
      console.log('- siret:', testSetting.siret !== undefined ? '✓' : '✗');
      console.log('- tva:', testSetting.tva !== undefined ? '✓' : '✗');
      console.log('- rcs:', testSetting.rcs !== undefined ? '✓' : '✗');
      console.log('- capital:', testSetting.capital !== undefined ? '✓' : '✗');
      console.log('- insurance:', testSetting.insurance !== undefined ? '✓' : '✗');
    }
    
    console.log('\n✓ Test réussi !');
  } catch (error) {
    console.error('✗ Erreur:', error.message);
    console.error('Code:', error.code);
    console.error('Meta:', error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

test();
