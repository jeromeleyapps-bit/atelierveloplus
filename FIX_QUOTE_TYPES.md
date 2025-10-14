# Fix: Types QuoteResult et QuoteLine

**Date**: 14 octobre 2025  
**Problème**: Erreur de types dans la page tickets

---

## 🐛 Problème

Erreur lors de l'affichage d'un ticket:
```
Error at TicketDetailPage (page.tsx:55:78)
```

**Cause**: Incohérence entre les types TypeScript et les données retournées par l'API.

---

## ✅ Corrections Appliquées

### 1. Type `QuoteLine` Corrigé

**Fichier**: `apps/web/src/lib/api.ts`

**Avant**:
```typescript
export type QuoteLine = {
  description: string;
  qty: number;
  priceHT: number;
  lineTotalHT: number;  // ❌ Propriété inexistante dans l'API
};
```

**Après**:
```typescript
export type QuoteLine = {
  type?: string;         // ✅ Ajouté (optionnel)
  description: string;
  qty: number;
  priceHT: number;
  totalHT: number;       // ✅ Corrigé (au lieu de lineTotalHT)
};
```

### 2. Type `QuoteResult` Enrichi

**Avant**:
```typescript
export type QuoteResult = {
  workOrderId: string;
  partsHT: number;       // ❌ Manquant dans certains cas
  laborHT: number;       // ❌ Manquant dans certains cas
  totalHT: number;
  tvaRate: number;
  totalTVA: number;
  totalTTC: number;
  currency: string;
  lines: QuoteLine[];
};
```

**Après**:
```typescript
export type QuoteResult = {
  workOrderId: string;
  customerId?: string;      // ✅ Ajouté (optionnel)
  customerName?: string;    // ✅ Ajouté (optionnel)
  partsHT?: number;         // ✅ Rendu optionnel
  laborHT?: number;         // ✅ Rendu optionnel
  totalHT: number;
  tvaRate: number;
  totalTVA: number;
  totalTTC: number;
  currency: string;
  lines: QuoteLine[];
};
```

### 3. Page Tickets Corrigée

**Fichier**: `apps/web/src/app/tickets/[id]/page.tsx`

**Changement 1**: Affichage du type de ligne
```typescript
// Avant
<td>{l.type}</td>

// Après
<td>{l.type || "-"}</td>  // ✅ Gère le cas où type est undefined
```

**Changement 2**: Propriété totalHT
```typescript
// Avant
{l.lineTotalHT.toFixed(2)} €

// Après
{l.totalHT.toFixed(2)} €  // ✅ Nom correct
```

**Changement 3**: Affichage conditionnel partsHT et laborHT
```typescript
// Avant
<Typography>Pièces HT: {quote.partsHT.toFixed(2)} €</Typography>
<Typography>MO HT: {quote.laborHT.toFixed(2)} €</Typography>

// Après
{quote.partsHT !== undefined && (
  <Typography>Pièces HT: {quote.partsHT.toFixed(2)} €</Typography>
)}
{quote.laborHT !== undefined && (
  <Typography>MO HT: {quote.laborHT.toFixed(2)} €</Typography>
)}
```

**Changement 4**: Affichage TVA en pourcentage
```typescript
// Avant
TVA ({quote.tvaRate}%):  // ❌ Affiche 0.2 au lieu de 20

// Après
TVA ({(quote.tvaRate * 100).toFixed(0)}%):  // ✅ Affiche 20
```

---

## 📊 Données Retournées par l'API

### Route: `GET /api/pos/workorders/[id]/quote`

**Exemple de réponse**:
```json
{
  "workOrderId": "cmgr0cdia0007ec8ogq1o5hv6",
  "customerId": "cm123abc",
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

**Note**: `partsHT` et `laborHT` ne sont pas retournés par l'API actuelle. Ils sont calculés côté client si nécessaire.

---

## 🔄 Cohérence Types ↔ API

### QuoteLine
| Propriété | Type | API | Page |
|-----------|------|-----|------|
| `type` | `string?` | ❌ Non retourné | ✅ Géré avec `|| "-"` |
| `description` | `string` | ✅ Retourné | ✅ Affiché |
| `qty` | `number` | ✅ Retourné | ✅ Affiché |
| `priceHT` | `number` | ✅ Retourné | ✅ Affiché |
| `totalHT` | `number` | ✅ Retourné | ✅ Affiché |

### QuoteResult
| Propriété | Type | API | Page |
|-----------|------|-----|------|
| `workOrderId` | `string` | ✅ Retourné | ✅ Utilisé |
| `customerId` | `string?` | ✅ Retourné | ✅ Optionnel |
| `customerName` | `string?` | ✅ Retourné | ✅ Optionnel |
| `partsHT` | `number?` | ❌ Non retourné | ✅ Optionnel |
| `laborHT` | `number?` | ❌ Non retourné | ✅ Optionnel |
| `totalHT` | `number` | ✅ Retourné | ✅ Affiché |
| `tvaRate` | `number` | ✅ Retourné (0.2) | ✅ Affiché (20%) |
| `totalTVA` | `number` | ✅ Retourné | ✅ Affiché |
| `totalTTC` | `number` | ✅ Retourné | ✅ Affiché |
| `currency` | `string` | ✅ Retourné | ✅ Utilisé |
| `lines` | `QuoteLine[]` | ✅ Retourné | ✅ Affiché |

---

## 🧪 Tests à Effectuer

### Test 1: Devis avec main d'œuvre uniquement
```
1. Créer un ticket
2. Estimer 60 minutes à 60 €/h
3. Ne pas ajouter de pièces
4. Cliquer "Voir le devis"
5. ✓ Vérifier: Affichage correct
6. ✓ Vérifier: Pas d'erreur console
```

### Test 2: Devis avec pièces
```
1. Créer un ticket
2. Estimer 30 minutes à 60 €/h
3. Ajouter une pièce: Chambre à air 25 €
4. Cliquer "Voir le devis"
5. ✓ Vérifier: 2 lignes affichées
6. ✓ Vérifier: Totaux corrects
```

### Test 3: Devis sans estimation
```
1. Créer un ticket
2. Ajouter uniquement des pièces
3. Cliquer "Voir le devis"
4. ✓ Vérifier: Pas d'erreur
5. ✓ Vérifier: Seules les pièces sont affichées
```

---

## 📝 Fichiers Modifiés

1. **`apps/web/src/lib/api.ts`**
   - Lignes 224-243: Types `QuoteLine` et `QuoteResult`

2. **`apps/web/src/app/tickets/[id]/page.tsx`**
   - Lignes 711-745: Affichage du devis

---

## ✅ Résultat

**Les types TypeScript sont maintenant cohérents avec l'API.**

**Testez**:
1. Créer un ticket
2. Estimer le temps
3. Ajouter des pièces
4. Cliquer "Voir le devis" → **Devrait fonctionner sans erreur** ✅

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
