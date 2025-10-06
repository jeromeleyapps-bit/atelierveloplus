// Test P2R login
const fetch = require('node-fetch');

async function testP2RLogin() {
  console.log('🧪 Test Connexion P2R\n');
  
  // Credentials depuis les arguments de ligne de commande
  const customerNumber = process.argv[2];
  const password = process.argv[3];
  
  if (!customerNumber || !password) {
    console.log('❌ Usage: node test-p2r-login.js <numero_client> <mot_de_passe>');
    console.log('   Exemple: node test-p2r-login.js 12345 monmotdepasse');
    return;
  }
  
  console.log('Numéro client:', customerNumber);
  console.log('Mot de passe:', '*'.repeat(password.length));
  console.log('');
  
  try {
    // Step 1: Get login page
    console.log('1. Récupération page de login...');
    const loginPageResponse = await fetch('https://www.p2r-expert.com/fr/authentification?back=my-account');
    const loginPageHtml = await loginPageResponse.text();
    
    // Extract token
    const tokenMatch = loginPageHtml.match(/name="token"\s+value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : '';
    console.log('   Token trouvé:', token ? 'Oui' : 'Non');
    
    // Step 2: Login
    console.log('\n2. Tentative de connexion...');
    const formData = new URLSearchParams({
      email: customerNumber,
      password: password,
      submitLogin: '1',
      ...(token ? { token } : {})
    });
    
    const loginResponse = await fetch('https://www.p2r-expert.com/fr/authentification?back=my-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    console.log('   Status:', loginResponse.status);
    console.log('   Redirect:', loginResponse.headers.get('location'));
    
    // Check cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('   Cookies:', cookies ? 'Oui' : 'Non');
    
    if (cookies) {
      const sessionMatch = cookies.match(/PHPSESSID=([^;]+)/);
      if (sessionMatch) {
        console.log('   ✅ Session ID:', sessionMatch[1].substring(0, 20) + '...');
        
        // Test search with session
        console.log('\n3. Test recherche avec session...');
        const searchResponse = await fetch('https://www.p2r-expert.com/fr/recherche?controller=search&s=shimano', {
          headers: {
            'Cookie': `PHPSESSID=${sessionMatch[1]}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const searchHtml = await searchResponse.text();
        const hasProducts = searchHtml.includes('product-miniature') || searchHtml.includes('product-item');
        console.log('   Produits trouvés:', hasProducts ? 'Oui ✅' : 'Non ❌');
        
        if (hasProducts) {
          console.log('\n✅ Connexion P2R réussie !');
        } else {
          console.log('\n⚠️ Connecté mais pas de produits');
        }
      } else {
        console.log('   ❌ Pas de session ID');
      }
    } else {
      console.log('   ❌ Pas de cookies - Login échoué');
      console.log('\nVérifiez:');
      console.log('- Numéro de client correct');
      console.log('- Mot de passe correct');
      console.log('- Compte P2R actif');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

testP2RLogin();
