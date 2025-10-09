/**
 * Script de reset: Supprime tous les comptes et crée UN SEUL utilisateur
 * Simule le comportement de l'app desktop mono-utilisateur
 */

const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function resetToSingleUser() {
  console.log('🔄 Reset de la base de données...\n');

  try {
    // 1. Supprimer TOUTES les données (cascade)
    console.log('❌ Suppression de toutes les données...');
    
    // Supprimer séquentiellement pour éviter les erreurs de FK
    console.log('  - Suppression Communication...');
    await prisma.communication.deleteMany();
    
    console.log('  - Suppression CashRegister...');
    await prisma.cashRegister.deleteMany();
    
    console.log('  - Suppression InvoicePayment...');
    await prisma.invoicePayment.deleteMany();
    
    console.log('  - Suppression InvoiceLine...');
    await prisma.invoiceLine.deleteMany();
    
    console.log('  - Suppression Invoice...');
    await prisma.invoice.deleteMany();
    
    console.log('  - Suppression WorkOrderPart...');
    await prisma.workOrderPart.deleteMany();
    
    console.log('  - Suppression WorkOrder...');
    await prisma.workOrder.deleteMany();
    
    console.log('  - Suppression CustomerBike...');
    await prisma.customerBike.deleteMany();
    
    console.log('  - Suppression Customer...');
    await prisma.customer.deleteMany();
    
    console.log('  - Suppression Booking...');
    await prisma.booking.deleteMany();
    
    console.log('  - Suppression CalendarEvent...');
    await prisma.calendarEvent.deleteMany();
    
    console.log('  - Suppression CalendarBlock...');
    await prisma.calendarBlock.deleteMany();
    
    console.log('  - Suppression StockMovement...');
    await prisma.stockMovement.deleteMany();
    
    console.log('  - Suppression CatalogItem...');
    await prisma.catalogItem.deleteMany();
    
    console.log('  - Suppression SupplierOffer...');
    await prisma.supplierOffer.deleteMany();
    
    console.log('  - Suppression SupplierItem...');
    await prisma.supplierItem.deleteMany();
    
    console.log('  - Suppression SupplierCredential...');
    await prisma.supplierCredential.deleteMany();
    
    console.log('  - Suppression Supplier...');
    await prisma.supplier.deleteMany();
    
    console.log('  - Suppression InvoiceSequence...');
    await prisma.invoiceSequence.deleteMany();
    
    console.log('  - Suppression PricingMargin...');
    await prisma.pricingMargin.deleteMany();
    
    console.log('  - Suppression GlobalSetting...');
    await prisma.globalSetting.deleteMany();
    
    console.log('  - Suppression SystemSettings...');
    await prisma.systemSettings.deleteMany();
    
    console.log('  - Suppression AppSetting...');
    await prisma.appSetting.deleteMany();
    
    console.log('  - Suppression Session...');
    await prisma.session.deleteMany();
    
    console.log('  - Suppression Account...');
    await prisma.account.deleteMany();
    
    console.log('  - Suppression User...');
    await prisma.user.deleteMany();

    console.log('✅ Toutes les données supprimées\n');

    // 2. Créer UN SEUL utilisateur
    console.log('👤 Création du compte unique...');
    
    const hashedPassword = await hash('AtelierVelo2025!', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'atelier@upgradedbikes.com',
        password: hashedPassword,
        name: 'Jérôme Leyssard',
        role: 'admin',
        active: true,
      },
    });

    console.log('✅ Utilisateur créé:', user.email);

    // 3. Créer les settings par défaut
    const settings = await prisma.appSetting.create({
      data: {
        userId: user.id,
        shopName: 'Atelier Vélo+',
        shopEmail: 'atelier@upgradedbikes.com',
        shopPhone: null,
        address1: null,
        city: null,
        zip: null,
        country: 'France',
      },
    });

    console.log('✅ Settings créés pour:', settings.shopName);

    console.log('\n🎉 Reset terminé!\n');
    console.log('📧 Email: atelier@upgradedbikes.com');
    console.log('🔑 Mot de passe: AtelierVelo2025!');
    console.log('\n💡 Connexion: http://localhost:3000/auth/login\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
resetToSingleUser();
