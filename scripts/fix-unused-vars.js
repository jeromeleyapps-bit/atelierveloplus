#!/usr/bin/env node
/**
 * Script professionnel de correction des variables non utilisées
 * Stratégie :
 * 1. Imports non utilisés → Supprimer
 * 2. Paramètres de fonction non utilisés → Préfixer par _
 * 3. Variables locales non utilisées → Supprimer si safe, sinon préfixer par _
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Correction des variables non utilisées\n');
console.log('═'.repeat(60));

// Obtenir la liste des erreurs no-unused-vars
console.log('\n📊 Analyse des erreurs...');
let lintOutput;
try {
  execSync('npm run lint:ci', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  lintOutput = e.stdout || e.output?.join('') || '';
}

// Parser les erreurs
const errors = [];
const lines = lintOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  // Détecter le fichier
  if (line.match(/^[A-Z]:\\/)) {
    currentFile = line.trim();
  }
  // Détecter les erreurs no-unused-vars
  else if (line.includes('is defined but never used') || line.includes('is assigned a value but never used')) {
    const match = line.match(/(\d+):(\d+)\s+error\s+'([^']+)'/);
    if (match && currentFile) {
      errors.push({
        file: currentFile,
        line: parseInt(match[1]),
        col: parseInt(match[2]),
        varName: match[3]
      });
    }
  }
}

console.log(`✓ ${errors.length} variables non utilisées détectées`);

// Grouper par fichier
const fileErrors = {};
errors.forEach(err => {
  if (!fileErrors[err.file]) {
    fileErrors[err.file] = [];
  }
  fileErrors[err.file].push(err);
});

console.log(`✓ ${Object.keys(fileErrors).length} fichiers à corriger\n`);

// Corriger chaque fichier
let fixedCount = 0;
let skippedCount = 0;

for (const [filePath, fileErrs] of Object.entries(fileErrors)) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    // Trier par ligne décroissante pour ne pas décaler les numéros de ligne
    fileErrs.sort((a, b) => b.line - a.line);

    for (const err of fileErrs) {
      const lineIdx = err.line - 1;
      if (lineIdx < 0 || lineIdx >= lines.length) continue;

      const line = lines[lineIdx];
      const varName = err.varName;

      // Stratégie 1 : Import non utilisé → Supprimer
      if (line.includes('import') && line.includes(varName)) {
        // Import unique sur la ligne
        if (line.match(new RegExp(`^\\s*import\\s+${varName}\\s+from`))) {
          lines[lineIdx] = ''; // Supprimer la ligne
          modified = true;
          continue;
        }
        // Import dans une liste
        const importMatch = line.match(/import\s*\{([^}]+)\}\s*from/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(i => i.trim()).filter(i => i !== varName);
          if (imports.length === 0) {
            lines[lineIdx] = ''; // Supprimer toute la ligne si plus d'imports
          } else {
            lines[lineIdx] = line.replace(/\{[^}]+\}/, `{ ${imports.join(', ')} }`);
          }
          modified = true;
          continue;
        }
      }

      // Stratégie 2 : Paramètre de fonction → Préfixer par _
      if (line.includes('(') && line.includes(varName) && !line.includes('import')) {
        // Remplacer le paramètre par _paramètre
        lines[lineIdx] = line.replace(
          new RegExp(`\\b${varName}\\b(?=\\s*[,:\\)])`, 'g'),
          `_${varName}`
        );
        modified = true;
        continue;
      }

      // Stratégie 3 : Variable locale → Préfixer par _ (safe)
      if (line.includes('const') || line.includes('let') || line.includes('var')) {
        lines[lineIdx] = line.replace(
          new RegExp(`\\b${varName}\\b(?=\\s*[=:])`),
          `_${varName}`
        );
        modified = true;
        continue;
      }
    }

    if (modified) {
      // Nettoyer les lignes vides multiples
      content = lines.join('\n').replace(/\n\n\n+/g, '\n\n');
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      console.log(`✓ ${path.relative(process.cwd(), filePath)}`);
    } else {
      skippedCount++;
    }
  } catch (e) {
    console.error(`✗ Erreur sur ${filePath}: ${e.message}`);
    skippedCount++;
  }
}

console.log('\n' + '═'.repeat(60));
console.log(`\n✅ ${fixedCount} fichiers corrigés`);
console.log(`⏭️  ${skippedCount} fichiers ignorés\n`);

console.log('🔄 Vérification finale...\n');
try {
  execSync('npm run lint:ci 2>&1 | Select-String "no-unused-vars" | Measure-Object | Select-Object -ExpandProperty Count', {
    stdio: 'inherit',
    shell: 'powershell.exe'
  });
} catch (_e) {
  // Ignore
}

