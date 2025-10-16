/**
 * Script de test pour l'envoi d'email via HubSpot
 * Usage: node test-email-hubspot.js
 */

require('dotenv').config();

async function testHubSpotEmail() {
  console.log('\n🧪 TEST ENVOI EMAIL HUBSPOT\n');
  console.log('='.repeat(60));
  
  // 1. Vérifier les variables d'environnement
  console.log('\n📋 VARIABLES D\'ENVIRONNEMENT:');
  console.log('  HUBSPOT_ACCESS_TOKEN:', process.env.HUBSPOT_ACCESS_TOKEN ? '✅ Défini' : '❌ Manquant');
  console.log('  HUBSPOT_FROM_EMAIL:', process.env.HUBSPOT_FROM_EMAIL || '❌ Manquant');
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || '❌ Manquant');
  console.log('  SHOP_NAME:', process.env.SHOP_NAME || '❌ Manquant');
  
  if (!process.env.HUBSPOT_ACCESS_TOKEN) {
    console.error('\n❌ ERREUR: HUBSPOT_ACCESS_TOKEN manquant dans .env');
    process.exit(1);
  }
  
  // 2. Tester l'envoi d'email
  console.log('\n📧 TEST ENVOI EMAIL...');
  
  const emailData = {
    to: process.env.EMAIL_FROM || 'test@example.com',
    subject: 'Test Email HubSpot - Atelier Vélo+',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0066cc; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚴 Test Email HubSpot</h1>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            <p>Ceci est un email de test envoyé via HubSpot API.</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>Atelier:</strong> ${process.env.SHOP_NAME || 'Atelier Vélo+'}</p>
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
  
  try {
    const response = await fetch('https://api.hubapi.com/marketing/v3/transactional/single-email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: process.env.HUBSPOT_EMAIL_ID || undefined,
        message: {
          to: emailData.to,
          from: process.env.HUBSPOT_FROM_EMAIL || process.env.EMAIL_FROM,
          subject: emailData.subject,
          html: emailData.html,
        },
      }),
    });
    
    console.log('\n📡 RÉPONSE HUBSPOT:');
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
      console.log('  Réponse:', JSON.stringify(responseData, null, 2));
      console.log('\n📬 Vérifie ta boîte mail:', emailData.to);
    } else {
      console.error('\n❌ ERREUR ENVOI EMAIL');
      console.error('  Status:', response.status);
      console.error('  Réponse:', JSON.stringify(responseData, null, 2));
      
      // Diagnostics supplémentaires
      if (response.status === 401) {
        console.error('\n🔑 ERREUR AUTHENTIFICATION:');
        console.error('  - Vérifie que HUBSPOT_ACCESS_TOKEN est valide');
        console.error('  - Le token a peut-être expiré');
      } else if (response.status === 400) {
        console.error('\n⚠️ ERREUR REQUÊTE:');
        console.error('  - Vérifie HUBSPOT_FROM_EMAIL');
        console.error('  - Vérifie que l\'email est autorisé dans HubSpot');
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
testHubSpotEmail().catch(console.error);
