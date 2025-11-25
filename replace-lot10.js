const fs = require('fs');
const path = require('path');

// Lot 10 : 10 fichiers src/app et src/components avec occurrences
const lot10Files = [
  'src/components/catalog-v2/MyStockTab.tsx',
  'src/app/scan/page.tsx',
  'src/app/admin/catalog/page.tsx',
  'src/app/finance/components/QuotesTab.tsx',
  'src/app/finance/invoices/[id]/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/components/LineItemSelector.tsx',
  'src/app/admin/calendar/page.tsx',
  'src/app/components/NavBanner.tsx',
  'src/hooks/useCashRegisterMutations.ts'
];

const loggerImport = "import { logger } from '@/lib/logger';";

function processFile(filePath) {
  const fullPath = path.join('c:\\atelier', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Fichier non trouvé: ${filePath}`);
    return { success: false, occurrences: 0 };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Vérifier s'il y a des console.*
  const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);
  if (!consoleMatches || consoleMatches.length === 0) {
    console.log(`⏭️  Aucun console.* dans: ${filePath}`);
    return { success: false, occurrences: 0 };
  }

  console.log(`\n📝 Traitement: ${filePath}`);
  console.log(`   Occurrences trouvées: ${consoleMatches.length}`);

  // Vérifier si l'import logger existe déjà
  const hasLoggerImport = content.includes("from '@/lib/logger'");
  
  if (!hasLoggerImport) {
    // Trouver la position après les imports existants
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('import ') || trimmed.startsWith("import{")) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, loggerImport);
      content = lines.join('\n');
      console.log(`   ✅ Import logger ajouté`);
    } else {
      // Si pas d'import trouvé, ajouter au début après les directives 'use client'/'use server'
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("'use ") || lines[i].trim().startsWith('"use ')) {
          insertIndex = i + 1;
          break;
        }
      }
      lines.splice(insertIndex, 0, loggerImport);
      content = lines.join('\n');
      console.log(`   ✅ Import logger ajouté (après directives)`);
    }
  }

  // Remplacer console.* par logger.*
  let modified = content;
  modified = modified.replace(/console\.log\(/g, 'logger.info(');
  modified = modified.replace(/console\.warn\(/g, 'logger.warn(');
  modified = modified.replace(/console\.error\(/g, 'logger.error(');
  modified = modified.replace(/console\.info\(/g, 'logger.info(');
  modified = modified.replace(/console\.debug\(/g, 'logger.debug(');

  // Écrire le fichier modifié
  fs.writeFileSync(fullPath, modified, 'utf8');
  console.log(`   ✅ Fichier modifié et sauvegardé`);
  
  return { success: true, occurrences: consoleMatches.length };
}

console.log('🚀 Démarrage du traitement du Lot 10...\n');
console.log('📦 Lot 10 : 10 fichiers src/app et src/components\n');

let processed = 0;
let skipped = 0;
let totalOccurrences = 0;

lot10Files.forEach(file => {
  const result = processFile(file);
  if (result.success) {
    processed++;
    totalOccurrences += result.occurrences;
  } else {
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ Lot 10 terminé !`);
console.log(`   Fichiers traités: ${processed}`);
console.log(`   Fichiers ignorés: ${skipped}`);
console.log(`   Occurrences éliminées: ${totalOccurrences}`);
console.log('='.repeat(60));
console.log(`\n📊 Progression globale estimée:`);
console.log(`   Fichiers traités: ${53 + processed} fichiers`);
console.log(`   logger.* ajoutés: ${271 + totalOccurrences} occurrences`);

