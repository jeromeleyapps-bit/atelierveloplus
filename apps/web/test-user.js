// Test de l'utilisateur
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Vérification des utilisateurs...\n');
    
    const users = await prisma.user.findMany();
    console.log('Nombre d\'utilisateurs:', users.length);
    
    if (users.length > 0) {
      console.log('\nUtilisateurs trouvés:');
      users.forEach(u => {
        console.log(`- ID: ${u.id}`);
        console.log(`  Email: ${u.email || 'N/A'}`);
        console.log(`  Name: ${u.name || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  Aucun utilisateur trouvé !');
      console.log('Vous devez d\'abord vous connecter à l\'application.');
    }
    
    // Vérifier les AppSettings
    const settings = await prisma.appSetting.findMany({
      include: { user: true }
    });
    console.log('\nNombre de settings:', settings.length);
    
  } catch (error) {
    console.error('✗ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
