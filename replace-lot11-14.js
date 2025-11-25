const fs = require('fs');
const path = require('path');

// Lots 11-14 : 40 fichiers restants avec occurrences
const allFiles = [
  // Lot 11 - API routes (10 fichiers)
  'src/app/api/admin/backup/route.ts',
  'src/app/api/catalog/barcode/route.ts',
  'src/app/api/catalog/scan/route.ts',
  'src/app/api/workorders/[id]/appointment/route.ts',
  'src/app/api/admin/pricing-margins/route.ts',
  'src/app/api/catalog/migrate-suppliers/route.ts',
  'src/app/api/bikes/[id]/route.ts',
  'src/app/api/workshop/workorders/route.ts',
  'src/app/api/components/catalog-v2/SupplierCatalogTab.tsx',
  'src/components/catalog-v2/SupplierCatalogTab.tsx',
  
  // Lot 12 - Hooks et contexts (10 fichiers)
  'src/hooks/useAdminDashboardData.ts',
  'src/contexts/StockUpdateContext.tsx',
  'src/contexts/RepairTimerContext.tsx',
  'src/hooks/useSystemSettingsMutations.ts',
  'src/hooks/useAdminCatalogData.ts',
  'src/hooks/useBikeSearch.ts',
  'src/hooks/useCreateTicketForm.ts',
  'src/hooks/useLocalStorage.ts',
  'src/hooks/useBookingLocalData.ts',
  'src/hooks/useLogoUpload.ts',
  
  // Lot 13 - Pages et composants (10 fichiers)
  'src/app/admin/settings/page-complete.tsx',
  'src/app/admin/license/page.tsx',
  'src/app/account/components/SimpleBookingSection.tsx',
  'src/app/suppliers/page.tsx',
  'src/app/finance/components/CreateQuoteDialog.tsx',
  'src/app/admin/settings/SmtpConfigCard.tsx',
  'src/app/cash-register/page.tsx',
  'src/app/page.tsx',
  'src/app/admin/page.tsx',
  'src/app/finance/components/SelectTicketDialog.tsx',
  
  // Lot 14 - API routes suite (10 fichiers)
  'src/app/api/tunnel/activate/route.ts',
  'src/app/api/tunnel/deactivate/route.ts',
  'src/app/api/admin/service-rates/import/route.ts',
  'src/app/api/admin/service-rates/route.ts',
  'src/app/api/admin/service-rates/[id]/route.ts',
  'src/app/api/workshop/workorders/[id]/route.ts',
  'src/app/api/workshop/workorders/[id]/labor/route.ts',
  'src/app/api/workshop/workorders/invoiceable/route.ts',
  'src/app/api/workorders/[id]/parts/[partId]/route.ts',
  'src/app/api/support/diagnostics/route.ts'
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

console.log('🚀 Démarrage du traitement des Lots 11-14...\n');
console.log('📦 Traitement de 40 fichiers en batch\n');

let processed = 0;
let skipped = 0;
let totalOccurrences = 0;
let currentLot = 11;
let lotCount = 0;

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
  
  lotCount++;
});

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Lot ${currentLot} terminé !`);
console.log(`${'='.repeat(60)}\n`);

console.log('\n' + '='.repeat(60));
console.log(`🎉 LOTS 11-14 TERMINÉS !`);
console.log('='.repeat(60));
console.log(`   Fichiers traités: ${processed}`);
console.log(`   Fichiers ignorés: ${skipped}`);
console.log(`   Occurrences éliminées: ${totalOccurrences}`);
console.log('='.repeat(60));
console.log(`\n📊 Progression globale estimée:`);
console.log(`   Fichiers traités: ${63 + processed} fichiers`);
console.log(`   logger.* ajoutés: ${318 + totalOccurrences} occurrences`);
console.log(`   Progression: ~${Math.round(((318 + totalOccurrences) / 469) * 100)}%`);

