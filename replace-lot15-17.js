const fs = require('fs');
const path = require('path');

// Lots 15-17 : 30 fichiers restants
const allFiles = [
  // Lot 15 - API routes (10 fichiers)
  'src/app/api/calendar/events/route.ts',
  'src/app/api/calendar/blocks/route.ts',
  'src/app/api/admin/jobs/daily/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/bikes/route.ts',
  'src/app/api/cash-register/send-receipt/route.ts',
  'src/app/api/finance/invoices/[id]/route.ts',
  'src/app/api/finance/invoices/[id]/lines/route.ts',
  'src/app/api/finance/quotes/route.ts',
  'src/app/api/workorders/[id]/lines/[lineId]/route.ts',
  
  // Lot 16 - Composants et pages (10 fichiers)
  'src/components/catalog/SellBikeDialog.tsx',
  'src/components/catalog/BikesTab.tsx',
  'src/components/catalog/AddBikeDialog.tsx',
  'src/components/B2BSearchDialog.tsx',
  'src/components/catalog-v2/SuppliersManagementTab.tsx',
  'src/components/providers/SentryProvider.tsx',
  'src/app/components/LicenseStatusBadge.tsx',
  'src/app/components/LicenseBanner.tsx',
  'src/app/components/GlobalTrialBanner.tsx',
  'src/app/components/LineItemsTable.tsx',
  
  // Lot 17 - API routes et pages (10 fichiers)
  'src/app/api/catalog/items/route.ts',
  'src/app/api/customers/import/route.ts',
  'src/app/wizard/page.tsx',
  'src/app/campaigns/page.tsx',
  'src/app/customers/[id]/page.tsx',
  'src/app/customers/[id]/bikes/page.tsx',
  'src/app/fix-auth/page.tsx',
  'src/app/auth/register/page.tsx',
  'src/app/auth/login/page.tsx',
  'src/app/admin/online-booking/page.tsx'
];

const loggerImport = "import { logger } from '@/lib/logger';";

function processFile(filePath) {
  const fullPath = path.join('c:\\atelier', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, occurrences: 0, skipped: true };
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  const consoleMatches = content.match(/console\.(log|warn|error|info|debug)/g);
  if (!consoleMatches || consoleMatches.length === 0) {
    return { success: false, occurrences: 0, skipped: true };
  }

  const hasLoggerImport = content.includes("from '@/lib/logger'");
  
  if (!hasLoggerImport) {
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
    } else {
      let insertIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith("'use ") || lines[i].trim().startsWith('"use ')) {
          insertIndex = i + 1;
          break;
        }
      }
      lines.splice(insertIndex, 0, loggerImport);
      content = lines.join('\n');
    }
  }

  let modified = content;
  modified = modified.replace(/console\.log\(/g, 'logger.info(');
  modified = modified.replace(/console\.warn\(/g, 'logger.warn(');
  modified = modified.replace(/console\.error\(/g, 'logger.error(');
  modified = modified.replace(/console\.info\(/g, 'logger.info(');
  modified = modified.replace(/console\.debug\(/g, 'logger.debug(');

  fs.writeFileSync(fullPath, modified, 'utf8');
  
  return { success: true, occurrences: consoleMatches.length, skipped: false };
}

console.log('🚀 Démarrage du traitement des Lots 15-17...\n');
console.log('📦 Traitement de 30 fichiers en batch\n');

let processed = 0;
let skipped = 0;
let totalOccurrences = 0;
let currentLot = 15;

allFiles.forEach((file, index) => {
  if (index > 0 && index % 10 === 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Lot ${currentLot} terminé !`);
    console.log(`${'='.repeat(60)}\n`);
    currentLot++;
  }
  
  if (index % 10 === 0) {
    console.log(`📦 Lot ${currentLot} - Traitement en cours...\n`);
  }
  
  const result = processFile(file);
  if (result.success) {
    processed++;
    totalOccurrences += result.occurrences;
    console.log(`  ✅ ${file} (${result.occurrences} occurrences)`);
  } else if (!result.skipped) {
    skipped++;
    console.log(`  ⏭️  ${file} (déjà traité)`);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Lot ${currentLot} terminé !`);
console.log(`${'='.repeat(60)}\n`);

console.log('\n' + '='.repeat(60));
console.log(`🎉 LOTS 15-17 TERMINÉS !`);
console.log('='.repeat(60));
console.log(`   Fichiers traités: ${processed}`);
console.log(`   Fichiers ignorés: ${skipped}`);
console.log(`   Occurrences éliminées: ${totalOccurrences}`);
console.log('='.repeat(60));
console.log(`\n📊 Progression globale estimée:`);
console.log(`   Fichiers traités: ${95 + processed} fichiers`);
console.log(`   logger.* ajoutés: ${395 + totalOccurrences} occurrences`);
console.log(`   Progression: ~${Math.round(((395 + totalOccurrences) / 469) * 100)}%`);

