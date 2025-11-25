// Script Node.js pour corriger TOUTES les apostrophes
// RÈGLE D'OR #7: ZÉRO TOLÉRANCE ERREURS

const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.next')) {
        getAllFiles(filePath, fileList);
      }
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function fixApostrophes(content) {
  // Remplacer ' par &apos; dans le contenu JSX (entre > et <)
  // Pattern plus sûr: chercher les apostrophes dans le texte JSX
  let fixed = content;
  let changed = false;
  
  // Regex pour trouver le contenu entre > et < contenant des apostrophes
  const jsxTextPattern = />(([^<>]*)'([^<>]*))</g;
  
  let match;
  while ((match = jsxTextPattern.exec(content)) !== null) {
    const original = match[0];
    const replacement = original.replace(/'/g, '&apos;');
    if (original !== replacement) {
      fixed = fixed.replace(original, replacement);
      changed = true;
    }
  }
  
  return { fixed, changed };
}

console.log('🔧 Correction de toutes les apostrophes...\n');

const files = getAllFiles('src');
let totalFixed = 0;
let filesModified = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const { fixed, changed } = fixApostrophes(content);
    
    if (changed) {
      fs.writeFileSync(file, fixed, 'utf8');
      filesModified++;
      console.log(`✅ ${path.relative(process.cwd(), file)}`);
      
      // Compter les apostrophes remplacées
      const count = (fixed.match(/&apos;/g) || []).length - (content.match(/&apos;/g) || []).length;
      totalFixed += count;
    }
  } catch (error) {
    console.error(`❌ Erreur ${file}: ${error.message}`);
  }
});

console.log(`\n✅ Terminé!`);
console.log(`   ${filesModified} fichiers modifiés`);
console.log(`   ${totalFixed} apostrophes corrigées\n`);
