/**
 * Seed Test Licenses - Phase 2.1
 * Génère des licences de test pour Trial, Basique, Pro, et Pro Lifetime
 */

import { PrismaClient } from '@prisma/client';
import { PRICING } from '../src/lib/license-manager';

type SeedTier = 'trial' | 'basique' | 'pro' | 'pro_lifetime';

/**
 * Générateur de clés de licence pour les SEEDS DE TEST uniquement.
 * Ces clés ne sont pas signées RSA et ne doivent pas être utilisées pour la génération réelle.
 */
function generateTestLicenseKey(tier: SeedTier, expiryDate?: Date): string {
  const prefixMap: Record<SeedTier, string> = {
    trial: 'AVTR',
    basique: 'AVBS',
    pro: 'AVPR',
    pro_lifetime: 'AVPL',
  };

  const prefix = prefixMap[tier];

  // Segment aléatoire simple (4 chars hex)
  const randomSegment = Math.random().toString(16).slice(2, 6).toUpperCase().padEnd(4, 'A');

  // Segment expiration MMYY ou 0000 si non applicable
  let expirySegment = '0000';
  if (expiryDate) {
    const month = (expiryDate.getMonth() + 1).toString().padStart(2, '0');
    const year = expiryDate.getFullYear().toString().slice(-2);
    expirySegment = `${month}${year}`;
  }

  // Signature factice 512 chars (hex) pour respecter le format attendu
  const fakeSignature = 'F'.repeat(512);

  return `${prefix}-${randomSegment}-${expirySegment}-${fakeSignature}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('🎫 Seeding Test Licenses - Phase 2.1...\n');

  const licenses = [];

  // 2 licences Trial (14 jours)
  console.log('Creating TRIAL licenses...');
  for (let i = 1; i <= 2; i++) {
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + PRICING.trial.duration);
    
    const key = generateTestLicenseKey('trial', trialEnd);
    licenses.push({
      key,
      tier: 'trial',
      status: 'active',
      maxEmailsPerMonth: -1, // Illimité pendant trial
      emailsThisMonth: 0,
      emailResetDate: new Date(),
      trialStartedAt: trialStart,
      trialEndsAt: trialEnd,
      isLifetime: false,
      marketingEnabled: true, // Trial = features PRO
      bookingEnabled: true,
      advancedStatsEnabled: true,
      pdfDirectSendEnabled: true,
      expiresAt: null,
      customerEmail: `trial-test-${i}@example.com`,
      customerName: `Test Trial ${i}`,
    });
  }

  // 3 licences Basique (199€/an)
  console.log('Creating BASIQUE licenses...');
  for (let i = 1; i <= 3; i++) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Valide 1 an
    
    const key = generateTestLicenseKey('basique', expiryDate);
    licenses.push({
      key,
      tier: 'basique',
      status: 'active',
      maxEmailsPerMonth: PRICING.basique.maxEmailsPerMonth, // 30
      emailsThisMonth: 0,
      emailResetDate: new Date(),
      trialStartedAt: null,
      trialEndsAt: null,
      isLifetime: false,
      marketingEnabled: false,
      bookingEnabled: false,
      advancedStatsEnabled: false,
      pdfDirectSendEnabled: false, // Peut créer PDF mais pas envoyer
      expiresAt: expiryDate,
      customerEmail: `basique-test-${i}@example.com`,
      customerName: `Test Basique ${i}`,
    });
  }

  // 3 licences Pro (359€/an)
  console.log('Creating PRO licenses...');
  for (let i = 1; i <= 3; i++) {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Valide 1 an
    
    const key = generateTestLicenseKey('pro', expiryDate);
    licenses.push({
      key,
      tier: 'pro',
      status: 'active',
      maxEmailsPerMonth: -1, // Illimité
      emailsThisMonth: 0,
      emailResetDate: new Date(),
      trialStartedAt: null,
      trialEndsAt: null,
      isLifetime: false,
      marketingEnabled: true,
      bookingEnabled: true,
      advancedStatsEnabled: true,
      pdfDirectSendEnabled: true,
      expiresAt: expiryDate,
      customerEmail: `pro-test-${i}@example.com`,
      customerName: `Test Pro ${i}`,
    });
  }

  // 2 licences Pro Lifetime (599€ one-time)
  console.log('Creating PRO LIFETIME licenses...');
  for (let i = 1; i <= 2; i++) {
    const maintenanceExpiry = new Date();
    maintenanceExpiry.setFullYear(maintenanceExpiry.getFullYear() + PRICING.pro_lifetime.maintenanceYears);
    
    const key = generateTestLicenseKey('pro_lifetime');
    licenses.push({
      key,
      tier: 'pro_lifetime',
      status: 'active',
      maxEmailsPerMonth: -1, // Illimité
      emailsThisMonth: 0,
      emailResetDate: new Date(),
      trialStartedAt: null,
      trialEndsAt: null,
      isLifetime: true,
      maintenanceExpiresAt: maintenanceExpiry,
      marketingEnabled: true,
      bookingEnabled: true,
      advancedStatsEnabled: true,
      pdfDirectSendEnabled: true,
      expiresAt: null, // Pas d'expiration pour lifetime
      customerEmail: `lifetime-test-${i}@example.com`,
      customerName: `Test Lifetime ${i}`,
    });
  }

  let created = 0;
  let skipped = 0;

  for (const license of licenses) {
    try {
      // Vérifier si la clé existe déjà
      const existing = await prisma.license.findUnique({
        where: { key: license.key },
      });

      if (existing) {
        console.log(`⏭️  Skipped: ${license.key} (already exists)`);
        skipped++;
      } else {
        await prisma.license.create({
          data: license,
        });
        
        const expiryInfo = license.expiresAt 
          ? ` - Expires: ${license.expiresAt.toLocaleDateString('fr-FR')}`
          : license.maintenanceExpiresAt
          ? ` - Maintenance until: ${license.maintenanceExpiresAt.toLocaleDateString('fr-FR')}`
          : license.trialEndsAt
          ? ` - Trial ends: ${license.trialEndsAt.toLocaleDateString('fr-FR')}`
          : ' - No expiry';
        
        console.log(`✅ Created: ${license.key} (${license.tier.toUpperCase()})${expiryInfo}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error with ${license.key}:`, error);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${licenses.length}`);
  console.log('\n✅ Seeding completed!');
  
  console.log('\n📋 CLÉS GÉNÉRÉES PAR TIER:');
  
  console.log('\n--- TRIAL (14 jours gratuit) ---');
  licenses.filter(l => l.tier === 'trial').forEach((l, i) => {
    console.log(`${i + 1}. ${l.key} → Expires ${l.trialEndsAt?.toLocaleDateString('fr-FR')}`);
  });
  
  console.log('\n--- BASIQUE (199€/an, 30 emails/mois) ---');
  licenses.filter(l => l.tier === 'basique').forEach((l, i) => {
    console.log(`${i + 1}. ${l.key}`);
  });
  
  console.log('\n--- PRO (359€/an, illimité) ---');
  licenses.filter(l => l.tier === 'pro').forEach((l, i) => {
    console.log(`${i + 1}. ${l.key}`);
  });
  
  console.log('\n--- PRO LIFETIME (599€ one-time, maintenance 3 ans) ---');
  licenses.filter(l => l.tier === 'pro_lifetime').forEach((l, i) => {
    console.log(`${i + 1}. ${l.key} → Maintenance until ${l.maintenanceExpiresAt?.toLocaleDateString('fr-FR')}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
