# 📋 Implémentation Système Devis/Factures

## ✅ Ce qui a été Fait

### 1. Schéma Prisma Modifié
- ✅ Ajout du type `"quote"` au modèle `Invoice`
- ✅ Nouveaux champs pour les devis :
  - `validUntil` - Date d'expiration du devis
  - `convertedAt` - Date de conversion en facture
  - `convertedToId` - ID de la facture créée

### 2. API Routes Créées

#### POST `/api/finance/quotes`
Créer un nouveau devis pour un ticket
```typescript
{
  workOrderId: string;
  validDays?: number; // Défaut: 30 jours
}
```

#### GET `/api/finance/quotes`
Lister tous les devis
```
?status=draft|converted
&workOrderId=xxx
```

#### POST `/api/finance/invoices/:id/convert-to-invoice`
Convertir un devis en facture
- Copie toutes les lignes du devis
- Marque le devis comme converti
- Crée une nouvelle facture liée

### 3. Fonctions API Client Ajoutées

```typescript
// Créer un devis
await createQuote({ workOrderId: "xxx", validDays: 30 });

// Lister les devis
await listQuotes({ status: "draft" });

// Convertir en facture
await convertQuoteToInvoice(quoteId);
```

---

## 🎯 Workflow Utilisateur

### Scénario 1: Depuis un Ticket

1. **Créer un ticket** pour un client
2. **Cliquer "Créer un devis"** depuis la page du ticket
3. **Ajouter des lignes** :
   - Pièces depuis le catalogue
   - Main d'œuvre
   - Équipements supplémentaires
4. **Envoyer le devis** au client
5. **Convertir en facture** une fois accepté

### Scénario 2: Facture Directe

1. **Aller sur Finance**
2. **Cliquer "Facture directe"**
3. **Sélectionner un ticket**
4. **Créer la facture** immédiatement

### Scénario 3: Depuis Finance

1. **Aller sur Finance**
2. **Onglet "Devis"**
3. **Créer un nouveau devis**
4. **Lier à un ticket**
5. **Convertir en facture** plus tard

---

## 🔄 Prochaines Étapes

### À Implémenter (UI)

#### 1. Bouton "Créer Devis" sur Page Ticket
```tsx
// Dans /tickets/[id]/page.tsx
<Button 
  onClick={handleCreateQuote}
  startIcon={<DescriptionIcon />}
>
  Créer un devis
</Button>
```

#### 2. Améliorer Page Finance avec Onglets
```tsx
<Tabs value={tab} onChange={handleTabChange}>
  <Tab label="Devis" value="quotes" />
  <Tab label="Factures" value="invoices" />
  <Tab label="Avoirs" value="credits" />
</Tabs>
```

#### 3. Bouton "Convertir en Facture" sur Devis
```tsx
<Button 
  onClick={handleConvertToInvoice}
  startIcon={<TransformIcon />}
  disabled={quote.convertedAt}
>
  {quote.convertedAt ? "Déjà converti" : "Convertir en facture"}
</Button>
```

#### 4. Badge "Devis" vs "Facture"
```tsx
<Chip 
  label={invoice.type === "quote" ? "Devis" : "Facture"}
  color={invoice.type === "quote" ? "info" : "primary"}
/>
```

---

## 🗄️ Migration Base de Données

### Commandes à Exécuter

```bash
# Générer le client Prisma avec le nouveau schéma
npx prisma generate

# Créer la migration
npx prisma migrate dev --name add_quotes_support

# Ou push direct (sans migration)
npx prisma db push
```

### Données Existantes

Les factures existantes restent inchangées :
- `type` = `"invoice"` par défaut
- Nouveaux champs sont optionnels (`validUntil`, `convertedAt`, etc.)

---

## 📊 Types de Documents

| Type | Description | Statuts | Peut être converti |
|------|-------------|---------|-------------------|
| **quote** | Devis | draft, sent, accepted, rejected, expired, converted | → invoice |
| **invoice** | Facture | draft, issued, paid, cancelled | → credit |
| **credit** | Avoir | draft, issued | - |

---

## 🎨 UI Suggestions

### Page Ticket - Section Facturation

```
┌─────────────────────────────────────┐
│ Facturation                         │
├─────────────────────────────────────┤
│ ○ Aucun devis/facture               │
│                                     │
│ [Créer un devis]  [Facture directe]│
└─────────────────────────────────────┘
```

Avec devis existant :
```
┌─────────────────────────────────────┐
│ Facturation                         │
├─────────────────────────────────────┤
│ ✓ Devis #DEV-2024-001               │
│   Créé le: 05/10/2024               │
│   Montant: 150,00 €                 │
│   Statut: En attente                │
│                                     │
│ [Voir le devis] [Convertir]        │
└─────────────────────────────────────┘
```

### Page Finance - Onglets

```
┌─────────────────────────────────────┐
│ [Devis] [Factures] [Avoirs]        │
├─────────────────────────────────────┤
│                                     │
│ Liste des devis...                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔍 Filtres Suggérés

### Pour les Devis
- ✅ Statut (draft, sent, accepted, converted)
- ✅ Date de création
- ✅ Date d'expiration
- ✅ Client
- ✅ Montant

### Pour les Factures
- ✅ Statut (draft, issued, paid)
- ✅ Type (invoice, credit)
- ✅ Date d'émission
- ✅ Date de paiement
- ✅ Client
- ✅ Montant

---

## 💡 Fonctionnalités Avancées (Futur)

### 1. Envoi Email Devis
```typescript
POST /api/finance/quotes/:id/send-email
```

### 2. Acceptation Devis par Client
```typescript
POST /api/finance/quotes/:id/accept
```

### 3. Génération PDF Devis
```typescript
GET /api/finance/quotes/:id/pdf
```

### 4. Expiration Automatique
Cron job pour marquer les devis expirés :
```typescript
// Tous les jours à minuit
UPDATE Invoice 
SET status = 'expired' 
WHERE type = 'quote' 
AND status = 'sent' 
AND validUntil < NOW()
```

### 5. Historique Devis → Facture
Afficher le lien entre devis et facture :
```
Devis #DEV-001 → Facture #FAC-001
```

---

## 🧪 Tests à Effectuer

### 1. Créer un Devis
- [ ] Depuis un ticket
- [ ] Ajouter des lignes (pièces + main d'œuvre)
- [ ] Vérifier les totaux
- [ ] Sauvegarder

### 2. Convertir en Facture
- [ ] Cliquer "Convertir en facture"
- [ ] Vérifier que toutes les lignes sont copiées
- [ ] Vérifier les totaux identiques
- [ ] Vérifier le lien devis → facture

### 3. Empêcher Double Conversion
- [ ] Essayer de reconvertir un devis déjà converti
- [ ] Vérifier le message d'erreur

### 4. Filtrage
- [ ] Filtrer par type (quote vs invoice)
- [ ] Filtrer par statut
- [ ] Recherche par numéro

---

## 📝 Notes Techniques

### Numérotation
- **Devis** : `DEV-YYYY-NNNN` (ex: DEV-2024-0001)
- **Factures** : `FAC-YYYY-NNNN` (ex: FAC-2024-0001)
- **Avoirs** : `AVO-YYYY-NNNN` (ex: AVO-2024-0001)

### Statuts Devis
```typescript
type QuoteStatus = 
  | "draft"      // Brouillon
  | "sent"       // Envoyé au client
  | "accepted"   // Accepté par le client
  | "rejected"   // Refusé par le client
  | "expired"    // Expiré
  | "converted"; // Converti en facture
```

### Validité par Défaut
- **30 jours** pour les devis
- Configurable lors de la création

---

## 🎯 Prochaine Action

**Voulez-vous que j'implémente maintenant** :

1. **Le bouton "Créer devis" sur la page ticket** ?
2. **Les onglets sur la page Finance** ?
3. **La conversion devis → facture dans l'UI** ?
4. **Tout à la fois** ?

**Dites-moi ce que vous préférez !** 🚀
