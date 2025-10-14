# Fix: Génération Devis depuis Ordre de Réparation

**Date**: 14 octobre 2025  
**Problème**: Erreur 404 lors de la génération d'un devis depuis un ticket

---

## 🐛 Problème Identifié

### Symptôme
```
Failed to load resource: the server responded with a status of 404 (Not Found)
/api/pos/workorders/cmgr0cdia0007ec8ogq1o5hv6/quote
```

### Cause
Les routes API suivantes étaient **manquantes**:
1. `GET /api/pos/workorders/[id]/quote` - Générer un devis
2. `POST /api/pos/workorders/[id]/sale` - Créer une vente/facture

Le code frontend appelait ces routes mais elles n'existaient pas.

---

## ✅ Solution Appliquée

### 1. Route Quote (Devis)

**Fichier créé**: `apps/web/src/app/api/pos/workorders/[id]/quote/route.ts`

**Fonctionnalité**:
- Récupère le workorder avec ses pièces
- Calcule le coût de la main d'œuvre (temps × taux horaire)
- Calcule le coût des pièces
- Applique la TVA (20%)
- Retourne un devis structuré

**Exemple de réponse**:
```json
{
  "workOrderId": "cmgr0cdia0007ec8ogq1o5hv6",
  "customerId": "cm123...",
  "customerName": "Jean Dupont",
  "totalHT": 85.00,
  "tvaRate": 0.2,
  "totalTVA": 17.00,
  "totalTTC": 102.00,
  "currency": "EUR",
  "lines": [
    {
      "description": "Main d'œuvre - 60 minutes",
      "qty": 1,
      "priceHT": 60.00,
      "totalHT": 60.00
    },
    {
      "description": "Chambre à air 700x25",
      "qty": 1,
      "priceHT": 25.00,
      "totalHT": 25.00
    }
  ]
}
```

### 2. Route Sale (Vente/Facture)

**Fichier créé**: `apps/web/src/app/api/pos/workorders/[id]/sale/route.ts`

**Fonctionnalité**:
- Récupère le workorder avec ses pièces
- Calcule les totaux (comme pour le devis)
- **Crée une facture** dans la base de données
- Crée les lignes de facture (main d'œuvre + pièces)
- Met à jour le statut du workorder à `"invoiced"`
- Retourne l'ID de la facture créée

**Exemple de réponse**:
```json
{
  "saleId": "cm456...",
  "totals": {
    "workOrderId": "cmgr0cdia0007ec8ogq1o5hv6",
    "customerId": "cm123...",
    "customerName": "Jean Dupont",
    "totalHT": 85.00,
    "tvaRate": 0.2,
    "totalTVA": 17.00,
    "totalTTC": 102.00,
    "currency": "EUR",
    "lines": [...]
  }
}
```

---

## 📊 Calculs Effectués

### Main d'œuvre
```typescript
const laborCostHT = (estimatedMinutes / 60) * hourlyRate;
```

**Exemple**:
- Temps estimé: 60 minutes
- Taux horaire: 60 €/h
- Coût: (60 / 60) × 60 = **60 € HT**

### Pièces
```typescript
const partsCostHT = parts.reduce((sum, part) => sum + part.priceHT * part.qty, 0);
```

**Exemple**:
- Chambre à air: 25 € × 1 = 25 €
- Câble frein: 15 € × 2 = 30 €
- Total pièces: **55 € HT**

### TVA et Total
```typescript
const totalHT = laborCostHT + partsCostHT;
const totalTVA = totalHT * 0.2; // 20%
const totalTTC = totalHT + totalTVA;
```

**Exemple**:
- Total HT: 60 + 55 = **115 € HT**
- TVA (20%): 115 × 0.2 = **23 € TVA**
- Total TTC: 115 + 23 = **138 € TTC**

---

## 🔄 Flux Utilisateur

### 1. Créer un ticket (workorder)
```
1. Aller dans "Tickets"
2. Créer un nouveau ticket
3. Ajouter client, vélo, description
4. Estimer le temps de réparation
5. Ajouter des pièces si nécessaire
```

### 2. Voir le devis
```
1. Cliquer sur "Voir le devis"
2. → Appel GET /api/pos/workorders/[id]/quote
3. → Affichage du devis avec totaux
```

### 3. Créer la vente
```
1. Dans le modal du devis, cliquer "Créer la vente"
2. → Appel POST /api/pos/workorders/[id]/sale
3. → Création de la facture dans la DB
4. → Mise à jour du statut du workorder
5. → Affichage du numéro de facture
```

---

## 🗄️ Structure Base de Données

### WorkOrder
```prisma
model WorkOrder {
  id                 String          @id @default(cuid())
  status             String          @default("created")
  customerId         String?
  bikeId             String?
  type               String?         @default("repair")
  estimatedMinutes   Int?            // ← Temps estimé
  hourlyRate         Float?          // ← Taux horaire
  appointmentDate    DateTime?
  parts              WorkOrderPart[] // ← Pièces
  customer           Customer?
  bike               CustomerBike?
}
```

### WorkOrderPart
```prisma
model WorkOrderPart {
  id            String       @id @default(cuid())
  workOrderId   String
  catalogItemId String?
  description   String       // ← Description pièce
  qty           Int          // ← Quantité
  priceHT       Float        // ← Prix unitaire HT
  workOrder     WorkOrder
  catalogItem   CatalogItem?
}
```

### Invoice (créée par la route sale)
```prisma
model Invoice {
  id              String           @id @default(cuid())
  workOrderId     String?          // ← Lien vers workorder
  status          String           @default("draft")
  type            String           @default("invoice")
  subtotalHT      Float            // ← Total HT
  vatAmount       Float            // ← Montant TVA
  totalTTC        Float            // ← Total TTC
  currency        String           @default("EUR")
  vatRate         Float            @default(20)
  lines           InvoiceLine[]    // ← Lignes de facture
}
```

### InvoiceLine
```prisma
model InvoiceLine {
  id              String  @id @default(cuid())
  invoiceId       String
  type            String  @default("part")  // "part" ou "labor"
  description     String
  qty             Float
  unitPriceHT     Float?
  unitPriceTTC    Float?
  vatRate         Float?
  totalHT         Float
  totalTTC        Float
  partId          String?  // ← Lien vers catalogItem si pièce
  invoice         Invoice
}
```

---

## 🧪 Tests à Effectuer

### Test 1: Devis sans pièces (main d'œuvre uniquement)
```
1. Créer un workorder
2. Estimer 30 minutes
3. Taux horaire: 60 €/h
4. Cliquer "Voir le devis"
5. ✓ Vérifier: Total HT = 30 € (0.5h × 60€)
6. ✓ Vérifier: Total TTC = 36 € (30 + 20% TVA)
```

### Test 2: Devis avec pièces
```
1. Créer un workorder
2. Estimer 60 minutes (60 € HT)
3. Ajouter pièce: Chambre à air 25 € × 1
4. Cliquer "Voir le devis"
5. ✓ Vérifier: Total HT = 85 € (60 + 25)
6. ✓ Vérifier: Total TTC = 102 € (85 + 20% TVA)
7. ✓ Vérifier: 2 lignes (main d'œuvre + pièce)
```

### Test 3: Création facture
```
1. Depuis le devis, cliquer "Créer la vente"
2. ✓ Vérifier: Message "Vente créée (#cm456...)"
3. ✓ Vérifier: Facture créée dans la DB
4. ✓ Vérifier: Statut workorder = "invoiced"
5. ✓ Vérifier: Lignes de facture créées
```

### Test 4: Workorder sans client
```
1. Créer un workorder sans client
2. Cliquer "Voir le devis"
3. ✓ Vérifier: Devis s'affiche (customerName = "Client inconnu")
4. Cliquer "Créer la vente"
5. ✓ Vérifier: Erreur 400 "Le workorder doit avoir un client associé"
```

---

## 🎯 Fichiers Modifiés/Créés

### Créés
1. `apps/web/src/app/api/pos/workorders/[id]/quote/route.ts`
2. `apps/web/src/app/api/pos/workorders/[id]/sale/route.ts`

### Existants (non modifiés)
- `apps/web/src/lib/api.ts` - Contient `quoteFromWorkOrder()` et `createSaleFromWorkOrder()`
- `apps/web/src/app/tickets/[id]/page.tsx` - Appelle ces fonctions

---

## ⚠️ Points d'Attention

### 1. Taux horaire par défaut
Si `hourlyRate` n'est pas défini dans le workorder, le coût de la main d'œuvre sera **0 €**.

**Solution**: Définir un taux horaire par défaut dans l'application ou demander à l'utilisateur.

### 2. TVA fixe à 20%
Actuellement, la TVA est fixée à 20% pour tous les articles.

**Amélioration future**: Permettre des taux de TVA différents par article (5.5%, 10%, 20%).

### 3. Statut workorder
Après création de la facture, le statut passe à `"invoiced"`.

**Flux complet suggéré**:
- `"created"` → Ticket créé
- `"in_progress"` → Réparation en cours
- `"ready"` → Prêt à être récupéré
- `"invoiced"` → Facturé
- `"completed"` → Terminé et payé

### 4. Numérotation factures
Les factures créées n'ont pas de numéro (`number: null`).

**À implémenter**: Système de numérotation automatique (utiliser `InvoiceSequence`).

---

## 🚀 Prochaines Étapes

### Court terme
- [x] Créer route `/api/pos/workorders/[id]/quote`
- [x] Créer route `/api/pos/workorders/[id]/sale`
- [ ] Tester le flux complet
- [ ] Vérifier l'affichage du devis dans l'UI

### Moyen terme
- [ ] Ajouter numérotation automatique des factures
- [ ] Permettre de modifier le taux horaire par workorder
- [ ] Ajouter des taux de TVA variables
- [ ] Implémenter le téléchargement PDF du devis

### Long terme
- [ ] Historique des devis/factures par client
- [ ] Statistiques sur les réparations
- [ ] Gestion des acomptes
- [ ] Relances automatiques pour factures impayées

---

## 📚 Documentation

- **Ce document**: `FIX_WORKORDER_QUOTE.md`
- **API Reference**: Voir les commentaires dans les fichiers `route.ts`
- **Schéma DB**: `apps/web/prisma/schema.prisma`

---

## ✅ Résultat

**Les routes API manquantes ont été créées.**

**Testez maintenant**:
1. Créer un ticket
2. Estimer le temps
3. Ajouter des pièces
4. Cliquer "Voir le devis" → **Devrait fonctionner** ✅
5. Cliquer "Créer la vente" → **Devrait créer la facture** ✅

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
