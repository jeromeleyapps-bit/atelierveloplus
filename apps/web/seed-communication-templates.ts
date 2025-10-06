/**
 * Seed communication templates
 * Run: npx tsx seed-communication-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding communication templates...\n');

  // Email Templates
  const emailTemplates = [
    {
      name: 'Devis créé',
      event: 'quote_created',
      subject: 'Votre devis #{{workOrder.id}} - {{shop.name}}',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; border-radius: 4px; margin: 10px 0; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    ul { padding-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
  </div>
  <div class="content">
    <h2>Bonjour {{customer.firstName}},</h2>
    
    <p>Votre devis est prêt !</p>
    
    <h3>Récapitulatif :</h3>
    <ul>
      <li>Vélo : {{bike.brand}} {{bike.model}}</li>
      <li>Type d'intervention : {{workOrder.type}}</li>
    </ul>
    
    <p>N'hésitez pas à nous contacter pour toute question.</p>
    
    <p>À très bientôt,<br>L'équipe {{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Bonjour {{customer.firstName}}, votre devis est prêt. Contactez-nous au {{shop.phone}}.'
    },
    {
      name: 'Vélo prêt',
      event: 'bike_ready',
      subject: 'Bonne nouvelle ! Votre vélo est prêt - {{shop.name}}',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .highlight { background: #E8F5E9; padding: 15px; border-left: 4px solid #4CAF50; margin: 15px 0; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
  </div>
  <div class="content">
    <h2>Bonne nouvelle {{customer.firstName}} ! 🎉</h2>
    
    <div class="highlight">
      <p style="font-size: 18px; margin: 0;"><strong>Votre vélo est prêt !</strong></p>
    </div>
    
    <p>Nous avons terminé l'intervention sur votre {{bike.brand}} {{bike.model}}.</p>
    
    <p>Vous pouvez venir le récupérer quand vous voulez !</p>
    
    <div style="background: #E3F2FD; padding: 15px; margin: 15px 0;">
      📍 {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
      🕐 Horaires : {{shop.hours}}<br>
      📞 {{shop.phone}}
    </div>
    
    <p>À très bientôt !<br>L'équipe {{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Bonne nouvelle ! Votre vélo est prêt. Venez le récupérer à {{shop.address}}. {{shop.phone}}'
    },
    {
      name: 'Commande arrivée',
      event: 'order_arrived',
      subject: 'Votre commande est arrivée ! - {{shop.name}}',
      htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
    .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .highlight { background: #E3F2FD; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
  </div>
  <div class="content">
    <h2>Bonjour {{customer.firstName}},</h2>
    
    <div class="highlight">
      <p style="font-size: 18px; margin: 0;"><strong>📦 Votre commande est arrivée !</strong></p>
    </div>
    
    <p>Les pièces que vous avez commandées sont disponibles à l'atelier.</p>
    
    <p>Vous pouvez passer les récupérer aux horaires suivants :</p>
    
    <div style="background: #E8F5E9; padding: 15px; margin: 15px 0;">
      📍 {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
      🕐 {{shop.hours}}<br>
      📞 {{shop.phone}}
    </div>
    
    <p>À bientôt !<br>{{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Votre commande est arrivée ! Venez la récupérer à {{shop.address}}. {{shop.phone}}'
    }
  ];

  // SMS Templates
  const smsTemplates = [
    {
      name: 'Vélo prêt',
      event: 'bike_ready',
      content: '{{shop.name}} : Bonne nouvelle ! Votre {{bike.brand}} est prêt. Passez le récupérer quand vous voulez. {{shop.address}}. À bientôt !'
    },
    {
      name: 'Commande arrivée',
      event: 'order_arrived',
      content: '{{shop.name}} : Votre commande est arrivée ! Venez la récupérer à l\'atelier ({{shop.address}}). Merci !'
    }
  ];

  // Seed email templates
  for (const template of emailTemplates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: template.name }
    });

    if (existing) {
      console.log(`✓ Email template "${template.name}" already exists`);
    } else {
      await prisma.emailTemplate.create({ data: template });
      console.log(`✓ Created email template "${template.name}"`);
    }
  }

  // Seed SMS templates
  for (const template of smsTemplates) {
    const existing = await prisma.smsTemplate.findUnique({
      where: { name: template.name }
    });

    if (existing) {
      console.log(`✓ SMS template "${template.name}" already exists`);
    } else {
      await prisma.smsTemplate.create({ data: template });
      console.log(`✓ Created SMS template "${template.name}"`);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nTemplates créés:');
  console.log('- 3 templates email (devis, vélo prêt, commande)');
  console.log('- 2 templates SMS (vélo prêt, commande)');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
