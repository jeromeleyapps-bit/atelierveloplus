#!/usr/bin/env node
/**
 * Script professionnel de correction des types 'any'
 * Remplace intelligemment 'any' par des types appropriés selon le contexte
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Correction des types "any"\n');
console.log('═'.repeat(60));

// Patterns de remplacement intelligents
const REPLACEMENTS = [
  // Erreurs et exceptions
  { pattern: /\((\w+):\s*any\)\s*=>\s*\{[^}]*error/gi, replacement: '($1: Error) => {' },
  { pattern: /catch\s*\((\w+):\s*any\)/gi, replacement: 'catch ($1: unknown)' },
  { pattern: /\.catch\(\((\w+):\s*any\)/gi, replacement: '.catch(($1: unknown)' },
  
  // Événements React
  { pattern: /\(e:\s*any\)\s*=>\s*\{[^}]*\.preventDefault/gi, replacement: '(e: React.FormEvent) => {' },
  { pattern: /\(e:\s*any\)\s*=>\s*\{[^}]*\.target\.value/gi, replacement: '(e: React.ChangeEvent<HTMLInputElement>) => {' },
  { pattern: /\(event:\s*any\)\s*=>\s*\{[^}]*\.preventDefault/gi, replacement: '(event: React.FormEvent) => {' },
  { pattern: /\(event:\s*any\)\s*=>\s*\{[^}]*\.target\.value/gi, replacement: '(event: React.ChangeEvent<HTMLInputElement>) => {' },
  
  // Paramètres de fonction génériques
  { pattern: /\(data:\s*any\)/gi, replacement: '(data: Record<string, unknown>)' },
  { pattern: /\(params:\s*any\)/gi, replacement: '(params: Record<string, unknown>)' },
  { pattern: /\(options:\s*any\)/gi, replacement: '(options: Record<string, unknown>)' },
  { pattern: /\(config:\s*any\)/gi, replacement: '(config: Record<string, unknown>)' },
  { pattern: /\(payload:\s*any\)/gi, replacement: '(payload: Record<string, unknown>)' },
  
  // Réponses API
  { pattern: /:\s*any\)\s*=>\s*\{[^}]*\.json\(\)/gi, replacement: ': Response) => {' },
  { pattern: /response:\s*any/gi, replacement: 'response: Response' },
  { pattern: /res:\s*any/gi, replacement: 'res: Response' },
  
  // Objets génériques
  { pattern: /:\s*any\[\]/g, replacement: ': unknown[]' },
  { pattern: /:\s*any\s*=/g, replacement: ': unknown =' },
  { pattern: /:\s*any\s*\)/g, replacement: ': unknown)' },
  { pattern: /:\s*any\s*,/g, replacement: ': unknown,' },
  { pattern: /:\s*any\s*;/g, replacement: ': unknown;' },
  { pattern: /:\s*any\s*\|/g, replacement: ': unknown |' },
];

// Obtenir la liste des fichiers avec des erreurs no-explicit-any
console.log('\n📊 Analyse des erreurs...');
let lintOutput;
try {
  execSync('npm run lint:ci', { encoding: 'utf8', stdio: 'pipe' });
} catch (e) {
  lintOutput = e.stdout || e.output?.join('') || '';
}

// Parser les fichiers concernés
const filesSet = new Set();
const lines = lintOutput.split('\n');
let currentFile = null;

for (const line of lines) {
  if (line.match(/^[A-Z]:\\/)) {
    currentFile = line.trim();
  } else if (line.includes('no-explicit-any') && currentFile) {
    filesSet.add(currentFile);
  }
}

const files = Array.from(filesSet);
console.log(`✓ ${files.length} fichiers à corriger\n`);

// Corriger chaque fichier
let fixedCount = 0;
let totalReplacements = 0;

for (const filePath of files) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacements = 0;

    // Appliquer chaque pattern de remplacement
    for (const { pattern, replacement } of REPLACEMENTS) {
      const before = content;
      content = content.replace(pattern, replacement);
      if (content !== before) {
        modified = true;
        replacements++;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      fixedCount++;
      totalReplacements += replacements;
      console.log(`✓ ${path.relative(process.cwd(), filePath)} (${replacements} remplacements)`);
    }
  } catch (e) {
    console.error(`✗ Erreur sur ${filePath}: ${e.message}`);
  }
}

console.log('\n' + '═'.repeat(60));
console.log(`\n✅ ${fixedCount} fichiers corrigés`);
console.log(`📊 ${totalReplacements} types 'any' remplacés\n`);

console.log('🔄 Vérification finale...\n');
try {
  const result = execSync('npm run lint:ci 2>&1 | Select-String "no-explicit-any" | Measure-Object | Select-Object -ExpandProperty Count', {
    encoding: 'utf8',
    shell: 'powershell.exe'
  });
  console.log(`Erreurs 'any' restantes: ${result.trim()}\n`);
} catch (_e) {
  // Ignore
}

