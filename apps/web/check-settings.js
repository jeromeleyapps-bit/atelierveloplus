// Vérifier les AppSettings dans la base
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    console.log('=== Vérification des AppSettings ===\n');
    
    // Tous les utilisateurs
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    console.log('Utilisateurs en base:', users.length);
    users.forEach(u => console.log(`  - ${u.email} (${u.id})`));
    
    console.log('\n');
    
    // Tous les AppSettings
    const settings = await prisma.appSetting.findMany({
      include: { user: { select: { email: true } } }
    });
    console.log('AppSettings en base:', settings.length);
    
    if (settings.length === 0) {
      console.log('\n⚠️  Aucun AppSetting trouvé !');
      console.log('Solution : Créer un AppSetting pour le premier utilisateur...\n');
      
      if (users.length > 0) {
        const firstUser = users[0];
        console.log(`Création d'un AppSetting pour ${firstUser.email}...`);
        
        const created = await prisma.appSetting.create({
          data: {
            userId: firstUser.id,
            shopName: 'Atelier Vélo+',
            address1: '17 Rue Danton',
            zip: '84000',
            city: 'Avignon',
            shopPhone: '04 XX XX XX XX',
            shopEmail: 'contact@atelier-velo.fr',
          }
        });
        
        console.log('✓ AppSetting créé avec succès !');
        console.log('  ID:', created.id);
        console.log('  Nom:', created.shopName);
      }
    } else {
      settings.forEach(s => {
        console.log(`\nAppSetting pour ${s.user.email}:`);
        console.log(`  - Nom: ${s.shopName || 'N/A'}`);
        console.log(`  - Adresse: ${s.address1 || 'N/A'}`);
        console.log(`  - SIRET: ${s.siret || 'N/A'}`);
        console.log(`  - TVA: ${s.tva || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
