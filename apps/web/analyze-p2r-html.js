// Analyze P2R HTML structure
const fs = require('fs');

const html = fs.readFileSync('p2r-search-results.html', 'utf-8');

console.log('🔍 Analyse HTML P2R\n');

// Check for different product patterns
const patterns = [
  { name: 'product-miniature', regex: /<article[^>]*class="[^"]*product-miniature/gi },
  { name: 'product-item', regex: /<div[^>]*class="[^"]*product-item/gi },
  { name: 'product-container', regex: /<div[^>]*class="[^"]*product-container/gi },
  { name: 'product class', regex: /<[^>]*class="[^"]*product[^"]*"/gi },
  { name: 'item-product', regex: /<[^>]*class="[^"]*item-product/gi },
  { name: 'js-product', regex: /<[^>]*class="[^"]*js-product/gi },
];

console.log('Patterns de produits trouvés:');
patterns.forEach(p => {
  const matches = html.match(p.regex);
  if (matches) {
    console.log(`  ✅ ${p.name}: ${matches.length} occurrences`);
    console.log(`     Premier: ${matches[0].substring(0, 100)}...`);
  }
});

// Check for price patterns
console.log('\nPatterns de prix:');
const pricePatterns = [
  { name: 'class="price"', regex: /<[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)</gi },
  { name: 'prix', regex: /prix[^>]*>([^<]+)</gi },
  { name: '€', regex: /(\d+[,\.]\d+)\s*€/gi },
];

pricePatterns.forEach(p => {
  const matches = html.match(p.regex);
  if (matches) {
    console.log(`  ✅ ${p.name}: ${matches.length} occurrences`);
    console.log(`     Exemples: ${matches.slice(0, 3).join(', ')}`);
  }
});

// Check for product names
console.log('\nPatterns de noms:');
const namePatterns = [
  { name: 'product-title', regex: /<[^>]*class="[^"]*product-title[^"]*"[^>]*>([^<]+)</gi },
  { name: 'h3', regex: /<h3[^>]*>([^<]+)</gi },
  { name: 'h2', regex: /<h2[^>]*>([^<]+)</gi },
];

namePatterns.forEach(p => {
  const matches = html.match(p.regex);
  if (matches) {
    console.log(`  ✅ ${p.name}: ${matches.length} occurrences`);
    console.log(`     Exemples: ${matches.slice(0, 3).join(', ')}`);
  }
});

// Extract a sample product block
console.log('\n📦 Extraction d\'un bloc produit exemple:');
const sampleRegex = /<(article|div)[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]{0,500})/i;
const sampleMatch = html.match(sampleRegex);
if (sampleMatch) {
  console.log(sampleMatch[0]);
} else {
  console.log('Aucun bloc produit trouvé');
  console.log('\nRecherche de "shimano" dans le HTML:');
  const shimanoMatches = html.match(/shimano/gi);
  console.log(`Occurrences de "shimano": ${shimanoMatches ? shimanoMatches.length : 0}`);
  
  if (shimanoMatches && shimanoMatches.length > 0) {
    // Find context around "shimano"
    const index = html.toLowerCase().indexOf('shimano');
    const context = html.substring(Math.max(0, index - 200), Math.min(html.length, index + 200));
    console.log('\nContexte autour de "shimano":');
    console.log(context);
  }
}
