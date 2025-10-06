# 📧 Communications - État d'Avancement

## ✅ Complété (2h)

### 1. Schéma Prisma ✅
- Table `Communication` créée
- Table `EmailTemplate` créée  
- Table `SMSTemplate` créée
- Relations ajoutées (Customer, WorkOrder)
- Migration appliquée

### 2. Infrastructure ✅
- `lib/hubspot.ts` - Intégration HubSpot
- `lib/template-engine.ts` - Moteur de templates
- `@hubspot/api-client` installé

### 3. API ✅
- `POST /api/communications/send` créée
- Gestion emails et SMS
- Remplacement variables
- Historique en DB

### 4. Templates Email ✅
- Devis créé
- Vélo prêt
- Commande arrivée

---

## ⚠️ Problème Rencontré

**Erreur** : `prisma.smsTemplate` is undefined

**Cause** : Le client Prisma n'a pas été correctement régénéré après l'ajout des nouvelles tables.

**Solution** :
1. Redémarrer le serveur Next.js
2. Ou exécuter : `npx prisma generate --force`
3. Puis réexécuter : `npx tsx seed-communication-templates.ts`

---

## 📋 À Faire

### 1. Finaliser Templates SMS
```bash
# Après redémarrage serveur
npx tsx seed-communication-templates.ts
```

### 2. Ajouter Fonction dans lib/api.ts
```typescript
export async function sendCommunication(data: {
  type: 'email' | 'sms';
  event: string;
  customerId: string;
  workOrderId?: string;
  data?: any;
}) {
  return request('/communications/send', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

### 3. Ajouter Boutons dans Tickets
```typescript
// Dans /tickets/[id]/page.tsx
<Button 
  startIcon={<EmailIcon />}
  onClick={() => sendCommunication({
    type: 'email',
    event: 'bike_ready',
    customerId: ticket.customerId,
    workOrderId: ticket.id
  })}
>
  Envoyer "Vélo prêt"
</Button>

<Button 
  startIcon={<SmsIcon />}
  onClick={() => sendCommunication({
    type: 'sms',
    event: 'bike_ready',
    customerId: ticket.customerId,
    workOrderId: ticket.id
  })}
>
  SMS "Vélo prêt"
</Button>
```

### 4. Page Historique Communications
- Créer `/communications/page.tsx`
- Liste des communications envoyées
- Filtres par type, statut, client
- Détails de chaque communication

### 5. Configuration HubSpot
- Ajouter dans `.env.local` :
  ```env
  HUBSPOT_ACCESS_TOKEN=votre-token
  HUBSPOT_FROM_EMAIL=contact@votre-atelier.fr
  HUBSPOT_FROM_PHONE=+33612345678
  ```

---

## 🧪 Test

### Test 1 : Envoyer Email
```bash
curl -X POST http://localhost:3000/api/communications/send \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-user-id" \
  -d '{
    "type": "email",
    "event": "bike_ready",
    "customerId": "customer-id",
    "workOrderId": "workorder-id"
  }'
```

### Test 2 : Envoyer SMS
```bash
curl -X POST http://localhost:3000/api/communications/send \
  -H "Content-Type: application/json" \
  -H "x-user-id": "your-user-id" \
  -d '{
    "type": "sms",
    "event": "bike_ready",
    "customerId": "customer-id"
  }'
```

---

## 📊 Événements Disponibles

### Emails
- `quote_created` - Devis créé
- `bike_ready` - Vélo prêt
- `order_arrived` - Commande arrivée

### SMS
- `bike_ready` - Vélo prêt
- `order_arrived` - Commande arrivée

---

## 🔧 Variables Disponibles

```typescript
{
  customer: {
    firstName, lastName, email, phone
  },
  shop: {
    name, address, city, postalCode, phone, email, hours
  },
  bike: {
    brand, model, serialNo, color
  },
  workOrder: {
    id, type, status
  },
  invoice: {
    number, totalHT, totalTTC
  },
  parts: [
    { description, qty, priceHT, totalHT }
  ]
}
```

---

## 📝 Notes

- HubSpot API key configurée ✅
- Templates email créés ✅
- Templates SMS à créer (après fix Prisma)
- Interface UI à créer
- Tests à effectuer

---

## 🎯 Prochaine Session

1. Redémarrer serveur Next.js
2. Seed templates SMS
3. Ajouter boutons dans tickets
4. Créer page historique
5. Tester envoi réel

---

**Progression** : 60% ✅  
**Temps restant** : 3-4h  
**Bloqueur** : Prisma client (fix: redémarrer serveur)
