const fs = require('fs');
const path = require('path');

// Lot 6 : 10 fichiers src/app/api (suite)
const lot6Files = [
  'src/app/api/suppliers/search/route.ts',
  'src/app/api/uploads/[...path]/route.ts',
  'src/app/api/workorders/[id]/appointment/route.ts',
  'src/app/api/workshop/workorders/route.ts',
  'src/app/api/admin/backup/route.ts',
  'src/app/api/workshop/workorders/[id]/route.ts',
  'src/app/api/workshop/workorders/[id]/labor/route.ts',
  'src/app/api/workorders/[id]/parts/[partId]/route.ts',
  'src/app/api/support/diagnostics/route.ts',
  'src/app/api/customers/import/route.ts'
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
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, loggerImport);
      content = lines.join('\n');
      console.log(`   ✅ Import logger ajouté`);
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

console.log('🚀 Démarrage du traitement du Lot 6...\n');
console.log('📦 Lot 6 : 10 fichiers src/app/api (suite)\n');

let processed = 0;
let skipped = 0;
let totalOccurrences = 0;

lot6Files.forEach(file => {
  const result = processFile(file);
  if (result.success) {
    processed++;
    totalOccurrences += result.occurrences;
  } else {
    skipped++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✅ Lot 6 terminé !`);
console.log(`   Fichiers traités: ${processed}`);
console.log(`   Fichiers ignorés: ${skipped}`);
console.log(`   Occurrences éliminées: ${totalOccurrences}`);
console.log('='.repeat(60));
console.log(`\n📊 Progression globale estimée:`);
console.log(`   Fichiers: ${50 + processed}/179 (${Math.round((50 + processed) / 179 * 100)}%)`);
console.log(`   Occurrences: ~${311 + totalOccurrences}/590 (${Math.round((311 + totalOccurrences) / 590 * 100)}%)`);

