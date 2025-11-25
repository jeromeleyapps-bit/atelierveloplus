#!/usr/bin/env node
/**
 * Script professionnel de correction des entités JSX non échappées
 * Remplace automatiquement les caractères ' et " par leurs entités HTML
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Correction des entités JSX non échappées\n');
console.log('═'.repeat(60));

// Obtenir la liste des fichiers avec des erreurs react/no-unescaped-entities
console.log('\n📊 Analyse des erreurs...');
let lintOutput;
try {
  execSync('npm run lint:ci', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  lintOutput = e.stdout || e.output?.join('') || '';
}

// Parser les erreurs
const fileErrors = new Map();
const lines = lintOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  // Détecter le fichier
  if (line.match(/^[A-Z]:\\/)) {
    currentFile = line.trim();
  }
  // Détecter les erreurs react/no-unescaped-entities
  else if (line.includes('react/no-unescaped-entities')) {
    const match = line.match(/(\d+):(\d+)/);
    if (match && currentFile && (currentFile.endsWith('.tsx') || currentFile.endsWith('.jsx'))) {
      if (!fileErrors.has(currentFile)) {
        fileErrors.set(currentFile, []);
      }
      fileErrors.get(currentFile).push({
        line: parseInt(match[1]),
        col: parseInt(match[2])
      });
    }
  }
}

console.log(`✓ ${fileErrors.size} fichiers à corriger\n`);

// Corriger chaque fichier
let fixedCount = 0;

for (const [filePath, _errors] of fileErrors.entries()) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remplacer les apostrophes et guillemets dans les textes JSX
    // Pattern : >texte avec ' ou " <
    content = content.replace(/>([^<]*['""][^<]*)</g, (match, text) => {
      const fixed = text
        .replace(/'/g, '&apos;')
        .replace(/"/g, '&quot;');
      if (fixed !== text) {
        modified = true;
      }
      return `>${fixed}<`;
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      console.log(`✓ ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (e) {
    console.error(`✗ Erreur sur ${filePath}: ${e.message}`);
  }
}

console.log('\n' + '═'.repeat(60));
console.log(`\n✅ ${fixedCount} fichiers corrigés\n`);

