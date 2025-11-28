#!/usr/bin/env node

/**
 * Script COMPLET pour corriger TOUTES les erreurs logger TypeScript restantes
 * Applique les corrections sur TOUS les fichiers du projet
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction COMPLÈTE des erreurs logger TypeScript...');

// Trouver tous les fichiers TypeScript/JavaScript dans src/
function findTsFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Patterns de correction
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
      // Si le contexte n'est pas déjà un objet et n'est pas une chaîne littérale
      const trimmed = context.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('"') && !trimmed.startsWith("'") && !trimmed.startsWith('`')) {
        return `logger.error(${message}, { error: ${trimmed} })`;
      }
      return match;
    }
  },
  // logger.warn(message, feature) → logger.warn(message, { feature })
  {
    pattern: /logger\.warn\(([^,]+),\s*([^)]+)\)/g,
    replacement: (match, message, context) => {
      const trimmed = context.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('"') && !trimmed.startsWith("'") && !trimmed.startsWith('`')) {
        return `logger.warn(${message}, { ${trimmed} })`;
      }
      return match;
    }
  },
  // logger.info(message, variable) → logger.info(message, { value: variable })
  {
    pattern: /logger\.info\(([^,]+),\s*([^)]+)\)/g,
    replacement: (match, message, context) => {
      const trimmed = context.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('"') && !trimmed.startsWith("'") && !trimmed.startsWith('`')) {
        return `logger.info(${message}, { value: ${trimmed} })`;
      }
      return match;
    }
  }
];

// Traiter tous les fichiers
const srcDir = path.join(__dirname, 'src');
const allFiles = findTsFiles(srcDir);
let totalChanges = 0;

console.log(`📁 Traitement de ${allFiles.length} fichiers TypeScript...`);

allFiles.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fileChanges = 0;
    
    // Appliquer chaque correction
    corrections.forEach(({ pattern, replacement }) => {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        const matches = before.match(pattern);
        fileChanges += matches ? matches.length : 0;
      }
    });
    
    if (fileChanges > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
      const relativePath = path.relative(__dirname, filePath);
      console.log(`✅ ${relativePath}: ${fileChanges} corrections`);
      totalChanges += fileChanges;
    }
  } catch (error) {
    const relativePath = path.relative(__dirname, filePath);
    console.error(`❌ Erreur ${relativePath}:`, error.message);
  }
});

console.log(`🎉 Correction terminée! ${totalChanges} corrections appliquées sur ${allFiles.length} fichiers.`);
