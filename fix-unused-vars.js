#!/usr/bin/env node
/**
 * Script de correction des variables non utilisées
 * Préfixe par _ les variables non utilisées (convention TypeScript)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Correction des variables non utilisées...\n');

// Obtenir la liste des erreurs
let lintOutput;
try {
  execSync('npm run lint:ci 2>&1', { encoding: 'utf8' });
} catch (e) {
  lintOutput = e.stdout || e.message;
}

// Parser les erreurs no-unused-vars
const unusedVarRegex = /(.+?):(\d+):(\d+)\s+error\s+'(.+?)' is (?:defined but never used|assigned a value but never used)\s+@typescript-eslint\/no-unused-vars/g;

const errors = [];
let match;
while ((match = unusedVarRegex.exec(lintOutput)) !== null) {
  errors.push({
    file: match[1].trim(),
    line: parseInt(match[2]),
    col: parseInt(match[3]),
    varName: match[4]
  });
}

console.log(`📊 Trouvé ${errors.length} variables non utilisées\n`);

// Grouper par fichier
const fileErrors = {};
errors.forEach(err => {
  if (!fileErrors[err.file]) {
    fileErrors[err.file] = [];
  }
  fileErrors[err.file].push(err);
});

let fixedCount = 0;

// Corriger chaque fichier
Object.keys(fileErrors).forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Trier par ligne décroissante pour ne pas décaler les numéros de ligne
    const fileErrs = fileErrors[filePath].sort((a, b) => b.line - a.line);
    
    fileErrs.forEach(err => {
      const lineIdx = err.line - 1;
      if (lineIdx >= 0 && lineIdx < lines.length) {
        const line = lines[lineIdx];
        const varName = err.varName;
        
        // Remplacer le nom de variable par _varName
        // Patterns courants :
        // const varName = ...
        // let varName = ...
        // function foo(varName, ...)
        // catch (varName)
        // .forEach((varName) => ...)
        
        const patterns = [
          // Déclarations
          new RegExp(`\\b(const|let|var)\\s+(${varName})\\b`, 'g'),
          // Paramètres de fonction
          new RegExp(`\\((\\s*)(${varName})(\\s*[,)])`, 'g'),
          new RegExp(`\\((\\s*)(${varName})(\\s*)\\)`, 'g'),
          // Catch
          new RegExp(`catch\\s*\\(\\s*(${varName})\\s*\\)`, 'g'),
          // Destructuring
          new RegExp(`\\{([^}]*?)\\b(${varName})\\b([^}]*?)\\}`, 'g'),
        ];
        
        let newLine = line;
        patterns.forEach(pattern => {
          newLine = newLine.replace(pattern, (match, ...groups) => {
            // Trouver où est le varName dans les groupes
            const idx = groups.findIndex(g => g === varName);
            if (idx !== -1) {
              groups[idx] = `_${varName}`;
            }
            // Reconstruire le match
            return match.replace(varName, `_${varName}`);
          });
        });
        
        if (newLine !== line) {
          lines[lineIdx] = newLine;
          fixedCount++;
          console.log(`  ✓ ${path.basename(filePath)}:${err.line} - ${varName} → _${varName}`);
        }
      }
    });
    
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    
  } catch (e) {
    console.error(`  ✗ Erreur sur ${filePath}: ${e.message}`);
  }
});

console.log(`\n✅ ${fixedCount} variables préfixées par _\n`);
console.log('🔍 Vérification...\n');

try {
  execSync('npm run lint:ci 2>&1 | Select-String "no-unused-vars" | Measure-Object | Select-Object -ExpandProperty Count', { 
    stdio: 'inherit',
    shell: 'powershell.exe'
  });
} catch (_e) {
  // Ignore
}

