/**
 * Seed Email Templates - Phase 1 Communications
 * Templates: Satisfaction, Maintenance, Seasonal
 * 
 * Usage: npx tsx prisma/seed-email-templates-phase1.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  // ========================================
  // TEMPLATE 1: Follow-up Satisfaction (J+2)
  // ========================================
  {
    name: 'satisfaction-followup',
    event: 'satisfaction_followup',
    subject: '{{customer.firstName}}, comment s\'est passée votre réparation? 🔧',
    updatedAt: new Date(),
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Satisfaction</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  
  <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">🔧 Comment ça roule?</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; margin-top: 0;">Bonjour <strong>{{customer.firstName}}</strong>,</p>
    
    <p>Votre <strong>{{bike.brand}} {{bike.model}}</strong> a été réparé il y a 2 jours chez <strong>{{shop.name}}</strong>.</p>
    
    <p>Nous espérons que tout roule parfaitement! 🚴</p>
    
    <div style="background-color: #E8F5E9; padding: 25px; border-left: 4px solid #4CAF50; margin: 25px 0; border-radius: 5px;">
      <h2 style="color: #4CAF50; margin-top: 0; font-size: 20px;">⭐ Votre avis compte!</h2>
      <p style="margin: 10px 0;">Prenez 30 secondes pour nous dire comment s'est passée votre réparation.</p>
      <p style="text-align: center; margin: 20px 0;">
        <a href="{{surveyLink}}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          📝 Donner mon avis
        </a>
      </p>
    </div>
    
    <div style="background-color: #FFF3E0; padding: 20px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #FF9800;">
      <h3 style="color: #F57C00; margin-top: 0; font-size: 18px;">🎁 Merci d'avance!</h3>
      <p style="margin: 5px 0;">En remerciement, profitez de <strong>-10% sur votre prochain entretien</strong></p>
      <p style="margin: 5px 0; font-size: 20px; font-weight: bold; color: #F57C00;">Code: {{promoCode}}</p>
      <p style="margin: 5px 0; font-size: 14px; color: #666;">Valable 3 mois</p>
    </div>
    
    <div style="background-color: #E3F2FD; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px;">💡 <strong>Astuce entretien:</strong> Pensez à huiler votre chaîne toutes les 2 semaines pour prolonger sa durée de vie.</p>
    </div>
    
    <p style="margin-top: 30px;">Si vous constatez un problème, n'hésitez pas à nous contacter:</p>
    <p style="margin: 5px 0;">📞 <strong>{{shop.phone}}</strong></p>
    <p style="margin: 5px 0;">📧 <strong>{{shop.email}}</strong></p>
    
    <p style="margin-top: 30px;">
      À très bientôt,<br>
      <strong>{{shop.name}}</strong>
    </p>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px 20px; margin-top: 30px; border-top: 3px solid #4CAF50;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: bold;">{{shop.name}}</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: center; color: #666; font-size: 13px; line-height: 22px;">
                <div style="margin: 8px 0;">
                  <span style="color: #4CAF50; font-size: 16px;">📍</span> {{shop.address1}}<br>
                  {{shop.zip}} {{shop.city}}, {{shop.country}}
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #4CAF50; font-size: 16px;">📞</span> <a href="tel:{{shop.phone}}" style="color: #666; text-decoration: none;">{{shop.phone}}</a>
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #4CAF50; font-size: 16px;">✉️</span> <a href="mailto:{{shop.email}}" style="color: #666; text-decoration: none;">{{shop.email}}</a>
                </div>
                <div style="margin: 8px 0; font-size: 12px; color: #999;">
                  {{shop.hours}}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 10px 0; font-size: 11px; color: #999;">
            Vous recevez cet email en tant que client de {{shop.name}}<br>
            <a href="{{unsubscribeLink}}" style="color: #999; text-decoration: underline;">Se désinscrire des communications</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
  
</body>
</html>
    `.trim(),
    textContent: `Bonjour {{customer.firstName}},

Votre {{bike.brand}} {{bike.model}} a été réparé il y a 2 jours chez {{shop.name}}.

Nous espérons que tout roule parfaitement!

⭐ VOTRE AVIS COMPTE
Prenez 30 secondes pour nous dire comment s'est passée votre réparation:
{{surveyLink}}

🎁 EN REMERCIEMENT
-10% sur votre prochain entretien
Code: {{promoCode}} (valable 3 mois)

💡 ASTUCE: Pensez à huiler votre chaîne toutes les 2 semaines.

Contact: {{shop.phone}} | {{shop.email}}

À très bientôt,
{{shop.name}}

---
Vous recevez cet email car vous êtes client de {{shop.name}}.
Se désinscrire: {{unsubscribeLink}}
    `.trim(),
    active: true,
  },

  // ========================================
  // TEMPLATE 2: Rappel Entretien (6 mois)
  // ========================================
  {
    name: 'maintenance-reminder-6m',
    event: 'maintenance_reminder',
    subject: '🚴 C\'est bientôt l\'heure de l\'entretien de votre vélo!',
    updatedAt: new Date(),
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rappel Entretien</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  
  <div style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">🔧 Entretien vélo recommandé</h1>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; margin-top: 0;">Bonjour <strong>{{customer.firstName}}</strong>,</p>
    
    <p>Votre <strong>{{bike.brand}} {{bike.model}}</strong> a été réparé il y a <strong>{{monthsSinceService}} mois</strong>.</p>
    
    <div style="background-color: #E3F2FD; padding: 25px; border-left: 4px solid #2196F3; margin: 25px 0; border-radius: 5px;">
      <h2 style="color: #1976D2; margin-top: 0; font-size: 20px;">⚙️ Pourquoi un entretien régulier?</h2>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>🛡️ Garantir votre sécurité</li>
        <li>⚡ Prolonger la durée de vie de votre vélo</li>
        <li>💰 Éviter les réparations coûteuses</li>
        <li>🚴 Rouler en toute tranquillité</li>
      </ul>
    </div>
    
    <div style="background-color: #FFF3E0; padding: 20px; border-radius: 5px; margin: 25px 0;">
      <h3 style="color: #F57C00; margin-top: 0; font-size: 18px;">📋 Révision Complète - 35€ TTC</h3>
      <p style="margin: 5px 0;"><strong>Durée:</strong> 30 minutes</p>
      <p style="margin: 5px 0;"><strong>Inclus:</strong></p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Contrôle freins & vitesses</li>
        <li>Graissage chaîne & transmission</li>
        <li>Gonflage pneus optimal</li>
        <li>Vérification sécurité complète</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{bookingLink}}" style="display: inline-block; background-color: #2196F3; color: white; padding: 18px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
        📅 Prendre RDV en 2 clics
      </a>
    </div>
    
    <div style="background-color: #FFEBEE; padding: 15px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #F44336;">
      <p style="margin: 0; font-size: 14px;">⚠️ <strong>Les créneaux partent vite!</strong> Réservez dès maintenant pour garantir votre horaire préféré.</p>
    </div>
    
    <p style="margin-top: 30px;">Questions? Contactez-nous:</p>
    <p style="margin: 5px 0;">📞 <strong>{{shop.phone}}</strong></p>
    <p style="margin: 5px 0;">📧 <strong>{{shop.email}}</strong></p>
    <p style="margin: 5px 0;">📍 <strong>{{shop.address}}, {{shop.city}}</strong></p>
    
    <p style="margin-top: 30px;">
      À très bientôt,<br>
      <strong>{{shop.name}}</strong>
    </p>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px 20px; margin-top: 30px; border-top: 3px solid #2196F3;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: bold;">{{shop.name}}</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: center; color: #666; font-size: 13px; line-height: 22px;">
                <div style="margin: 8px 0;">
                  <span style="color: #2196F3; font-size: 16px;">📍</span> {{shop.address1}}<br>
                  {{shop.zip}} {{shop.city}}, {{shop.country}}
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #2196F3; font-size: 16px;">📞</span> <a href="tel:{{shop.phone}}" style="color: #666; text-decoration: none;">{{shop.phone}}</a>
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #2196F3; font-size: 16px;">✉️</span> <a href="mailto:{{shop.email}}" style="color: #666; text-decoration: none;">{{shop.email}}</a>
                </div>
                <div style="margin: 8px 0; font-size: 12px; color: #999;">
                  {{shop.hours}}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 10px 0; font-size: 11px; color: #999;">
            Vous recevez cet email en tant que client de {{shop.name}}<br>
            <a href="{{unsubscribeLink}}" style="color: #999; text-decoration: underline;">Se désinscrire des rappels d'entretien</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
  
</body>
</html>
    `.trim(),
    textContent: `Bonjour {{customer.firstName}},

Votre {{bike.brand}} {{bike.model}} a été réparé il y a {{monthsSinceService}} mois.

⚙️ POURQUOI UN ENTRETIEN RÉGULIER?
- Garantir votre sécurité
- Prolonger la durée de vie de votre vélo
- Éviter les réparations coûteuses
- Rouler en toute tranquillité

📋 RÉVISION COMPLÈTE - 35€ TTC (30 min)
Inclus:
- Contrôle freins & vitesses
- Graissage chaîne & transmission
- Gonflage pneus optimal
- Vérification sécurité complète

👉 Prendre RDV: {{bookingLink}}

⚠️ Les créneaux partent vite! Réservez dès maintenant.

Contact: {{shop.phone}} | {{shop.email}}
Adresse: {{shop.address}}, {{shop.city}}

À très bientôt,
{{shop.name}}

---
Vous recevez cet email car vous êtes client de {{shop.name}}.
Se désinscrire: {{unsubscribeLink}}
    `.trim(),
    active: true,
  },

  // ========================================
  // TEMPLATE 3: Campagne Saisonnière Printemps
  // ========================================
  {
    name: 'seasonal-spring',
    event: 'seasonal_campaign',
    subject: '🌸 Le printemps arrive, votre vélo est prêt?',
    updatedAt: new Date(),
    htmlContent: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offre Printemps</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  
  <div style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0; font-size: 32px;">🌸 Offre Printemps</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px;">Le soleil revient, profitez-en!</p>
  </div>
  
  <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <p style="font-size: 18px; margin-top: 0;">Bonjour <strong>{{customer.firstName}}</strong>,</p>
    
    <p>Le printemps arrive, c'est <strong>LE</strong> moment parfait pour une révision complète de votre vélo!</p>
    
    <div style="background-color: #FFF3E0; padding: 30px; text-align: center; border-radius: 10px; margin: 30px 0; border: 3px dashed #FF9800;">
      <h2 style="color: #F57C00; margin-top: 0; font-size: 28px;">🎁 OFFRE SPÉCIALE PRINTEMPS</h2>
      <p style="font-size: 24px; font-weight: bold; color: #F57C00; margin: 15px 0;">
        Révision + Nettoyage<br>
        <span style="font-size: 36px;">45€</span> <span style="text-decoration: line-through; font-size: 20px; color: #999;">55€</span>
      </p>
      <p style="font-size: 14px; color: #666; margin: 10px 0;">Soit -18% | Valable jusqu'au 31 mars</p>
    </div>
    
    <div style="background-color: #E8F5E9; padding: 25px; border-left: 4px solid #4CAF50; margin: 25px 0; border-radius: 5px;">
      <h3 style="color: #4CAF50; margin-top: 0; font-size: 20px;">✨ Révision Printemps Inclut:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>🔧 Révision complète 15 points</li>
        <li>✨ Nettoyage complet vélo</li>
        <li>⚙️ Réglage vitesses & freins</li>
        <li>🔗 Graissage transmission</li>
        <li>🎈 Gonflage pneus pression optimale</li>
        <li>🔍 Diagnostic sécurité gratuit</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{bookingLink}}" style="display: inline-block; background-color: #FF9800; color: white; padding: 18px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
        🌸 Réserver mon créneau
      </a>
    </div>
    
    <div style="background-color: #FFEBEE; padding: 20px; border-radius: 5px; margin: 25px 0; text-align: center;">
      <p style="margin: 0; font-size: 16px; font-weight: bold; color: #D32F2F;">⏰ Attention: Offre limitée!</p>
      <p style="margin: 10px 0; font-size: 14px;">Les créneaux de mars-avril partent très vite.<br>Ne tardez pas pour profiter de cette offre!</p>
    </div>
    
    <div style="background-color: #E3F2FD; padding: 15px; border-radius: 5px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px;">💡 <strong>Le saviez-vous?</strong> Un vélo bien entretenu consomme 10% d'énergie en moins et dure 2x plus longtemps!</p>
    </div>
    
    <p style="margin-top: 30px;">Questions sur l'offre?</p>
    <p style="margin: 5px 0;">📞 <strong>{{shop.phone}}</strong></p>
    <p style="margin: 5px 0;">📧 <strong>{{shop.email}}</strong></p>
    <p style="margin: 5px 0;">🕐 <strong>{{shop.hours}}</strong></p>
    
    <p style="margin-top: 30px;">
      Au plaisir de vous revoir,<br>
      <strong>L'équipe {{shop.name}}</strong>
    </p>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px 20px; margin-top: 30px; border-top: 3px solid #FF6B9D;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
      <tr>
        <td style="text-align: center; padding-bottom: 20px;">
          <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333; font-weight: bold;">{{shop.name}}</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="text-align: center; color: #666; font-size: 13px; line-height: 22px;">
                <div style="margin: 8px 0;">
                  <span style="color: #FF6B9D; font-size: 16px;">📍</span> {{shop.address1}}<br>
                  {{shop.zip}} {{shop.city}}, {{shop.country}}
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #FF6B9D; font-size: 16px;">📞</span> <a href="tel:{{shop.phone}}" style="color: #666; text-decoration: none;">{{shop.phone}}</a>
                </div>
                <div style="margin: 8px 0;">
                  <span style="color: #FF6B9D; font-size: 16px;">✉️</span> <a href="mailto:{{shop.email}}" style="color: #666; text-decoration: none;">{{shop.email}}</a>
                </div>
                <div style="margin: 8px 0; font-size: 12px; color: #999;">
                  {{shop.hours}}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="margin: 10px 0; font-size: 11px; color: #999;">
            Vous recevez cet email en tant que client de {{shop.name}}<br>
            <a href="{{unsubscribeLink}}" style="color: #999; text-decoration: underline;">Se désinscrire des offres promotionnelles</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
  
</body>
</html>
    `.trim(),
    textContent: `Bonjour {{customer.firstName}},

Le printemps arrive, c'est LE moment parfait pour une révision complète!

🎁 OFFRE SPÉCIALE PRINTEMPS
Révision + Nettoyage: 45€ au lieu de 55€
Soit -18% | Valable jusqu'au 31 mars

✨ RÉVISION PRINTEMPS INCLUT:
- Révision complète 15 points
- Nettoyage complet vélo
- Réglage vitesses & freins
- Graissage transmission
- Gonflage pneus pression optimale
- Diagnostic sécurité gratuit

👉 Réserver: {{bookingLink}}

⏰ ATTENTION: Offre limitée!
Les créneaux de mars-avril partent très vite.

💡 Le saviez-vous? Un vélo bien entretenu consomme 10% d'énergie en moins et dure 2x plus longtemps!

Contact: {{shop.phone}} | {{shop.email}}
Horaires: {{shop.hours}}

Au plaisir de vous revoir,
L'équipe {{shop.name}}

---
Vous recevez cet email car vous êtes client de {{shop.name}}.
Se désinscrire: {{unsubscribeLink}}
    `.trim(),
    active: true,
  },
];

async function main() {
  console.log('🌱 Seeding Email Templates Phase 1...\n');

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const template of templates) {
    try {
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name },
      });

      if (existing) {
        await prisma.emailTemplate.update({
          where: { name: template.name },
          data: template,
        });
        console.log(`✅ Updated: ${template.name} (${template.event})`);
        updated++;
      } else {
        await prisma.emailTemplate.create({
          data: template,
        });
        console.log(`✨ Created: ${template.name} (${template.event})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error with ${template.name}:`, error);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Total: ${templates.length}`);
  console.log('\n✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
