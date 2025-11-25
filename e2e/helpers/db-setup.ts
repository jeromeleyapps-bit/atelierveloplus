import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  try {
    // Vérifier si un utilisateur admin existe déjà
    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@atelier-velo.fr' }
    });

    if (!existingAdmin) {
      // Créer un utilisateur admin pour les tests
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      
      await prisma.user.create({
        data: {
          email: 'admin@atelier-velo.fr',
          password: hashedPassword,
          firstName: 'Admin',
          lastName: 'Test',
          role: 'ADMIN',
          isActive: true,
        }
      });

      console.log('✅ Test admin user created');
    } else {
      console.log('✅ Test admin user already exists');
    }

    // Créer quelques données de test si nécessaire
    const customerCount = await prisma.customer.count();
    if (customerCount === 0) {
      await prisma.customer.createMany({
        data: [
          {
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@example.com',
            phone: '0612345678',
          },
          {
            firstName: 'Marie',
            lastName: 'Martin',
            email: 'marie.martin@example.com',
            phone: '0623456789',
          }
        ]
      });
      console.log('✅ Test customers created');
    }

  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupTestDatabase() {
  try {
    // Ne pas nettoyer en E2E - on veut garder les données entre les tests
    console.log('✅ Test database cleanup skipped (E2E mode)');
  } catch (error) {
    console.error('❌ Error cleaning up test database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

