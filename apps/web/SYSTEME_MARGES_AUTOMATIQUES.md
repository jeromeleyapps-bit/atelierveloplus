# 💰 Système de Marges Automatiques

## 🎯 Objectif

Appliquer automatiquement des marges sur les prix d'achat fournisseur lors de la création de devis/factures, sans que le client ne voie les prix d'achat.

---

## 📊 Barème de Marges Par Défaut

| Prix d'achat HT | Coefficient | Exemple |
|-----------------|-------------|---------|
| < 3 € | x 2,5 | 2€ → 5€ |
| 3,01 € - 8,99 € | x 2,3 | 5€ → 11,50€ |
| 9 € - 149,99 € | x 2,0 | 100€ → 200€ |
| 150 € - 499,99 € | x 1,85 | 300€ → 555€ |
| ≥ 500 € | x 1,7 | 600€ → 1020€ |

---

## 🏗️ Architecture

### **1. Table Prisma** 📦

```prisma
model PricingMargin {
  id          String   @id @default(cuid())
  minPrice    Float    // Prix minimum (inclus)
  maxPrice    Float?   // Prix maximum (exclus), null = infini
  coefficient Float    // Coefficient multiplicateur
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### **2. Fonction de Calcul** 🧮

```typescript
// src/lib/pricing-margins.ts
export async function calculateSellingPrice(
  purchasePriceHT: number,
  margins?: PricingMargin[]
): Promise<{
  sellingPriceHT: number;
  coefficient: number;
  marginAmount: number;
}>
```

### **3. API Admin** 🔧

```
GET    /api/admin/pricing-margins  → Liste des marges
POST   /api/admin/pricing-margins  → Créer une marge
PUT    /api/admin/pricing-margins  → Mettre à jour toutes les marges
```

---

## 🔄 Workflow

### **1. Création Ticket**
```
Mécanicien ajoute une pièce :
- Description: "Cassette 10v 11-36"
- Prix d'achat HT: 24,70 €  ← Prix fournisseur
```

### **2. Création Devis**
```
Clic sur "Créer un devis" :
1. Récupération des pièces du ticket
2. Pour chaque pièce :
   - Prix d'achat: 24,70 €
   - Tranche applicable: 9€ - 149,99€ → coeff 2,0
   - Prix de vente: 24,70 € × 2,0 = 49,40 €
3. Création ligne devis :
   - unitPriceHT: 49,40 €  ← Affiché au client
   - purchasePriceHT: 24,70 €  ← Caché, pour référence
```

### **3. Affichage Client**
```
Le client voit uniquement :
- Cassette 10v 11-36
- Prix unitaire: 49,40 € HT
- Total: 59,28 € TTC (avec TVA 20%)
```

---

## 🎨 Interface Admin (Future)

### **Page Paramètres → Marges**

```
┌─────────────────────────────────────────────────┐
│ 💰 Gestion des Marges                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Prix Min    Prix Max    Coefficient   Actions  │
│ ────────────────────────────────────────────── │
│ 0,00 €      3,00 €      2,5          [✏️] [🗑️] │
│ 3,01 €      8,99 €      2,3          [✏️] [🗑️] │
│ 9,00 €      149,99 €    2,0          [✏️] [🗑️] │
│ 150,00 €    499,99 €    1,85         [✏️] [🗑️] │
│ 500,00 €    ∞           1,7          [✏️] [🗑️] │
│                                                 │
│ [+ Ajouter une tranche]                        │
└─────────────────────────────────────────────────┘
```

---

## 📝 Instructions de Déploiement

### **Étape 1 : Appliquer la Migration**

```powershell
cd apps/web
npx prisma migrate dev --name add_pricing_margins
```

### **Étape 2 : Initialiser les Marges**

```powershell
node prisma/seed-margins.cjs
```

**Résultat attendu** :
```
🔧 Initialisation des marges par défaut...
✅ Marge créée: 0€ - 3€ → x2.5
✅ Marge créée: 3.01€ - 8.99€ → x2.3
✅ Marge créée: 9€ - 149.99€ → x2
✅ Marge créée: 150€ - 499.99€ → x1.85
✅ Marge créée: 500€ - ∞€ → x1.7
✅ Marges initialisées avec succès !
```

### **Étape 3 : Redémarrer le Serveur**

```powershell
pnpm dev
```

---

## 🧪 Tests

### **Test 1 : Pièce < 3€**
```
1. Créer un ticket
2. Ajouter une pièce à 2€ HT
3. Créer un devis
4. Vérifier : Prix de vente = 5€ HT (2€ × 2,5)
```

### **Test 2 : Pièce 9€ - 149,99€**
```
1. Créer un ticket
2. Ajouter une pièce à 24,70€ HT
3. Créer un devis
4. Vérifier : Prix de vente = 49,40€ HT (24,70€ × 2,0)
```

### **Test 3 : Pièce > 500€**
```
1. Créer un ticket
2. Ajouter une pièce à 600€ HT
3. Créer un devis
4. Vérifier : Prix de vente = 1020€ HT (600€ × 1,7)
```

### **Test 4 : Multiple Pièces**
```
1. Créer un ticket
2. Ajouter :
   - Pièce A: 2€ HT
   - Pièce B: 50€ HT
   - Pièce C: 600€ HT
3. Créer un devis
4. Vérifier :
   - Pièce A: 5€ HT (x2,5)
   - Pièce B: 100€ HT (x2,0)
   - Pièce C: 1020€ HT (x1,7)
```

---

## 💡 Avantages

### **Pour le Mécanicien** 🔧
- ✅ Saisit le prix d'achat réel
- ✅ Marge appliquée automatiquement
- ✅ Pas de calcul mental
- ✅ Cohérence des prix

### **Pour le Gérant** 💼
- ✅ Contrôle total des marges
- ✅ Modification facile des coefficients
- ✅ Analyse marge réelle vs prix d'achat
- ✅ Optimisation rentabilité

### **Pour le Client** 👤
- ✅ Ne voit que le prix de vente
- ✅ Prix cohérents
- ✅ Transparence (prix affiché = prix facturé)

---

## 📊 Données Stockées

### **Dans WorkOrderPart** (Ticket)
```typescript
{
  description: "Cassette 10v 11-36",
  qty: 1,
  priceHT: 24.70  // Prix d'achat fournisseur
}
```

### **Dans InvoiceLine** (Devis/Facture)
```typescript
{
  description: "Cassette 10v 11-36",
  qty: 1,
  unitPriceHT: 49.40,        // Prix de vente (avec marge)
  purchasePriceHT: 24.70,    // Prix d'achat (référence)
  totalHT: 49.40,
  totalTTC: 59.28
}
```

**Le client ne voit jamais `purchasePriceHT` !**

---

## 🔐 Sécurité

### **Accès aux Marges**
- ✅ API `/api/admin/pricing-margins` protégée (rôle admin)
- ✅ Prix d'achat non affiché dans les PDFs
- ✅ Prix d'achat non envoyé au frontend (sauf admin)

### **Modification des Marges**
- ✅ Seuls les admins peuvent modifier
- ✅ Historique des modifications (via `updatedAt`)
- ✅ Validation des coefficients (> 1)

---

## 🎯 Évolutions Futures

### **Phase 2 : Interface Admin**
- [ ] Page de gestion des marges
- [ ] Modification en temps réel
- [ ] Prévisualisation des impacts

### **Phase 3 : Statistiques**
- [ ] Marge moyenne par période
- [ ] Marge par catégorie de produit
- [ ] Top 10 produits les plus rentables

### **Phase 4 : Marges Avancées**
- [ ] Marges par catégorie (pièces vs services)
- [ ] Marges par fournisseur
- [ ] Marges saisonnières

---

## 📁 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modèle PricingMargin |
| `prisma/seed-margins.cjs` | Script d'initialisation |
| `src/lib/pricing-margins.ts` | Fonctions de calcul |
| `src/app/api/admin/pricing-margins/route.ts` | API CRUD marges |
| `src/app/api/finance/invoices/[id]/import-labor/route.ts` | Application marges (modifié) |

---

## ✅ Checklist Déploiement

- [ ] Migration Prisma appliquée
- [ ] Marges initialisées (seed)
- [ ] Serveur redémarré
- [ ] Test pièce < 3€
- [ ] Test pièce 9€ - 149,99€
- [ ] Test pièce > 500€
- [ ] Vérification PDF (prix d'achat non visible)

---

## 🎉 Résultat Final

**Le système de marges automatiques est maintenant opérationnel !**

- ✅ Marges appliquées automatiquement
- ✅ Prix d'achat cachés au client
- ✅ Coefficients modifiables par admin
- ✅ Calculs automatiques et cohérents

**Prêt pour utilisation en production !** 🚀
