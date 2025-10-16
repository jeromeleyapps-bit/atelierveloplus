/**
 * Vérifier les paramètres magasin actuels
 * Usage: node check-shop-settings.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkShopSettings() {
  const prisma = new PrismaClient();
  
  console.log('\n🏪 PARAMÈTRES MAGASIN\n');
  console.log('='.repeat(60));
  
  try {
    // Vérifier dans la base de données
    const settings = await prisma.appSetting.findFirst({
      select: {
        shopName: true,
        shopEmail: true,
        shopPhone: true,
        address1: true,
        city: true,
        zip: true,
        siret: true,
        tva: true,
      }
    });
    
    console.log('\n📊 BASE DE DONNÉES (AppSetting):');
    if (settings) {
      console.log('  Nom:', settings.shopName || '❌ Non défini');
      console.log('  Email:', settings.shopEmail || '❌ Non défini');
      console.log('  Téléphone:', settings.shopPhone || '❌ Non défini');
      console.log('  Adresse:', settings.address1 || '❌ Non défini');
      console.log('  Ville:', settings.city || '❌ Non défini');
      console.log('  Code postal:', settings.zip || '❌ Non défini');
      console.log('  SIRET:', settings.siret || '❌ Non défini');
      console.log('  TVA:', settings.tva || '❌ Non défini');
    } else {
      console.log('  ❌ Aucun paramètre trouvé en base');
    }
    
    console.log('\n🔧 VARIABLES D\'ENVIRONNEMENT (.env):');
    console.log('  Nom:', process.env.SHOP_NAME || '❌ Non défini');
    console.log('  Email:', process.env.SHOP_EMAIL || '❌ Non défini');
    console.log('  Téléphone:', process.env.SHOP_PHONE || '❌ Non défini');
    console.log('  Adresse:', process.env.SHOP_ADDRESS1 || '❌ Non défini');
    console.log('  Ville:', process.env.SHOP_CITY || '❌ Non défini');
    console.log('  Code postal:', process.env.SHOP_ZIP || '❌ Non défini');
    console.log('  SIRET:', process.env.SHOP_SIRET || '❌ Non défini');
    console.log('  TVA:', process.env.SHOP_TVA || '❌ Non défini');
    
    console.log('\n✅ VALEURS UTILISÉES (avec priorités):');
    const finalName = settings?.shopName || process.env.SHOP_NAME || 'Atelier Vélo+';
    const finalEmail = settings?.shopEmail || process.env.SHOP_EMAIL || 'N/A';
    const finalPhone = settings?.shopPhone || process.env.SHOP_PHONE || 'N/A';
    const finalAddress = settings?.address1 || process.env.SHOP_ADDRESS1 || 'N/A';
    const finalCity = settings?.city || process.env.SHOP_CITY || 'N/A';
    
    console.log('  Nom:', finalName);
    console.log('  Email:', finalEmail);
    console.log('  Téléphone:', finalPhone);
    console.log('  Adresse:', finalAddress);
    console.log('  Ville:', finalCity);
    
    console.log('\n💡 RECOMMANDATION:');
    if (!settings || !settings.shopName) {
      console.log('  ⚠️  Remplis les paramètres dans l\'application (Admin > Paramètres)');
      console.log('  ⚠️  pour ne plus dépendre des variables d\'environnement');
    } else {
      console.log('  ✅ Les paramètres sont configurés dans l\'application');
      console.log('  ✅ Les emails utilisent les infos de la base de données');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

checkShopSettings();
