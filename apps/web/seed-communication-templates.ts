/**
 * Seed communication templates
 * Run: npx tsx seed-communication-templates.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('­ƒî▒ Seeding communication templates...\n');

  // Email Templates
  const emailTemplates = [
    {
      name: 'Devis cr├®├®',
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
    
    <p>Votre devis est pr├¬t !</p>
    
    <h3>R├®capitulatif :</h3>
    <ul>
      <li>V├®lo : {{bike.brand}} {{bike.model}}</li>
      <li>Type d'intervention : {{workOrder.type}}</li>
    </ul>
    
    <p>N'h├®sitez pas ├á nous contacter pour toute question.</p>
    
    <p>├Ç tr├¿s bient├┤t,<br>L'├®quipe {{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Bonjour {{customer.firstName}}, votre devis est pr├¬t. Contactez-nous au {{shop.phone}}.'
    },
    {
      name: 'V├®lo pr├¬t',
      event: 'bike_ready',
      subject: 'Bonne nouvelle ! Votre v├®lo est pr├¬t - {{shop.name}}',
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
    <h2>Bonne nouvelle {{customer.firstName}} ! ­ƒÄë</h2>
    
    <div class="highlight">
      <p style="font-size: 18px; margin: 0;"><strong>Votre v├®lo est pr├¬t !</strong></p>
    </div>
    
    <p>Nous avons termin├® l'intervention sur votre {{bike.brand}} {{bike.model}}.</p>
    
    <p>Vous pouvez venir le r├®cup├®rer quand vous voulez !</p>
    
    <div style="background: #E3F2FD; padding: 15px; margin: 15px 0;">
      ­ƒôì {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
      ­ƒòÉ Horaires : {{shop.hours}}<br>
      ­ƒô× {{shop.phone}}
    </div>
    
    <p>├Ç tr├¿s bient├┤t !<br>L'├®quipe {{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Bonne nouvelle ! Votre v├®lo est pr├¬t. Venez le r├®cup├®rer ├á {{shop.address}}. {{shop.phone}}'
    },
    {
      name: 'Commande arriv├®e',
      event: 'order_arrived',
      subject: 'Votre commande est arriv├®e ! - {{shop.name}}',
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
      <p style="font-size: 18px; margin: 0;"><strong>­ƒôª Votre commande est arriv├®e !</strong></p>
    </div>
    
    <p>Les pi├¿ces que vous avez command├®es sont disponibles ├á l'atelier.</p>
    
    <p>Vous pouvez passer les r├®cup├®rer aux horaires suivants :</p>
    
    <div style="background: #E8F5E9; padding: 15px; margin: 15px 0;">
      ­ƒôì {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
      ­ƒòÉ {{shop.hours}}<br>
      ­ƒô× {{shop.phone}}
    </div>
    
    <p>├Ç bient├┤t !<br>{{shop.name}}</p>
  </div>
  <div class="footer">
    {{shop.address}}, {{shop.postalCode}} {{shop.city}}<br>
    {{shop.phone}} - {{shop.email}}
  </div>
</body>
</html>`,
      textContent: 'Votre commande est arriv├®e ! Venez la r├®cup├®rer ├á {{shop.address}}. {{shop.phone}}'
    }
  ];

  // SMS Templates
  const smsTemplates = [
    {
      name: 'V├®lo pr├¬t',
      event: 'bike_ready',
      content: '{{shop.name}} : Bonne nouvelle ! Votre {{bike.brand}} est pr├¬t. Passez le r├®cup├®rer quand vous voulez. {{shop.address}}. ├Ç bient├┤t !'
    },
    {
      name: 'Commande arriv├®e',
      event: 'order_arrived',
      content: '{{shop.name}} : Votre commande est arriv├®e ! Venez la r├®cup├®rer ├á l\'atelier ({{shop.address}}). Merci !'
    }
  ];

  // Seed email templates
  for (const template of emailTemplates) {
    const existing = await prisma.emailTemplate.findUnique({
      where: { name: template.name }
    });

    if (existing) {
      console.log(`Ô£ô Email template "${template.name}" already exists`);
    } else {
      await prisma.emailTemplate.create({ data: template });
      console.log(`Ô£ô Created email template "${template.name}"`);
    }
  }

  // Seed SMS templates
  for (const template of smsTemplates) {
    const existing = await prisma.smsTemplate.findUnique({
      where: { name: template.name }
    });

    if (existing) {
      console.log(`Ô£ô SMS template "${template.name}" already exists`);
    } else {
      await prisma.smsTemplate.create({ data: template });
      console.log(`Ô£ô Created SMS template "${template.name}"`);
    }
  }

  console.log('\nÔ£à Seeding complete!');
  console.log('\nTemplates cr├®├®s:');
  console.log('- 3 templates email (devis, v├®lo pr├¬t, commande)');
  console.log('- 2 templates SMS (v├®lo pr├¬t, commande)');
}

main()
  .catch((e) => {
    console.error('ÔØî Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
