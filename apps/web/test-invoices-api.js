/**
 * Test de la route /api/finance/invoices
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function testInvoices() {
  console.log('\n🔍 TEST ROUTE INVOICES\n');
  console.log('='.repeat(60));
  
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('✅ Prisma connecté');
    
    // Test query invoices
    console.log('\n📊 Test requête invoices...');
    const invoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        workOrder: {
          include: {
            customer: true
          }
        }
      }
    });
    
    console.log(`✅ ${invoices.length} factures trouvées`);
    
    if (invoices.length === 0) {
      console.log('\n💡 Aucune facture - C\'est normal pour une nouvelle base');
      console.log('   Le dashboard devrait afficher "Aucune facture"');
    } else {
      console.log('\n📋 Exemples de factures:');
      invoices.slice(0, 3).forEach(inv => {
        console.log(`  - ${inv.number || inv.id}: ${inv.totalTTC}€ (${inv.status})`);
      });
    }
    
    console.log('\n✅ La route /api/finance/invoices devrait fonctionner');
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    
    if (error.message.includes('workOrder')) {
      console.error('\n🔧 PROBLÈME: Relation workOrder cassée');
      console.error('   Solution: Vérifier que toutes les factures ont un workOrderId valide');
    }
    
    if (error.message.includes('customer')) {
      console.error('\n🔧 PROBLÈME: Relation customer cassée');
      console.error('   Solution: Vérifier que tous les workOrders ont un customerId valide');
    }
    
    console.error('\nStack:', error.stack);
    
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

testInvoices();
