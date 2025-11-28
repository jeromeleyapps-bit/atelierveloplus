#!/usr/bin/env node

/**
 * Script pour corriger automatiquement les erreurs de logger TypeScript
 * Corrige les appels logger.* qui passent des arguments incorrects
 */

const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const filesToFix = [
  'src/lib/license-guards.ts',
  'src/lib/license-manager.ts',
  'src/lib/mailer.ts'
];

console.log('🔧 Correction automatique des erreurs logger...');

filesToFix.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let changes = 0;
    
    // Remplacer logger.error(message, error) → logger.error(message, { error })
    content = content.replace(
      /logger\.error\(([^,]+),\s*error\)/g,
      (match, message) => {
        changes++;
        return `logger.error(${message}, { error })`;
      }
    );
    
    // Remplacer logger.error(message, feature, error) → logger.error(message, { feature, error })
    content = content.replace(
      /logger\.error\(([^,]+),\s*([^,]+),\s*error\)/g,
      (match, message, feature) => {
        changes++;
        return `logger.error(${message}, { ${feature}, error })`;
      }
    );
    
    // Remplacer logger.warn(message, feature) → logger.warn(message, { feature })
    content = content.replace(
      /logger\.warn\(([^,]+),\s*([^)]+)\)/g,
      (match, message, feature) => {
        changes++;
        // Si feature n'est pas un objet, le transformer
        if (!feature.trim().startsWith('{')) {
          return `logger.warn(${message}, { ${feature.trim()} })`;
        }
        return match;
      }
    );
    
    // Remplacer logger.info(message, userId) → logger.info(message, { userId })
    content = content.replace(
      /logger\.info\(([^,]+),\s*userId\)/g,
      (match, message) => {
        changes++;
        return `logger.info(${message}, { userId })`;
      }
    );
    
    if (changes > 0) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ ${filePath}: ${changes} corrections appliquées`);
    } else {
      console.log(`ℹ️  ${filePath}: aucune correction nécessaire`);
    }
    
  } catch (error) {
    console.error(`❌ Erreur traitement ${filePath}:`, error.message);
  }
});

console.log('🎉 Correction terminée!');
