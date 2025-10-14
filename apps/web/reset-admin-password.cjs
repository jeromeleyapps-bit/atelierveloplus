// Script pour réinitialiser le mot de passe admin
// Run: node reset-admin-password.cjs

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Réinitialisation du mot de passe admin...');
  
  // Nouveau mot de passe: Admin123!@#
  // Hash bcrypt généré avec bcrypt.hash('Admin123!@#', 10)
  const newPasswordHash = '$2a$10$jC35Nv4vwoPbYXkEJUkg7.EvbPv7QF2pexZcU7AWMY2nQ3z60HuNS';
  
  try {
    // Mettre à jour l'utilisateur admin
    const updated = await prisma.user.update({
      where: { email: 'admin@test.fr' },
      data: {
        password: newPasswordHash,
        active: true,
      },
    });
    
    console.log('✅ Mot de passe mis à jour avec succès !');
    console.log('');
    console.log('📋 Identifiants:');
    console.log('   Email: admin@test.fr');
    console.log('   Mot de passe: Admin123!@#');
    console.log('');
    console.log('🔐 Critères respectés:');
    console.log('   ✓ 11 caractères');
    console.log('   ✓ Majuscules (A)');
    console.log('   ✓ Minuscules (dmin)');
    console.log('   ✓ Chiffres (123)');
    console.log('   ✓ Caractères spéciaux (!@#)');
    console.log('');
    console.log('✅ Vous pouvez maintenant vous connecter !');
  } catch (error) {
    if (error.code === 'P2025') {
      console.error('❌ Utilisateur admin@test.fr non trouvé.');
      console.log('');
      console.log('💡 Solution: Exécuter le seed pour créer l\'utilisateur:');
      console.log('   npx prisma db seed');
    } else {
      console.error('❌ Erreur:', error.message);
    }
    process.exit(1);
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
