/**
 * GÉNÉRATEUR DE CLÉS RSA - ATELIER VÉLO+
 * 
 * Génère une paire de clés RSA (privée + publique)
 * À exécuter UNE SEULE FOIS pour créer les clés
 * 
 * Usage:
 *   node generate-rsa-keys.js
 * 
 * Output:
 *   - private-key.pem (À PROTÉGER, jamais partager)
 *   - public-key.pem (À EMBARQUER dans l'application)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateRSAKeys() {
  console.log('🔐 Génération de la paire de clés RSA...\n');
  
  // Générer paire de clés RSA 2048 bits
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048, // 2048 bits (sécurité standard)
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  // Sauvegarder clé privée (PROTÉGÉE)
  const privateKeyPath = path.join(__dirname, 'private-key.pem');
  fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 }); // Permissions restrictives
  console.log('✅ Clé privée sauvegardée: private-key.pem');
  console.log('   ⚠️  À PROTÉGER - Ne jamais partager ou commiter dans Git!\n');
  
  // Sauvegarder clé publique (peut être partagée)
  const publicKeyPath = path.join(__dirname, 'public-key.pem');
  fs.writeFileSync(publicKeyPath, publicKey);
  console.log('✅ Clé publique sauvegardée: public-key.pem');
  console.log('   ℹ️  À embarquée dans l\'application\n');
  
  // Générer aussi version base64 pour embedding dans code
  const publicKeyBase64 = Buffer.from(publicKey).toString('base64');
  const publicKeyPathBase64 = path.join(__dirname, 'public-key-base64.txt');
  fs.writeFileSync(publicKeyPathBase64, publicKeyBase64);
  console.log('✅ Clé publique (base64) sauvegardée: public-key-base64.txt');
  console.log('   ℹ️  Pour embedding dans le code TypeScript (optionnel)\n');
  
  console.log('='.repeat(60));
  console.log('✅ Paire de clés générée avec succès!');
  console.log('='.repeat(60));
  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. Ajouter private-key.pem à .gitignore');
  console.log('2. Copier public-key.pem dans src/lib/license-rsa-public.pem');
  console.log('3. Modifier generate-license.js pour utiliser la signature RSA');
  console.log('4. Modifier license-manager.ts pour valider la signature RSA\n');
}

generateRSAKeys();

