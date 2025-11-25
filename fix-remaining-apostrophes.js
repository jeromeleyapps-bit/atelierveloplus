// Script pour corriger les 22 apostrophes restantes - fichiers spécifiques
const fs = require('fs');

const files = [
  'src/app/admin/calendar/page.tsx',
  'src/app/api/admin/backup/route.ts',
  'src/app/api/admin/system-settings/route.ts',
  'src/app/api/finance/invoices/[id]/issue/route.ts',
  'src/app/api/finance/invoices/[id]/remind/route.ts',
  'src/app/api/finance/invoices/[id]/route.ts',
  'src/app/api/workorders/[id]/lines/route.ts',
  'src/app/catalog/services/page.tsx',
  'src/app/communications/page.tsx',
  'src/lib/dbReset.ts',
  'src/lib/prisma.ts'
];

let totalFixed = 0;

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // Remplacer les apostrophes dans les chaînes de caractères
    // Pattern: apostrophes dans du texte entre guillemets ou balises JSX
    content = content.replace(/(["'`>])([^"'`<>]*)'([^"'`<>]*)(["'`<])/g, (match, before, text1, text2, after) => {
      // Ne pas remplacer dans le code TypeScript (imports, etc.)
      if (before === "'" || before === "`") return match;
      return `${before}${text1}&apos;${text2}${after}`;
    });
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      const count = (content.match(/&apos;/g) || []).length - (original.match(/&apos;/g) || []).length;
      totalFixed += count;
      console.log(`✅ ${file} - ${count} apostrophes`);
    }
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`);
  }
});

console.log(`\n✅ Total: ${totalFixed} apostrophes corrigées`);
