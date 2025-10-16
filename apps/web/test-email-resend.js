/**
 * Script de test pour l'envoi d'email via Resend
 * Usage: node test-email-resend.js
 */

require('dotenv').config();

async function testResendEmail() {
  console.log('\n🧪 TEST ENVOI EMAIL RESEND\n');
  console.log('='.repeat(60));
  
  // 1. Vérifier les variables d'environnement
  console.log('\n📋 VARIABLES D\'ENVIRONNEMENT:');
  console.log('  RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Défini' : '❌ Manquant');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Manquant');
  console.log('  SHOP_NAME:', process.env.SHOP_NAME || '❌ Manquant');
  
  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ ERREUR: RESEND_API_KEY manquant dans .env');
    console.log('\n💡 Ajoute dans ton .env:');
    console.log('   RESEND_API_KEY=re_VotreCléIci');
    console.log('   EMAIL_FROM=contact@atelier-velo.fr');
    process.exit(1);
  }
  
  // 2. Tester l'envoi d'email
  console.log('\n📧 TEST ENVOI EMAIL...');
  
  const emailData = {
    to: process.env.EMAIL_FROM || 'test@example.com',
    subject: 'Test Email Resend - Atelier Vélo+',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background: #f9f9f9; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚴 Test Email Resend</h1>
          </div>
          <div class="content">
            <div class="success">
              <strong>✅ Succès !</strong> Ton système d'envoi d'emails Resend fonctionne parfaitement !
            </div>
            <p>Bonjour,</p>
            <p>Ceci est un email de test envoyé via <strong>Resend API</strong>.</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>Atelier:</strong> ${process.env.SHOP_NAME || 'Atelier Vélo+'}</p>
            <p><strong>Provider:</strong> Resend (Priority 1)</p>
            
            <h3>🎯 Prochaines Étapes</h3>
            <ul>
              <li>✅ Resend configuré et fonctionnel</li>
              <li>📧 Emails de factures prêts</li>
              <li>📅 Confirmations de RDV prêtes</li>
              <li>💬 Communications clients prêtes</li>
            </ul>
          </div>
          <div class="footer">
            <p>${process.env.SHOP_NAME || 'Atelier Vélo+'}</p>
            <p>${process.env.SHOP_EMAIL || ''} | ${process.env.SHOP_PHONE || ''}</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  console.log('  Destinataire:', emailData.to);
  console.log('  Sujet:', emailData.subject);
  console.log('  Provider: Resend');
  
  try {
    const payload = {
      from: process.env.EMAIL_FROM,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('\n📡 RÉPONSE RESEND:');
    console.log('  Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    if (response.ok) {
      console.log('\n✅ EMAIL ENVOYÉ AVEC SUCCÈS !');
      console.log('  ID:', responseData.id || 'N/A');
      console.log('\n📬 Vérifie ta boîte mail:', emailData.to);
      console.log('  (Pense à vérifier les spams si tu ne le vois pas)');
      
      console.log('\n🎉 SYSTÈME EMAIL OPÉRATIONNEL !');
      console.log('  - Factures: ✅ Prêt');
      console.log('  - Confirmations RDV: ✅ Prêt');
      console.log('  - Communications: ✅ Prêt');
    } else {
      console.error('\n❌ ERREUR ENVOI EMAIL');
      console.error('  Status:', response.status);
      console.error('  Réponse:', JSON.stringify(responseData, null, 2));
      
      // Diagnostics supplémentaires
      if (response.status === 401 || response.status === 403) {
        console.error('\n🔑 ERREUR AUTHENTIFICATION:');
        console.error('  - Vérifie que RESEND_API_KEY est correcte');
        console.error('  - La clé commence par "re_"');
        console.error('  - Pas d\'espaces avant/après la clé');
      } else if (response.status === 400) {
        console.error('\n⚠️ ERREUR REQUÊTE:');
        console.error('  - Vérifie EMAIL_FROM');
        if (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('@')) {
          console.error('  - EMAIL_FROM doit être un email valide');
        }
      } else if (response.status === 422) {
        console.error('\n⚠️ DOMAINE NON VÉRIFIÉ:');
        console.error('  - Utilise: EMAIL_FROM=onboarding@resend.dev');
        console.error('  - Ou vérifie ton domaine dans Resend');
      }
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR RÉSEAU:');
    console.error('  Message:', error.message);
    console.error('  Stack:', error.stack);
  }
  
  console.log('\n' + '='.repeat(60));
}

// Exécuter le test
testResendEmail().catch(console.error);
