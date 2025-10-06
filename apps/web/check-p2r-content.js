// Check P2R page content
const fs = require('fs');

const html = fs.readFileSync('p2r-search-results.html', 'utf-8');

console.log('🔍 Vérification contenu page P2R\n');

// Check for common messages
const messages = [
  'aucun résultat',
  'aucun produit',
  'no results',
  'no products',
  'désolé',
  'sorry',
  'recherche',
  'résultats',
  'results',
  'produits trouvés',
  'products found'
];

console.log('Messages trouvés:');
messages.forEach(msg => {
  if (html.toLowerCase().includes(msg)) {
    console.log(`  ✅ "${msg}"`);
    
    // Find context
    const index = html.toLowerCase().indexOf(msg);
    const context = html.substring(Math.max(0, index - 100), Math.min(html.length, index + 100));
    console.log(`     Contexte: ${context.replace(/\s+/g, ' ')}`);
  }
});

// Check page title
const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
if (titleMatch) {
  console.log(`\nTitre de la page: "${titleMatch[1]}"`);
}

// Check for main content area
const contentPatterns = [
  /<div[^>]*id="content"[^>]*>([\s\S]{0,500})/i,
  /<main[^>]*>([\s\S]{0,500})/i,
  /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]{0,500})/i,
];

console.log('\nZone de contenu principal:');
contentPatterns.forEach((pattern, i) => {
  const match = html.match(pattern);
  if (match) {
    console.log(`\nPattern ${i + 1}:`);
    console.log(match[0].replace(/\s+/g, ' ').substring(0, 300));
  }
});

// Check if page requires JavaScript
if (html.includes('javascript') || html.includes('js-')) {
  console.log('\n⚠️ La page semble utiliser JavaScript pour charger le contenu');
}

// Save a text version for easier reading
const textContent = html
  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

fs.writeFileSync('p2r-search-text.txt', textContent);
console.log('\n✅ Contenu texte sauvegardé dans p2r-search-text.txt');
console.log('\nRecherchez "shimano" dans ce fichier pour voir si des produits sont présents.');
