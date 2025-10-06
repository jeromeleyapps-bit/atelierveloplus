// Debug P2R login form
const fetch = require('node-fetch');
const fs = require('fs');

async function debugP2RLogin() {
  console.log('🔍 Debug P2R Login Form\n');
  
  const customerNumber = process.argv[2];
  const password = process.argv[3];
  
  if (!customerNumber || !password) {
    console.log('Usage: node debug-p2r-login.js <numero_client> <mot_de_passe>');
    return;
  }
  
  try {
    // Get login page
    console.log('1. Récupération page de login...');
    const loginPageResponse = await fetch('https://www.p2r-expert.com/fr/authentification?back=my-account');
    const loginPageHtml = await loginPageResponse.text();
    
    // Save HTML for inspection
    fs.writeFileSync('p2r-login-page.html', loginPageHtml);
    console.log('   ✅ Page sauvegardée dans p2r-login-page.html');
    
    // Extract form fields
    console.log('\n2. Analyse du formulaire...');
    
    // Find all input fields
    const inputRegex = /<input[^>]*>/gi;
    const inputs = loginPageHtml.match(inputRegex) || [];
    
    console.log('   Champs trouvés:');
    inputs.forEach(input => {
      const nameMatch = input.match(/name="([^"]+)"/);
      const typeMatch = input.match(/type="([^"]+)"/);
      const valueMatch = input.match(/value="([^"]+)"/);
      
      if (nameMatch) {
        console.log(`   - ${nameMatch[1]} (type: ${typeMatch?.[1] || 'text'}, value: ${valueMatch?.[1] || 'empty'})`);
      }
    });
    
    // Try login with all possible field names
    console.log('\n3. Test de connexion...');
    
    const formData = new URLSearchParams({
      email: customerNumber,
      password: password,
      submitLogin: '1'
    });
    
    const loginResponse = await fetch('https://www.p2r-expert.com/fr/authentification?back=my-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.p2r-expert.com/fr/authentification?back=my-account'
      },
      body: formData.toString(),
      redirect: 'manual'
    });
    
    console.log('   Status:', loginResponse.status);
    console.log('   Redirect:', loginResponse.headers.get('location'));
    
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('   Cookies:', cookies);
    
    // Save response for inspection
    const responseHtml = await loginResponse.text();
    fs.writeFileSync('p2r-login-response.html', responseHtml);
    console.log('   ✅ Réponse sauvegardée dans p2r-login-response.html');
    
    // Check if login was successful
    if (responseHtml.includes('Mon compte') || responseHtml.includes('Déconnexion') || responseHtml.includes('logout')) {
      console.log('\n✅ Login semble réussi (page contient "Mon compte" ou "Déconnexion")');
    } else if (responseHtml.includes('Erreur') || responseHtml.includes('incorrect') || responseHtml.includes('invalide')) {
      console.log('\n❌ Login échoué (page contient message d\'erreur)');
    } else {
      console.log('\n⚠️ Statut inconnu - vérifiez p2r-login-response.html');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

debugP2RLogin();
