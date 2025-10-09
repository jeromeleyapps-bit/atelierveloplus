// Test rapide de connexion
// Usage: node test-login.js

const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'votre@email.com', // <-- REMPLACER PAR TON EMAIL
        password: 'tonmotdepasse'  // <-- REMPLACER PAR TON MOT DE PASSE
      })
    });

    console.log('Status:', response.status);
    
    const text = await response.text();
    console.log('Response:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Login réussi!');
      console.log('Token:', data.token?.substring(0, 50) + '...');
      console.log('User:', data.user);
    } else {
      console.log('\n❌ Login échoué');
    }
  } catch (e) {
    console.error('Erreur:', e.message);
  }
}

testLogin();
