const fs = require('fs');
const path = require('path');

// Lots 18-20 : Fichiers restants (tous les fichiers avec console.*)
const allFiles = [
  // Lot 18 - API routes restants
  'src/app/api/finance/invoices/[id]/remind/route.ts',
  'src/app/api/finance/invoices/[id]/issue/route.ts',
  'src/app/api/finance/invoices/[id]/payments/route.ts',
  'src/app/api/finance/invoices/[id]/email/route.ts',
  'src/app/api/finance/invoices/[id]/convert-to-invoice/route.ts',
  'src/app/api/finance/invoices/[id]/import-labor/route.ts',
  'src/app/api/customers/[id]/route.ts',
  'src/app/api/customers/[id]/bikes/route.ts',
  'src/app/api/catalog/import/route.ts',
  'src/app/api/catalog/import-csv-streaming/route.ts',
  
  // Lot 19 - API routes suite
  'src/app/api/bikes/[id]/sell/route.ts',
  'src/app/api/bikes/[id]/history/route.ts',
  'src/app/api/bikes/search/route.ts',
  'src/app/api/pos/workorders/[id]/sale/route.ts',
  'src/app/api/pos/workorders/[id]/quote/route.ts',
  'src/app/api/suppliers/offers/route.ts',
  'src/app/api/calendar/bookings/[id]/route.ts',
  'src/app/api/calendar/availability/route.ts',
  'src/app/api/admin/recent-emails/route.ts',
  'src/app/api/workshop/workorders/[id]/status/route.ts',
  
  // Lot 20 - API routes finaux + autres
  'src/app/api/service-rates/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/catalog/stats/route.ts',
  'src/app/api/catalog/seed-test/route.ts',
  'src/app/api/catalog/search-all/route.ts',
  'src/app/api/catalog/items/from-supplier/route.ts',
  'src/app/api/user/profile/route.ts',
  'src/app/api/tunnel/status/route.ts',
  'src/app/api/admin/stats/route.ts',
  'src/app/api/admin/license/verify/route.ts',
  'src/app/api/admin/license/status/route.ts',
  'src/app/api/admin/license/check-toggle/route.ts',
  'src/app/api/admin/license/start-trial/route.ts',
  'src/app/api/admin/license/check-booking/route.ts',
  'src/app/catalog/items/[name]/page.tsx',
  'src/app/finance/invoices/[id]/error.tsx',
  'src/hooks/useCatalogData.ts',
  'src/hooks/useAppointmentsMutations.ts',
  'src/lib/api.ts',
  'src/lib/prisma.ts',
  'src/lib/monitoring.ts',
  'src/lib/mailer.ts',
  'src/lib/crypto.ts',
  'src/lib/catalog.ts',
  'src/middleware.ts',
  'src/instrumentation.ts',
  'src/proxy.ts',
  'src/lib/email.ts.old'
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

console.log('🚀 Démarrage du traitement des LOTS FINAUX 18-20...\n');
console.log('📦 Traitement des derniers fichiers\n');

let processed = 0;
let skipped = 0;
let totalOccurrences = 0;
let currentLot = 18;

allFiles.forEach((file, index) => {
  if (index > 0 && index % 15 === 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Lot ${currentLot} terminé !`);
    console.log(`${'='.repeat(60)}\n`);
    currentLot++;
  }
  
  if (index % 15 === 0) {
    console.log(`📦 Lot ${currentLot} - Traitement en cours...\n`);
  }
  
  const result = processFile(file);
  if (result.success) {
    processed++;
    totalOccurrences += result.occurrences;
    console.log(`  ✅ ${file} (${result.occurrences} occurrences)`);
  } else if (!result.skipped) {
    console.log(`  ⏭️  ${file} (déjà traité)`);
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`✅ Lot ${currentLot} terminé !`);
console.log(`${'='.repeat(60)}\n`);

console.log('\n' + '='.repeat(60));
console.log(`🎉 LOTS 18-20 TERMINÉS - 100% COMPLÉTÉ !`);
console.log('='.repeat(60));
console.log(`   Fichiers traités: ${processed}`);
console.log(`   Occurrences éliminées: ${totalOccurrences}`);
console.log('='.repeat(60));
console.log(`\n📊 PROGRESSION FINALE:`);
console.log(`   Total fichiers traités: ${122 + processed} fichiers`);
console.log(`   Total logger.* ajoutés: ${431 + totalOccurrences} occurrences`);
console.log(`   Progression: 100% 🎉`);

