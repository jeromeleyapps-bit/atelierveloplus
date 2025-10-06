// Test P2R search with real credentials
const fetch = require('node-fetch');
const fs = require('fs');

async function testP2RSearch() {
  console.log('🔍 Test Recherche P2R\n');
  
  const customerNumber = process.argv[2];
  const password = process.argv[3];
  const searchQuery = process.argv[4] || 'shimano';
  
  if (!customerNumber || !password) {
    console.log('Usage: node test-p2r-search.js <numero_client> <mot_de_passe> [terme_recherche]');
    return;
  }
  
  try {
    // Step 1: Login
    console.log('1. Connexion à P2R...');
    const loginResponse = await fetch('https://www.p2r-expert.com/fr/authentification?back=my-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: new URLSearchParams({
        code: customerNumber,
        passwd: password,
        back: 'my-account'
      }).toString(),
      redirect: 'manual'
    });
    
    const cookies = loginResponse.headers.get('set-cookie');
    const cookieMatch = cookies?.match(/PrestaShop-[^=]+=([^;]+)/);
    
    if (!cookieMatch) {
      console.log('❌ Pas de cookie de session');
      return;
    }
    
    const sessionCookie = cookieMatch[0];
    console.log('   ✅ Session obtenue');
    
    // Step 2: Search
    console.log(`\n2. Recherche "${searchQuery}"...`);
    const searchUrl = `https://www.p2r-expert.com/fr/recherche?controller=search&s=${encodeURIComponent(searchQuery)}`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const searchHtml = await searchResponse.text();
    fs.writeFileSync('p2r-search-results.html', searchHtml);
    console.log('   ✅ Résultats sauvegardés dans p2r-search-results.html');
    
    // Step 3: Parse results
    console.log('\n3. Analyse des résultats...');
    
    // Count products
    const productMatches = searchHtml.match(/<article[^>]*class="[^"]*product-miniature[^"]*"/gi);
    const productCount = productMatches ? productMatches.length : 0;
    console.log(`   Produits trouvés: ${productCount}`);
    
    if (productCount > 0) {
      console.log('\n   Détails des produits:');
      
      // Extract product details
      const productRegex = /<article[^>]*class="[^"]*product-miniature[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
      let match;
      let count = 0;
      
      while ((match = productRegex.exec(searchHtml)) !== null && count < 5) {
        const productHtml = match[1];
        
        // Extract name
        const nameMatch = productHtml.match(/<h3[^>]*class="[^"]*product-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
        const name = nameMatch ? nameMatch[1].trim() : 'N/A';
        
        // Extract price
        const priceMatch = productHtml.match(/<span[^>]*class="[^"]*price[^"]*"[^>]*>([^<]+)<\/span>/i);
        const price = priceMatch ? priceMatch[1].trim() : 'N/A';
        
        // Extract reference
        const refMatch = productHtml.match(/Réf[^:]*:\s*([^<\s]+)/i);
        const ref = refMatch ? refMatch[1].trim() : 'N/A';
        
        console.log(`\n   ${count + 1}. ${name}`);
        console.log(`      Prix: ${price}`);
        console.log(`      Réf: ${ref}`);
        
        count++;
      }
      
      console.log('\n✅ Recherche P2R fonctionnelle !');
    } else {
      console.log('\n⚠️ Aucun produit trouvé pour cette recherche');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testP2RSearch();
