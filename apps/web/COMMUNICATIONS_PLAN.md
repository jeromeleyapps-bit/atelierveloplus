# 📧 Système de Communications - Plan d'Implémentation

## 🎯 Objectif

Automatiser les communications clients via **HubSpot** (emails + SMS) pour tous les événements importants.

---

## 📋 Événements de Communication

### 📧 Emails (Avec PDF)

1. **Devis créé** ✉️
   - Objet : "Votre devis [#numero] - [Nom Atelier]"
   - Contenu : Détails du devis
   - PDF : Devis complet
   - CTA : "Valider le devis"

2. **Devis modifié** ✉️
   - Objet : "Modification de votre devis [#numero]"
   - Contenu : Explication des changements
   - PDF : Nouveau devis
   - Exemple : "Suite au démontage, pièces supplémentaires nécessaires"

3. **Vélo prêt** 🚴
   - Objet : "Bonne nouvelle ! Votre vélo est prêt"
   - Contenu : Message chaleureux
   - PDF : Facture
   - CTA : "Venir récupérer"

4. **Commande arrivée** 📦
   - Objet : "Votre commande est arrivée !"
   - Contenu : Détails commande
   - CTA : "Venir récupérer"

5. **Facture envoyée** 💰
   - Objet : "Votre facture [#numero]"
   - Contenu : Récapitulatif
   - PDF : Facture

6. **Avoir envoyé** 💳
   - Objet : "Votre avoir [#numero]"
   - Contenu : Explication
   - PDF : Avoir

### 📱 SMS (Courts et Directs)

1. **Vélo prêt** 🚴
   ```
   [Nom Atelier] : Bonne nouvelle ! Votre vélo est prêt. 
   Passez le récupérer quand vous voulez. À bientôt !
   ```

2. **Commande arrivée** 📦
   ```
   [Nom Atelier] : Votre commande est arrivée ! 
   Venez la récupérer à l'atelier. Merci !
   ```

---

## 🏗️ Architecture

### Schéma Prisma

```prisma
// Historique des communications
model Communication {
  id          String   @id @default(cuid())
  customerId  String
  workOrderId String?
  invoiceId   String?
  
  type        String   // "email" | "sms"
  event       String   // "quote_created", "bike_ready", etc.
  
  recipient   String   // Email ou téléphone
  subject     String?  // Pour emails
  content     String   // Contenu du message
  
  status      String   // "pending", "sent", "failed", "delivered"
  provider    String   // "hubspot"
  externalId  String?  // ID HubSpot
  
  sentAt      DateTime?
  deliveredAt DateTime?
  error       String?
  
  metadata    String?  // JSON avec infos supplémentaires
  
  createdAt   DateTime @default(now())
  
  customer   Customer  @relation(fields: [customerId], references: [id])
  workOrder  WorkOrder? @relation(fields: [workOrderId], references: [id])
  
  @@index([customerId])
  @@index([workOrderId])
  @@index([status])
  @@index([event])
}

// Templates d'emails
model EmailTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  event       String   // "quote_created", "bike_ready", etc.
  
  subject     String
  htmlContent String   // HTML avec variables {{customer.name}}
  textContent String   // Version texte
  
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([event])
}

// Templates SMS
model SMSTemplate {
  id        String   @id @default(cuid())
  name      String   @unique
  event     String   // "bike_ready", "order_arrived"
  
  content   String   // Max 160 caractères avec variables
  
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([event])
}
```

---

## 🔌 Intégration HubSpot

### Configuration

```typescript
// lib/hubspot.ts
import { Client } from '@hubspot/api-client';

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  htmlContent: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}) {
  const response = await hubspotClient.marketing.transactional.send({
    emailId: process.env.HUBSPOT_EMAIL_ID,
    message: {
      to: options.to,
      subject: options.subject,
      html: options.htmlContent,
      attachments: options.attachments
    }
  });
  
  return response;
}

export async function sendSMS(options: {
  to: string;
  content: string;
}) {
  // HubSpot SMS API
  const response = await hubspotClient.conversations.send({
    phoneNumber: options.to,
    message: options.content
  });
  
  return response;
}
```

---

## 📧 Templates d'Emails

### 1. Devis Créé

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .header { background: #4CAF50; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
  </div>
  <div class="content">
    <h2>Bonjour {{customer.firstName}},</h2>
    
    <p>Votre devis <strong>#{{quote.number}}</strong> est prêt !</p>
    
    <h3>Récapitulatif :</h3>
    <ul>
      <li>Vélo : {{bike.brand}} {{bike.model}}</li>
      <li>Type d'intervention : {{workOrder.type}}</li>
      <li>Montant : {{quote.totalTTC}} €</li>
    </ul>
    
    <p>Vous trouverez le devis détaillé en pièce jointe.</p>
    
    <p>
      <a href="{{quote.validateUrl}}" class="button">Valider le devis</a>
    </p>
    
    <p>À très bientôt,<br>L'équipe {{shop.name}}</p>
    
    <p style="color: #666; font-size: 12px;">
      {{shop.address}}<br>
      {{shop.phone}} - {{shop.email}}
    </p>
  </div>
</body>
</html>
```

### 2. Devis Modifié

```html
<div class="content">
  <h2>Bonjour {{customer.firstName}},</h2>
  
  <p>Nous avons une mise à jour concernant votre vélo.</p>
  
  <div style="background: #FFF3CD; padding: 15px; border-left: 4px solid #FFC107;">
    <h3>⚠️ Pièces supplémentaires nécessaires</h3>
    <p>Suite au démontage de votre vélo, nous avons constaté que des pièces supplémentaires doivent être remplacées pour garantir votre sécurité.</p>
  </div>
  
  <h3>Nouveau devis :</h3>
  <ul>
    <li>Montant initial : {{quote.oldTotal}} €</li>
    <li>Pièces supplémentaires : {{quote.additionalParts}} €</li>
    <li><strong>Nouveau montant : {{quote.totalTTC}} €</strong></li>
  </ul>
  
  <p>Le devis mis à jour est en pièce jointe.</p>
  
  <p>N'hésitez pas à nous contacter pour toute question.</p>
</div>
```

### 3. Vélo Prêt

```html
<div class="content">
  <h2>Bonne nouvelle {{customer.firstName}} ! 🎉</h2>
  
  <p style="font-size: 18px; color: #4CAF50;">
    <strong>Votre vélo est prêt !</strong>
  </p>
  
  <p>Nous avons terminé l'intervention sur votre {{bike.brand}} {{bike.model}}.</p>
  
  <h3>Récapitulatif de l'intervention :</h3>
  <ul>
    {{#each parts}}
    <li>{{this.description}} - {{this.price}} €</li>
    {{/each}}
  </ul>
  
  <p><strong>Total : {{invoice.totalTTC}} €</strong></p>
  
  <p>Vous pouvez venir récupérer votre vélo quand vous voulez !</p>
  
  <p style="background: #E3F2FD; padding: 15px;">
    📍 {{shop.address}}<br>
    🕐 Horaires : {{shop.hours}}<br>
    📞 {{shop.phone}}
  </p>
  
  <p>La facture est en pièce jointe.</p>
  
  <p>À très bientôt !<br>L'équipe {{shop.name}}</p>
</div>
```

### 4. Commande Arrivée

```html
<div class="content">
  <h2>Bonjour {{customer.firstName}},</h2>
  
  <p style="font-size: 18px; color: #4CAF50;">
    <strong>📦 Votre commande est arrivée !</strong>
  </p>
  
  <p>Les pièces que vous avez commandées sont disponibles à l'atelier.</p>
  
  <h3>Votre commande :</h3>
  <ul>
    {{#each items}}
    <li>{{this.name}} x{{this.quantity}}</li>
    {{/each}}
  </ul>
  
  <p>Vous pouvez passer la récupérer aux horaires suivants :</p>
  
  <p style="background: #E3F2FD; padding: 15px;">
    📍 {{shop.address}}<br>
    🕐 {{shop.hours}}<br>
    📞 {{shop.phone}}
  </p>
  
  <p>À bientôt !<br>{{shop.name}}</p>
</div>
```

---

## 📱 Templates SMS

### 1. Vélo Prêt

```
{{shop.name}} : Bonne nouvelle ! Votre {{bike.brand}} est prêt. Passez le récupérer quand vous voulez. {{shop.address}}. À bientôt !
```

### 2. Commande Arrivée

```
{{shop.name}} : Votre commande est arrivée ! Venez la récupérer à l'atelier ({{shop.address}}). Merci !
```

---

## 🔧 API Routes

### POST /api/communications/send

```typescript
// api/communications/send/route.ts
export async function POST(req: Request) {
  const { type, event, customerId, workOrderId, data } = await req.json();
  
  // 1. Récupérer le client
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });
  
  // 2. Récupérer le template
  const template = type === 'email' 
    ? await prisma.emailTemplate.findFirst({ where: { event, active: true }})
    : await prisma.smsTemplate.findFirst({ where: { event, active: true }});
  
  // 3. Remplacer les variables
  const content = replaceVariables(template.content, {
    customer,
    shop: await getShopSettings(),
    ...data
  });
  
  // 4. Envoyer via HubSpot
  if (type === 'email') {
    const result = await sendEmail({
      to: customer.email,
      subject: replaceVariables(template.subject, data),
      htmlContent: content,
      attachments: data.attachments
    });
  } else {
    const result = await sendSMS({
      to: customer.phone,
      content
    });
  }
  
  // 5. Enregistrer dans l'historique
  await prisma.communication.create({
    data: {
      customerId,
      workOrderId,
      type,
      event,
      recipient: type === 'email' ? customer.email : customer.phone,
      subject: template.subject,
      content,
      status: 'sent',
      provider: 'hubspot',
      sentAt: new Date()
    }
  });
  
  return NextResponse.json({ success: true });
}
```

---

## 🎨 Interface Utilisateur

### Page `/communications`

```typescript
// Historique des communications
<Table>
  <TableHead>
    <TableRow>
      <TableCell>Date</TableCell>
      <TableCell>Client</TableCell>
      <TableCell>Type</TableCell>
      <TableCell>Événement</TableCell>
      <TableCell>Statut</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {communications.map(comm => (
      <TableRow key={comm.id}>
        <TableCell>{formatDate(comm.sentAt)}</TableCell>
        <TableCell>{comm.customer.name}</TableCell>
        <TableCell>
          {comm.type === 'email' ? '📧' : '📱'} {comm.type}
        </TableCell>
        <TableCell>{comm.event}</TableCell>
        <TableCell>
          <Chip 
            label={comm.status} 
            color={comm.status === 'delivered' ? 'success' : 'default'}
          />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Boutons d'Action dans Ticket

```typescript
// Dans /tickets/[id]
<Stack direction="row" spacing={1}>
  <Button 
    startIcon={<EmailIcon />}
    onClick={() => sendCommunication('email', 'quote_created')}
  >
    Envoyer devis
  </Button>
  
  <Button 
    startIcon={<CheckIcon />}
    onClick={() => sendCommunication('email', 'bike_ready')}
  >
    Vélo prêt
  </Button>
  
  <Button 
    startIcon={<SmsIcon />}
    onClick={() => sendCommunication('sms', 'bike_ready')}
  >
    SMS vélo prêt
  </Button>
</Stack>
```

---

## 📊 Variables Disponibles

### Templates

```typescript
{
  // Client
  customer: {
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  },
  
  // Atelier
  shop: {
    name: string,
    address: string,
    phone: string,
    email: string,
    hours: string
  },
  
  // Vélo
  bike: {
    brand: string,
    model: string,
    serialNo: string
  },
  
  // Ticket
  workOrder: {
    number: string,
    type: string,
    status: string
  },
  
  // Devis/Facture
  quote: {
    number: string,
    totalHT: number,
    totalTTC: number,
    parts: Array<Part>,
    labor: Array<Labor>
  }
}
```

---

## 🔒 Configuration HubSpot

### Variables d'Environnement

```env
# .env
HUBSPOT_ACCESS_TOKEN=your-access-token
HUBSPOT_EMAIL_ID=your-email-template-id
HUBSPOT_SMS_ENABLED=true
```

### Obtenir les Credentials

1. Aller sur https://app.hubspot.com
2. Settings → Integrations → API Key
3. Créer un Private App
4. Permissions : `transactional-email`, `conversations`
5. Copier le token

---

## 📋 Plan d'Implémentation

### Phase 1 : Schéma et Infrastructure (1h)
- [ ] Ajouter tables au schéma Prisma
- [ ] Créer migration
- [ ] Installer HubSpot SDK

### Phase 2 : Templates (2h)
- [ ] Créer templates emails HTML
- [ ] Créer templates SMS
- [ ] Seed templates dans DB

### Phase 3 : API et Logique (2h)
- [ ] Créer `lib/hubspot.ts`
- [ ] Créer API `/api/communications/send`
- [ ] Fonction `replaceVariables()`
- [ ] Génération PDF pour emails

### Phase 4 : Interface (2h)
- [ ] Page `/communications` (historique)
- [ ] Boutons dans `/tickets/[id]`
- [ ] Page `/settings/communications` (config)

### Phase 5 : Tests (1h)
- [ ] Test envoi email
- [ ] Test envoi SMS
- [ ] Test avec PDF
- [ ] Vérifier historique

---

**Temps total** : 8 heures  
**Prêt à commencer ?** 🚀
