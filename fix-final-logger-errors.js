#!/usr/bin/env node

/**
 * Script final pour corriger TOUTES les erreurs logger restantes
 * Applique les corrections de manière systématique et sécurisée
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction FINALE des erreurs logger TypeScript...');

// Patterns de correction avec leur remplacement
const corrections = [
  // logger.error(message, error) → logger.error(message, { error })
  {
    pattern: /logger\.error\(([^,]+),\s*error\)/g,
    replacement: (match, message) => `logger.error(${message}, { error })`
  },
  // logger.error(message, Error) → logger.error(message, { error: Error })
  {
    pattern: /logger\.error\(([^,]+),\s*Error\)/g,
    replacement: (match, message) => `logger.error(${message}, { error: Error })`
  },
  // logger.error(message, unknown) → logger.error(message, { error: unknown })
  {
    pattern: /logger\.error\(([^,]+),\s*([^)]+)\)/g,
    replacement: (match, message, context) => {
      // Si le contexte n'est pas déjà un objet
      if (!context.trim().startsWith('{') && !context.trim().includes('.')) {
        return `logger.error(${message}, { error: ${context} })`;
      }
      return match;
    }
  },
  // logger.error(message, error.response.data) → logger.error(message, { error: error.response.data })
  {
    pattern: /logger\.error\(([^,]+),\s*error\.response\.data\)/g,
    replacement: (match, message) => `logger.error(${message}, { error: error.response.data })`
  },
  // logger.error(message, error.config?.method...) → logger.error(message, { error })
  {
    pattern: /logger\.error\(`\[API Error\] \${error\.config\?\.method\?\.\toUpperCase\(\)} \${error\.config\?\.url}`, error\)/g,
    replacement: (match) => `logger.error('[API Error]', { error })`
  },
  // logger.error(message, response.status, errorData) → logger.error(message, { status: response.status, error: errorData })
  {
    pattern: /logger\.error\('([^']+)',\s*response\.status,\s*errorData\)/g,
    replacement: (match, message) => `logger.error('${message}', { status: response.status, error: errorData })`
  }
];

// Fonction pour traiter un fichier
function processFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return 0;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let changes = 0;
    
    // Appliquer chaque correction
    corrections.forEach(({ pattern, replacement }) => {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        const matches = before.match(pattern);
        changes += matches ? matches.length : 0;
      }
    });
    
    if (changes > 0) {
      fs.writeFileSync(fullPath, content, 'utf-8');
      console.log(`✅ ${filePath}: ${changes} corrections appliquées`);
    }
    
    return changes;
  } catch (error) {
    console.error(`❌ Erreur traitement ${filePath}:`, error.message);
    return 0;
  }
}

// Lister tous les fichiers avec erreurs TypeScript
const filesWithErrors = [
  'src/hooks/useServiceRatesMutations.ts',
  'src/hooks/useSystemSettings.ts',
  'src/hooks/useSystemSettingsMutations.ts',
  'src/hooks/useTicketsMutations.ts',
  'src/lib/api-error.ts',
  'src/lib/apiClient.ts'
];

// Traiter tous les fichiers
let totalChanges = 0;
filesWithErrors.forEach(file => {
  totalChanges += processFile(file);
});

console.log(`🎉 Correction terminée! ${totalChanges} corrections appliquées au total.`);
