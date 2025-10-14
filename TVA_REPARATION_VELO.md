# TVA Réparation Vélo - Taux Applicables

**Date**: 14 octobre 2025  
**Réglementation**: France

---

## 📊 Taux de TVA Applicables

### ⚠️ Auto-Entrepreneur: 0%

**Si vous êtes déclaré en auto-entrepreneur** (franchise en base de TVA)

**Taux applicable**: **0%** (pas de TVA)

**Base légale**:
- Article 293 B du CGI
- Franchise en base de TVA pour les auto-entrepreneurs
- Mention obligatoire sur factures: "TVA non applicable, art. 293 B du CGI"

**Important**: L'application détecte automatiquement votre statut dans "Mon compte" → "Auto-entrepreneur"

---

### ✅ Main d'Œuvre: 10% (si non auto-entrepreneur)

**Réparation de vélos** = Prestation de service de réparation

**Taux applicable**: **10%** (TVA réduite)

**Base légale**:
- Article 279-0 bis du CGI (Code Général des Impôts)
- Services de réparation et d'entretien de cycles

**Exemples**:
- Réparation de crevaison
- Réglage des freins
- Changement de câbles
- Révision complète
- Entretien périodique

---

### ✅ Pièces Détachées: 20% (si non auto-entrepreneur)

**Vente de pièces** = Vente de biens

**Taux applicable**: **20%** (TVA normale)

**Base légale**:
- Taux normal de TVA pour la vente de biens

**Exemples**:
- Chambre à air
- Pneus
- Câbles
- Patins de frein
- Chaîne
- Cassette
- Etc.

---

## 💡 Cas Particuliers

### Réparation + Fourniture de Pièces

Lorsqu'une réparation inclut la fourniture de pièces, **deux taux s'appliquent**:

**Exemple**: Réparation de crevaison
- **Main d'œuvre** (30 min à 60 €/h) = 30 € HT → TVA 10% = **3 € TVA**
- **Chambre à air** = 12 € HT → TVA 20% = **2,40 € TVA**
- **Total HT**: 42 €
- **Total TVA**: 5,40 €
- **Total TTC**: 47,40 €

---

## 🔧 Implémentation dans l'Application

### Routes API Modifiées

1. **`/api/pos/workorders/[id]/quote`** - Génération de devis
   - Main d'œuvre: TVA 10%
   - Pièces: TVA 20%

2. **`/api/pos/workorders/[id]/sale`** - Création de facture
   - Main d'œuvre: TVA 10%
   - Pièces: TVA 20%

### Code

```typescript
// TVA différenciée
const laborTvaRate = 0.1;  // 10% pour main d'œuvre
const partsTvaRate = 0.2;   // 20% pour pièces

const laborTVA = laborCostHT * laborTvaRate;
const partsTVA = partsCostHT * partsTvaRate;

const totalTVA = laborTVA + partsTVA;
```

---

## 📋 Affichage sur les Documents

### Devis / Facture

```
┌─────────────────────────────────────────────────┐
│ DEVIS / FACTURE                                  │
├─────────────────────────────────────────────────┤
│ Main d'œuvre - 30 minutes                       │
│ 1 x 30,00 € HT (TVA 10%)          30,00 € HT   │
│                                     3,00 € TVA   │
│                                    33,00 € TTC   │
├─────────────────────────────────────────────────┤
│ Chambre à air 700x25c                           │
│ 1 x 12,00 € HT (TVA 20%)          12,00 € HT   │
│                                     2,40 € TVA   │
│                                    14,40 € TTC   │
├─────────────────────────────────────────────────┤
│ TOTAL HT                           42,00 €      │
│ TVA 10% (MO)                        3,00 €      │
│ TVA 20% (Pièces)                    2,40 €      │
│ TOTAL TVA                           5,40 €      │
│ TOTAL TTC                          47,40 €      │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Points d'Attention

### 1. Distinction Main d'Œuvre / Pièces

**Important**: Bien distinguer sur la facture:
- Les prestations de service (10%)
- Les ventes de pièces (20%)

### 2. Facture Détaillée

Chaque ligne doit indiquer:
- Description
- Quantité
- Prix unitaire HT
- **Taux de TVA applicable**
- Total HT
- Total TTC

### 3. Récapitulatif TVA

En bas de facture, afficher:
- Total HT
- **TVA 10%** (montant)
- **TVA 20%** (montant)
- Total TVA
- Total TTC

---

## 📚 Références Légales

### Code Général des Impôts

**Article 279-0 bis**:
> "La taxe sur la valeur ajoutée est perçue au taux réduit de 10 % en ce qui concerne [...] les prestations de services de réparation et d'entretien portant sur des cycles."

### BOFiP (Bulletin Officiel des Finances Publiques)

**BOI-TVA-LIQ-30-20-90**:
Précisions sur les taux réduits de TVA applicables aux réparations.

---

## 🧪 Tests à Effectuer

### Test 1: Main d'Œuvre Seule
```
Estimation: 60 minutes à 60 €/h
Résultat attendu:
- HT: 60,00 €
- TVA 10%: 6,00 €
- TTC: 66,00 €
```

### Test 2: Pièces Seules
```
Chambre à air: 12,00 € HT
Résultat attendu:
- HT: 12,00 €
- TVA 20%: 2,40 €
- TTC: 14,40 €
```

### Test 3: Main d'Œuvre + Pièces
```
MO: 30 minutes à 60 €/h = 30,00 € HT
Pièces: 12,00 € HT
Résultat attendu:
- Total HT: 42,00 €
- TVA 10% (MO): 3,00 €
- TVA 20% (Pièces): 2,40 €
- Total TVA: 5,40 €
- Total TTC: 47,40 €
```

---

## 🔄 Migration des Données Existantes

Si vous avez des factures existantes avec TVA 20% sur la main d'œuvre:

### Option 1: Laisser tel quel
Les anciennes factures restent inchangées (déjà émises).

### Option 2: Corriger (si non émises)
```sql
-- Mettre à jour les lignes de type "labor" à 10%
UPDATE InvoiceLine
SET vatRate = 10
WHERE type = 'labor' AND vatRate = 20;
```

**Recommandation**: Option 1 (laisser les anciennes factures telles quelles).

---

## ✅ Résultat

**Les devis et factures appliquent maintenant les bons taux de TVA**:
- ✅ Main d'œuvre: 10%
- ✅ Pièces: 20%
- ✅ Calcul automatique
- ✅ Affichage détaillé

**Testez maintenant en créant un nouveau devis !** 🎉

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
