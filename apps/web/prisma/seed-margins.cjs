// Script pour initialiser les marges par défaut
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedMargins() {
  console.log('🔧 Initialisation des marges par défaut...');

  // Supprimer les marges existantes
  await prisma.pricingMargin.deleteMany({});

  // Créer les tranches de marge
  const margins = [
    { minPrice: 0, maxPrice: 3, coefficient: 2.5 },
    { minPrice: 3.01, maxPrice: 8.99, coefficient: 2.3 },
    { minPrice: 9, maxPrice: 149.99, coefficient: 2 },
    { minPrice: 150, maxPrice: 499.99, coefficient: 1.85 },
    { minPrice: 500, maxPrice: null, coefficient: 1.7 }, // null = infini
  ];

  for (const margin of margins) {
    await prisma.pricingMargin.create({
      data: margin,
    });
    console.log(`✅ Marge créée: ${margin.minPrice}€ - ${margin.maxPrice || '∞'}€ → x${margin.coefficient}`);
  }

  console.log('✅ Marges initialisées avec succès !');
}

seedMargins()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
