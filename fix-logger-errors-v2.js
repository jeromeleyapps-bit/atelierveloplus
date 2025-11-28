#!/usr/bin/env node

/**
 * Script V2 pour corriger les erreurs restantes de logger TypeScript
 * Corrige les patterns spécifiques identifiés
 */

const fs = require('fs');
const path = require('path');

// Fichiers à corriger
const filesToFix = [
  'src/lib/db.ts',
  'src/lib/email-logger.ts',
  'src/lib/email-with-db-config.ts',
  'src/lib/jwt.ts',
  'src/lib/monitoring.ts'
];

console.log('🔧 Correction V2 des erreurs logger...');

filesToFix.forEach(filePath => {
  try {
    const fullPath = path.join(__dirname, filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf-8');
    let changes = 0;
    
    // Pattern: logger.info(message, stringVariable)
    content = content.replace(
      /logger\.info\(([^,]+),\s*([^)]+)\)/g,
      (match, message, context) => {
        // Si context est une variable simple (pas un objet)
        if (!context.trim().startsWith('{') && !context.trim().startsWith('`')) {
          changes++;
          return `logger.info(${message}, { value: ${context.trim()} })`;
        }
        return match;
      }
    );
    
    // Pattern: logger.error(message, error)
    content = content.replace(
      /logger\.error\(([^,]+),\s*error\)/g,
      (match, message) => {
        changes++;
        return `logger.error(${message}, { error })`;
      }
    );
    
    // Pattern: logger.error(message, error instanceof Error ? error.message : 'Unknown error')
    content = content.replace(
      /logger\.error\(([^,]+),\s*error instanceof Error \? error\.message : 'Unknown error'\)/g,
      (match, message) => {
        changes++;
        return `logger.error(${message}, { error: error instanceof Error ? error.message : 'Unknown error' })`;
      }
    );
    
    // Pattern: logger.error(message, Error)
    content = content.replace(
      /logger\.error\(([^,]+),\s*Error\)/g,
      (match, message) => {
        changes++;
        return `logger.error(${message}, { error: Error })`;
      }
    );
    
    // Pattern: logger.error(message, error, options)
    content = content.replace(
      /logger\.error\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
      (match, message, error, options) => {
        changes++;
        return `logger.error(${message}, { ${error}, ${options} })`;
      }
    );
    
    // Pattern: logger.info(message, dbConfig.host)
    content = content.replace(
      /logger\.info\(([^,]+),\s*dbConfig\.host\)/g,
      (match, message) => {
        changes++;
        return `logger.info(${message}, { host: dbConfig.host })`;
      }
    );
    
    // Pattern: logger.info(message, options.to)
    content = content.replace(
      /logger\.info\(([^,]+),\s*options\.to\)/g,
      (match, message) => {
        changes++;
        return `logger.info(${message}, { to: options.to })`;
      }
    );
    
    // Pattern: logger.info(message, info.messageId)
    content = content.replace(
      /logger\.info\(([^,]+),\s*info\.messageId\)/g,
      (match, message) => {
        changes++;
        return `logger.info(${message}, { messageId: info.messageId })`;
      }
    );
    
    // Pattern: logger.error(message, errorText)
    content = content.replace(
      /logger\.error\(([^,]+),\s*errorText\)/g,
      (match, message) => {
        changes++;
        return `logger.error(${message}, { error: errorText })`;
      }
    );
    
    // Pattern: logger.info(message, process.env.PRISMA_QUERY_ENGINE_LIBRARY)
    content = content.replace(
      /logger\.info\(([^,]+),\s*process\.env\.PRISMA_QUERY_ENGINE_LIBRARY\)/g,
      (match, message) => {
        changes++;
        return `logger.info(${message}, { engine: process.env.PRISMA_QUERY_ENGINE_LIBRARY })`;
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

console.log('🎉 Correction V2 terminée!');
