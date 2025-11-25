# 🔧 Fix: Erreur customer_email_missing - 21 novembre 2025

## 📋 Contexte

**Date**: 21 novembre 2025, 23h52  
**Branche**: `fix/macos-build`  
**Commit**: `2b7a48b`

Pendant les corrections TypeScript et ESLint, un test de l'application a révélé une erreur lors de l'envoi de factures par email :

```json
{"error":"customer_email_missing"}
```

**Symptôme** : L'email du client n'était pas trouvé alors qu'il était bien renseigné dans la base de données.

---

## 🔍 Diagnostic

### Analyse du problème

L'application dispose de **3 routes API** pour envoyer des factures par email :

1. ✅ `/api/finance/invoices/[id]/send-email` - Route principale (déjà corrigée)
2. ❌ `/api/finance/invoices/[id]/email` - Route ancienne (bug)
3. ❌ `/api/finance/invoices/[id]/remind` - Route de relance (bug)

### Cause racine

Les routes `/email` et `/remind` ne récupéraient le customer **que via WorkOrder** :

```typescript
// ❌ Code bugué (routes /email et /remind)
const customer = inv.WorkOrder?.Customer || null;
const to = customer?.email;
if (!to) return NextResponse.json({ error: 'customer_email_missing' }, { status: 400 });
```

**Problème** : Les factures directes (créées avec `customerId` sans `workOrderId`) n'avaient pas de `WorkOrder`, donc pas de customer, donc erreur.

### Commit de référence

Le fix avait déjà été implémenté dans la route `/send-email` lors du commit `1c2c35c` (7 novembre 2025) :

```
fix(build): Résoudre erreur Prisma en Program Files + customerId factures + DLLs libvips
```

Ce commit ajoutait le champ `customerId` au schéma Invoice et corrigeait la route `/send-email`, mais les deux autres routes n'avaient pas été mises à jour.

---

## ✅ Solution Appliquée

### Pattern de correction

Ajout d'un **fallback** pour récupérer le customer via `customerId` si pas de WorkOrder :

```typescript
// ✅ Code corrigé
// Récupérer customer via WorkOrder.Customer (inclus) OU customerId direct
let customer = inv.WorkOrder?.Customer || null;

// Si pas de customer via workOrder mais customerId présent, récupérer directement
if (!customer && inv.customerId) {
  customer = await prisma.customer.findUnique({
    where: { id: inv.customerId }
  });
}

const to = customer?.email;
if (!to) return NextResponse.json({ error: 'customer_email_missing' }, { status: 400 });
```

### Fichiers modifiés

1. **src/app/api/finance/invoices/[id]/email/route.ts**
   - Lignes 128-147 : Ajout fallback customerId
   - +12 lignes, -2 lignes

2. **src/app/api/finance/invoices/[id]/remind/route.ts**
   - Lignes 75-89 : Ajout fallback customerId
   - +13 lignes, -3 lignes

### Validation

- ✅ **ESLint** : 0 erreur
- ✅ **TypeScript** : 0 erreur
- ✅ **Pattern cohérent** : Les 3 routes email utilisent maintenant le même pattern
- ✅ **Support complet** : Factures directes ET factures via WorkOrder

---

## 🎯 Impact

### Avant la correction

- ❌ Factures directes (customerId sans workOrder) : **Échec envoi email**
- ✅ Factures via WorkOrder : Envoi email OK

### Après la correction

- ✅ Factures directes (customerId sans workOrder) : **Envoi email OK**
- ✅ Factures via WorkOrder : Envoi email OK
- ✅ Relances de factures : Fonctionne pour tous les types

---

## 📊 Historique des corrections liées

| Date | Commit | Description |
|------|--------|-------------|
| 7 nov 2025 | `1c2c35c` | Ajout customerId au schéma Invoice + Fix route /send-email |
| 7 nov 2025 | `c6055d4` | Documentation erreur 500 Invoice.customerId |
| 21 nov 2025 | `2b7a48b` | **Fix routes /email et /remind** (ce commit) |

---

## 🔗 Références

- **Issue** : #customer-email #invoice-email #customerId
- **Pattern** : Identique à `/send-email` (lignes 83-91)
- **Migration DB** : `20251107095000_add_invoice_customerid`
- **Schéma Prisma** : `Invoice.customerId` (optionnel, relation Customer)

---

## 📝 Notes pour l'équipe

### Pourquoi 3 routes email ?

1. **`/send-email`** : Route moderne avec génération PDF complète (pdf-invoice.ts)
2. **`/email`** : Route legacy avec génération PDF basique (pdf-lib)
3. **`/remind`** : Route spécialisée pour les relances de paiement

### Recommandation

Considérer la **consolidation** de ces 3 routes en une seule route avec paramètre `type` :
- `type: 'invoice'` → Envoi facture
- `type: 'reminder'` → Relance paiement

Cela éviterait les désynchronisations de code comme celle-ci.

---

## ✅ Résultat Final

**Statut** : ✅ **CORRIGÉ**  
**Test** : L'envoi de factures par email fonctionne maintenant pour tous les types de factures (directes et via WorkOrder).

**Commit** : `2b7a48b` - fix(invoices): Corriger erreur customer_email_missing - Récupérer customerId direct

