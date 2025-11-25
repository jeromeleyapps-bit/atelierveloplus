/**
 * GÉNÉRATEUR DE LICENCES - ATELIER VÉLO+ (RSA)
 * ========================================
 * 
 * Génère des clés de licence valides pour les 4 tiers avec signature RSA:
 * - Trial: 14 jours gratuit (AVTR-XXXX-XXXX-512CHARS-RSA)
 * - Basique: 199€/an (AVBS-XXXX-XXXX-512CHARS-RSA)
 * - Pro: 359€/an (AVPR-XXXX-XXXX-512CHARS-RSA)
 * - Pro Lifetime: 599€ à vie (AVPL-XXXX-XXXX-512CHARS-RSA)
 * 
 * Usage:
 *   Option 1 - Date automatique (+365 jours):
 *     node generate-license.js trial
 *     node generate-license.js basique auto
 *     node generate-license.js pro auto
 *     node generate-license.js pro_lifetime
 * 
 *   Option 2 - Date personnalisée:
 *     node generate-license.js basique 31 12 2025
 *     node generate-license.js pro 15 06 2026
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const TIERS = {
  trial: {
    prefix: 'AVTR',
    name: 'Trial (14 jours)',
    price: 'Gratuit',
    duration: 14,
  },
  basique: {
    prefix: 'AVBS',
    name: 'Basique',
    price: '199€/an',
    features: '30 emails/mois, PDF création',
  },
  pro: {
    prefix: 'AVPR',
    name: 'Pro',
    price: '359€/an',
    features: 'Illimité, PDF envoi direct',
  },
  pro_lifetime: {
    prefix: 'AVPL',
    name: 'Pro Lifetime',
    price: '599€ (à vie)',
    features: 'Illimité, maintenance 3 ans',
  },
};

// ============================================
// CONFIGURATION RSA
// ============================================

// Charger la clé privée RSA (à protéger)
let PRIVATE_KEY = null;
try {
  const privateKeyPath = path.join(__dirname, 'private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    PRIVATE_KEY = fs.readFileSync(privateKeyPath, 'utf8');
    console.log('✅ Clé privée RSA chargée');
  } else {
    console.error('❌ ERREUR: Clé privée RSA non trouvée!');
    console.error('   Exécutez d\'abord: node generate-rsa-keys.js');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ ERREUR chargement clé privée:', error.message);
  process.exit(1);
}

// ============================================
// FONCTIONS
// ============================================

/**
 * Calcule signature RSA pour une clé de licence
 * @param {string} data - Données à signer (prefix-randomSegment-expirySegment)
 * @returns {string} Signature RSA en hex (512 chars)
 */
function calculateRSASignature(data) {
  if (!PRIVATE_KEY) {
    throw new Error('Clé privée RSA non disponible. Exécutez generate-rsa-keys.js d\'abord.');
  }
  
  // Signer avec RSA-SHA256
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(data);
  sign.end();
  
  // Signature en hex (512 chars pour RSA 2048)
  const signature = sign.sign(PRIVATE_KEY, 'hex');
  return signature;
}

/**
 * Génère une clé de licence
 * @param {string} tier - Type de licence
 * @param {number|string} dayOrMonth - Jour (si 3 args) ou mois (si 2 args) ou 'auto'
 * @param {number} monthOrYear - Mois (si 3 args) ou année (si 2 args)
 * @param {number} year - Année (si 3 args)
 */
function generateLicenseKey(tier, dayOrMonth, monthOrYear, year) {
  const tierConfig = TIERS[tier];
  if (!tierConfig) {
    throw new Error(`Tier invalide: ${tier}. Tiers valides: ${Object.keys(TIERS).join(', ')}`);
  }
  
  const prefix = tierConfig.prefix;
  
  // Segment aléatoire (4 chars hex)
  const randomSegment = crypto.randomBytes(2).toString('hex').toUpperCase();
  
  // Segment expiration (MMYY)
  let expirySegment = '0000';
  let expiryDate = null;
  
  if (tier === 'pro_lifetime') {
    // Pro Lifetime: pas d'expiration
    expirySegment = '0000';
  } else if (tier === 'trial') {
    // Trial: expiration automatique dans 14 jours
    expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + tierConfig.duration);
    const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
    const yearStr = String(expiryDate.getFullYear()).slice(-2);
    expirySegment = `${month}${yearStr}`;
  } else {
    // Basique ou Pro
    if (dayOrMonth === 'auto') {
      // Option 1: Date automatique (+365 jours)
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 365);
      const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
      const yearStr = String(expiryDate.getFullYear()).slice(-2);
      expirySegment = `${month}${yearStr}`;
    } else if (year) {
      // Option 2: Date complète (jour, mois, année)
      const day = dayOrMonth;
      const month = monthOrYear;
      expiryDate = new Date(year, month - 1, day);
      const monthStr = String(expiryDate.getMonth() + 1).padStart(2, '0');
      const yearStr = String(expiryDate.getFullYear()).slice(-2);
      expirySegment = `${monthStr}${yearStr}`;
    } else {
      // Ancien format (mois, année) pour compatibilité
      const month = dayOrMonth;
      const yearVal = monthOrYear;
      if (!month || !yearVal) {
        throw new Error(`Date requise pour ${tier}. Usage: "auto" ou "jour mois année"`);
      }
      expiryDate = new Date(yearVal, month, 0); // Dernier jour du mois
      const monthStr = String(month).padStart(2, '0');
      const yearStr = String(yearVal).slice(-2);
      expirySegment = `${monthStr}${yearStr}`;
    }
  }
  
  // ✅ NOUVEAU: Signature RSA au lieu de CRC8
  const dataForSignature = `${prefix}-${randomSegment}-${expirySegment}`;
  const signature = calculateRSASignature(dataForSignature);
  
  // Format: AVXX-XXXX-XXXX-512CHARS-RSA (signature = 512 chars hex)
  return {
    key: `${prefix}-${randomSegment}-${expirySegment}-${signature}`,
    expiryDate
  };
}

/**
 * Affiche les informations de la clé
 */
function displayKeyInfo(key, tier, expiryDate, atelierName) {
  const tierConfig = TIERS[tier];
  
  console.log('\n' + '='.repeat(60));
  console.log('  CLÉ DE LICENCE GÉNÉRÉE');
  console.log('='.repeat(60));
  console.log('');
  if (atelierName) {
    console.log(`  Atelier: ${atelierName}`);
  }
  console.log(`  Clé:     ${key}`);
  console.log(`  Tier:    ${tierConfig.name}`);
  console.log(`  Prix:    ${tierConfig.price}`);
  
  if (tierConfig.features) {
    console.log(`  Features: ${tierConfig.features}`);
  }
  
  if (tier === 'pro_lifetime') {
    console.log(`  Expire:  Jamais (Lifetime)`);
    console.log(`  Maintenance: 3 ans inclus`);
  } else if (expiryDate) {
    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`  Expire:  ${expiryDate.toLocaleDateString('fr-FR')} (dans ${daysUntilExpiry} jours)`);
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('');
}

// ============================================
// MAIN
// ============================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('\n' + '='.repeat(60));
    console.log('  GÉNÉRATEUR DE LICENCES - ATELIER VÉLO+');
    console.log('='.repeat(60));
    console.log('');
    console.log('Usage:');
    console.log('  node generate-license.js <tier> [options] [--atelier "Nom Atelier"]');
    console.log('');
    console.log('Tiers disponibles:');
    console.log('  trial         - Trial 14 jours (gratuit)');
    console.log('  basique       - Basique 199€/an (30 emails/mois)');
    console.log('  pro           - Pro 359€/an (illimité)');
    console.log('  pro_lifetime  - Pro Lifetime 599€ (à vie)');
    console.log('');
    console.log('Options de date:');
    console.log('  auto          - Date automatique (+365 jours)');
    console.log('  jour mois année - Date personnalisée complète');
    console.log('');
    console.log('Option atelier:');
    console.log('  --atelier "Nom de l\'atelier"  - Nom du destinataire (optionnel)');
    console.log('');
    console.log('Exemples:');
    console.log('  node generate-license.js trial');
    console.log('  node generate-license.js basique auto --atelier "Vélo Passion"');
    console.log('  node generate-license.js pro auto --atelier "Bike Shop Paris"');
    console.log('  node generate-license.js basique 31 12 2025 --atelier "Cycle Service"');
    console.log('  node generate-license.js pro_lifetime --atelier "Atelier Vélo Pro"');
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    process.exit(0);
  }
  
  // Extraire le nom de l'atelier (--atelier "Nom")
  let atelierName = null;
  const atelierIndex = args.indexOf('--atelier');
  if (atelierIndex !== -1 && args[atelierIndex + 1]) {
    atelierName = args[atelierIndex + 1];
    // Retirer --atelier et sa valeur des args pour le traitement du tier
    args.splice(atelierIndex, 2);
  }
  
  // Si pas de --atelier, demander interactivement
  if (!atelierName) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question('📝 Nom de l\'atelier destinataire (optionnel, appuyez sur Entrée pour ignorer): ', (answer) => {
        atelierName = answer.trim() || null;
        rl.close();
        
        // Traiter les arguments restants
        const tier = args[0];
        const arg1 = args[1];
        const arg2 = args[2] ? parseInt(args[2], 10) : null;
        const arg3 = args[3] ? parseInt(args[3], 10) : null;
        
        try {
          const result = generateLicenseKey(tier, arg1, arg2, arg3);
          displayKeyInfo(result.key, tier, result.expiryDate, atelierName);
          
          // Sauvegarder dans fichier
          const fs = require('fs');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format plus court
          
          // Créer nom de fichier avec nom atelier si fourni
          let filename;
          if (atelierName) {
            // Nettoyer le nom de l'atelier pour le nom de fichier (enlever caractères spéciaux)
            const cleanAtelierName = atelierName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-').substring(0, 50);
            filename = `license-${tier}-${cleanAtelierName}-${timestamp}.txt`;
          } else {
            filename = `license-${tier}-${timestamp}.txt`;
          }
          
          let expiryInfo = '';
          if (tier === 'pro_lifetime') {
            expiryInfo = 'Expire:  Jamais (Lifetime)\nMaintenance: 3 ans inclus';
          } else if (result.expiryDate) {
            expiryInfo = `Expire:  ${result.expiryDate.toLocaleDateString('fr-FR')}`;
          }
          
          const content = `ATELIER VÉLO+ - CLÉ DE LICENCE
================================
${atelierName ? `Atelier: ${atelierName}\n` : ''}
Clé:     ${result.key}
Tier:    ${TIERS[tier].name}
Prix:    ${TIERS[tier].price}
${TIERS[tier].features ? `Features: ${TIERS[tier].features}\n` : ''}${expiryInfo}
Généré:  ${new Date().toLocaleString('fr-FR')}

IMPORTANT:
- Cette clé est à usage unique
- Ne pas partager cette clé
- Conserver ce fichier en lieu sûr
`;
          
          fs.writeFileSync(filename, content, 'utf8');
          console.log(`✅ Clé sauvegardée dans: ${filename}`);
          console.log('');
          
          resolve();
        } catch (error) {
          console.error('\n❌ ERREUR:', error.message);
          console.log('');
          process.exit(1);
        }
      });
    });
  } else {
    // Traitement direct avec --atelier fourni
    const tier = args[0];
    const arg1 = args[1];
    const arg2 = args[2] ? parseInt(args[2], 10) : null;
    const arg3 = args[3] ? parseInt(args[3], 10) : null;
    
    try {
      const result = generateLicenseKey(tier, arg1, arg2, arg3);
      displayKeyInfo(result.key, tier, result.expiryDate, atelierName);
      
      // Sauvegarder dans fichier
      const fs = require('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format plus court
      
      // Créer nom de fichier avec nom atelier
      const cleanAtelierName = atelierName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-').substring(0, 50);
      const filename = `license-${tier}-${cleanAtelierName}-${timestamp}.txt`;
      
      let expiryInfo = '';
      if (tier === 'pro_lifetime') {
        expiryInfo = 'Expire:  Jamais (Lifetime)\nMaintenance: 3 ans inclus';
      } else if (result.expiryDate) {
        expiryInfo = `Expire:  ${result.expiryDate.toLocaleDateString('fr-FR')}`;
      }
      
      const content = `ATELIER VÉLO+ - CLÉ DE LICENCE
================================
Atelier: ${atelierName}

Clé:     ${result.key}
Tier:    ${TIERS[tier].name}
Prix:    ${TIERS[tier].price}
${TIERS[tier].features ? `Features: ${TIERS[tier].features}\n` : ''}${expiryInfo}
Généré:  ${new Date().toLocaleString('fr-FR')}

IMPORTANT:
- Cette clé est à usage unique
- Ne pas partager cette clé
- Conserver ce fichier en lieu sûr
`;
      
      fs.writeFileSync(filename, content, 'utf8');
      console.log(`✅ Clé sauvegardée dans: ${filename}`);
      console.log('');
      
    } catch (error) {
      console.error('\n❌ ERREUR:', error.message);
      console.log('');
      process.exit(1);
    }
  }
}

main();
