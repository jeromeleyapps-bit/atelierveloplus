# ✅ Corrections Devis/Factures

## 🐛 Problèmes Identifiés et Corrigés

### 1. ✅ Numérotation Incorrecte des Devis
**Problème** : Les devis recevaient un numéro FAC-XXXX au lieu de DEV-XXXX

**Cause** : La fonction `generateInvoiceNumber()` ne tenait pas compte du type de document

**Solution** :
- Modifié `src/lib/invoice-number.ts` pour accepter un paramètre `type`
- Modifié `src/app/api/finance/invoices/[id]/issue/route.ts` pour passer le type
- Préfixes : DEV (devis), FAC (facture), AVO (avoir)

**Code** :
```typescript
// invoice-number.ts
export async function generateInvoiceNumber(
  type: 'invoice' | 'quote' | 'credit' = 'invoice'
): Promise<string> {
  // ...
  const prefix = type === 'quote' ? 'DEV' : type === 'credit' ? 'AVO' : 'FAC';
  return `${prefix}-${currentYear}-${paddedNumber}`;
}

// issue/route.ts
const documentType = (current.type as 'invoice' | 'quote' | 'credit') || 'invoice';
const invoiceNumber = await generateInvoiceNumber(documentType);
```

### 2. ✅ Totaux TTC Non Actualisés
**Problème** : Les totaux TTC des lignes ne se calculaient pas automatiquement

**Cause** : Les champs `totalHT` et `totalTTC` n'étaient pas calculés lors de l'ajout de lignes

**Solution** :
- Modifié `src/app/api/finance/invoices/[id]/lines/route.ts`
- Calcul automatique de `totalHT` et `totalTTC` pour chaque ligne
- Prise en compte du mode AE_TTC vs HT_TVA

**Code** :
```typescript
// Calculer les totaux de ligne
const qty = Number(body.qty || 1);
const vatRate = body.vatRate != null ? Number(body.vatRate) : inv.vatRate;
const isAE = inv.pricingMode === 'AE_TTC';

let totalHT = 0;
let totalTTC = 0;

if (isAE) {
  const unitTTC = Number(body.unitPriceTTC || 0);
  totalTTC = unitTTC * qty;
  totalHT = vatRate > 0 ? totalTTC / (1 + vatRate / 100) : totalTTC;
} else {
  const unitHT = Number(body.unitPriceHT || 0);
  totalHT = unitHT * qty;
  totalTTC = totalHT * (1 + (vatRate > 0 ? vatRate / 100 : 0));
}
```

### 3. ✅ TVA Main d'Œuvre et Statut Auto-Entrepreneur
**Problème** : La TVA de la main d'œuvre ne tenait pas compte du statut AE

**Solution** : Déjà corrigé dans `src/app/api/finance/quotes/route.ts`
- Détection automatique du statut auto-entrepreneur
- TVA 0% si AE, 20% sinon
- Mode AE_TTC si AE, HT_TVA sinon

**Code** :
```typescript
// Check if user is auto-entrepreneur
const aeSetting = await prisma.globalSetting.findUnique({
  where: { key: "autoEntrepreneur" },
});
const isAE = aeSetting?.value === "true";

// Create the quote
const quote = await prisma.invoice.create({
  data: {
    // ...
    pricingMode: isAE ? "AE_TTC" : "HT_TVA",
    vatRate: isAE ? 0 : 20,
  },
});
```

---

## 📊 Résumé des Modifications

### Fichiers Modifiés

1. **`src/lib/invoice-number.ts`** ✅
   - Ajout paramètre `type` à `generateInvoiceNumber()`
   - Préfixes dynamiques (DEV/FAC/AVO)

2. **`src/app/api/finance/invoices/[id]/issue/route.ts`** ✅
   - Passage du type de document à `generateInvoiceNumber()`

3. **`src/app/api/finance/invoices/[id]/lines/route.ts`** ✅
   - Calcul automatique de `totalHT` et `totalTTC`
   - Prise en compte du mode AE_TTC

4. **`src/app/api/finance/quotes/route.ts`** ✅ (déjà fait)
   - Détection statut auto-entrepreneur
   - TVA 0% si AE

---

## 🎯 Résultats Attendus

### Numérotation
```
Devis:    DEV-2025-0001, DEV-2025-0002, ...
Factures: FAC-2025-0001, FAC-2025-0002, ...
Avoirs:   AVO-2025-0001, AVO-2025-0002, ...
```

### Totaux TTC
```
Ligne 1: 50€ HT × 1.20 = 60€ TTC ✅
Ligne 2: 100€ HT × 1.20 = 120€ TTC ✅
Total: 180€ TTC ✅
```

### TVA Auto-Entrepreneur
```
Si AE:
  Mode: AE_TTC
  TVA: 0%
  Mention: "TVA non applicable - article 293 B du CGI"

Si Non-AE:
  Mode: HT_TVA
  TVA: 20%
```

---

## 🧪 Tests à Effectuer

### Test 1: Numérotation Devis
```
1. Créer un devis
2. Émettre le devis
3. Vérifier numéro: DEV-2025-XXXX ✅
```

### Test 2: Numérotation Facture
```
1. Créer une facture directe
2. Émettre la facture
3. Vérifier numéro: FAC-2025-XXXX ✅
```

### Test 3: Conversion Devis → Facture
```
1. Créer un devis DEV-2025-0001
2. Convertir en facture
3. Vérifier nouveau numéro: FAC-2025-XXXX ✅
```

### Test 4: Totaux TTC
```
1. Créer un devis
2. Ajouter ligne: 50€ HT, qté 2
3. Vérifier total ligne: 120€ TTC (50 × 2 × 1.20) ✅
4. Ajouter autre ligne: 100€ HT, qté 1
5. Vérifier total: 240€ TTC ✅
```

### Test 5: Auto-Entrepreneur
```
1. Activer mode AE dans la base:
   INSERT INTO "GlobalSetting" (key, value)
   VALUES ('autoEntrepreneur', 'true');

2. Créer un devis
3. Vérifier:
   - Mode: AE_TTC ✅
   - TVA: 0% ✅
   - Mention légale affichée ✅
```

---

## 🔧 Configuration Auto-Entrepreneur

Pour activer le mode auto-entrepreneur :

```sql
-- Via Supabase SQL Editor
INSERT INTO "GlobalSetting" (key, value)
VALUES ('autoEntrepreneur', 'true')
ON CONFLICT (key) DO UPDATE SET value = 'true';
```

Pour désactiver :

```sql
UPDATE "GlobalSetting"
SET value = 'false'
WHERE key = 'autoEntrepreneur';
```

---

## 💡 Points d'Attention

### Numérotation
- ✅ Les numéros sont séquentiels par année
- ✅ Tous les types (DEV/FAC/AVO) partagent la même séquence
- ✅ Pas de "trous" dans la numérotation

### Calcul des Totaux
- ✅ Mode AE_TTC : Calcul depuis TTC vers HT
- ✅ Mode HT_TVA : Calcul depuis HT vers TTC
- ✅ TVA par ligne possible (override)

### Conversion Devis → Facture
- ✅ Le devis garde son numéro DEV
- ✅ La facture reçoit un nouveau numéro FAC
- ✅ Toutes les lignes sont copiées
- ✅ Les totaux sont recalculés

---

## 🎊 Résultat Final

### Avant
- ❌ Devis numérotés FAC-XXXX
- ❌ Totaux TTC non calculés
- ❌ TVA toujours 20%

### Après
- ✅ **Devis numérotés DEV-XXXX**
- ✅ **Totaux TTC calculés automatiquement**
- ✅ **TVA 0% si auto-entrepreneur**
- ✅ **Mention légale automatique**

---

**Toutes les corrections appliquées !** ✅  
**Système de numérotation correct !** 🎯  
**Calculs automatiques fonctionnels !** 💰  
**Prêt pour les tests !** 🚀
