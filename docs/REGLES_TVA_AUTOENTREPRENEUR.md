# 📋 Règles TVA Auto-Entrepreneur - Atelier Vélo+

**Date**: 15 octobre 2025  
**Règle Générale**: Auto-entrepreneur = TVA 0% sur TOUTES les opérations de vente

---

## 🎯 Règle Principale

### Auto-Entrepreneur

**Statut**: Défini dans `GlobalSetting` avec `key: "autoEntrepreneur"`

**Règle TVA**:
```
SI isAutoEntrepreneur = true
ALORS vatRate = 0%
SINON vatRate = 20% (ou taux spécifique)
```

---

## ✅ Opérations Concernées (TVA 0% si AE)

### 1. Création de Devis
- **Fichier**: `apps/web/src/app/api/finance/quotes/route.ts`
- **Règle**: Copie des lignes du ticket avec TVA forcée à 0% si AE
- **Code**:
```typescript
vatRate: isAE ? 0 : (line.vatRate || 20)
```

### 2. Ajout Lignes Manuelles Devis
- **Fichier**: `apps/web/src/app/finance/components/CreateQuoteDialog.tsx`
- **Règle**: Lignes ajoutées manuellement avec TVA 0% si AE
- **Code**:
```typescript
vatRate: isAutoEntrepreneur ? 0 : (line.vatRate || 20)
```

### 3. Création de Facture
- **Fichier**: `apps/web/src/app/api/finance/invoices/route.ts`
- **Règle**: Facture créée avec `vatRate: 0` si AE
- **Code**:
```typescript
vatRate: pricingMode === "AE_TTC" ? 0 : 20
```

### 4. Ajout Lignes Manuelles Facture
- **Fichier**: `apps/web/src/app/finance/components/CreateInvoiceDialog.tsx`
- **Règle**: Lignes ajoutées manuellement avec TVA 0% si AE
- **Code**:
```typescript
vatRate: isAutoEntrepreneur ? 0 : (line.vatRate || 20)
```

### 5. Import Main d'Œuvre
- **Fichier**: `apps/web/src/app/api/finance/invoices/[id]/import-labor/route.ts`
- **Règle**: Import pièces et main d'œuvre avec TVA 0% si AE
- **Code**:
```typescript
const vatRate = isAE ? 0 : (invoice.vatRate || 20);
```

### 6. Ajout Ligne à Facture/Devis
- **Fichier**: `apps/web/src/app/api/finance/invoices/[id]/lines/route.ts`
- **Règle**: Nouvelle ligne avec TVA héritée de la facture (0% si AE)
- **Code**:
```typescript
const vatRate = body.vatRate != null ? Number(body.vatRate) : inv.vatRate;
```

### 7. Modification Ligne
- **Fichier**: `apps/web/src/app/api/finance/invoices/[id]/lines/[lineId]/route.ts`
- **Règle**: TVA modifiée respecte le statut AE
- **Code**:
```typescript
const vatRate = mergedData.vatRate != null ? Number(mergedData.vatRate) : (invoice.vatRate || 0);
```

### 8. Création Avoir
- **Fichier**: `apps/web/src/app/api/finance/invoices/[id]/credit/route.ts`
- **Règle**: Avoir hérite de la TVA de la facture source
- **Code**:
```typescript
vatRate: src.vatRate
```

---

## ❌ Opérations NON Concernées (TVA normale)

### 1. Achats Fournisseurs
- **Règle**: La TVA des achats est TOUJOURS celle du fournisseur
- **Raison**: L'auto-entrepreneur ne récupère pas la TVA
- **Code**: Utiliser la TVA réelle du fournisseur (généralement 20%)

### 2. Prix d'Achat Pièces
- **Champ**: `purchasePriceHT` dans `InvoiceLine`
- **Règle**: Prix d'achat avec TVA fournisseur (pas TVA vente)
- **Raison**: Traçabilité des coûts réels

---

## 🔧 Implémentation Technique

### Vérification Statut Auto-Entrepreneur

```typescript
// Méthode 1: Depuis GlobalSetting (backend)
const aeSetting = await prisma.globalSetting.findUnique({
  where: { key: "autoEntrepreneur" },
});
const isAE = aeSetting?.value === "true";

// Méthode 2: Depuis API settings (frontend)
const response = await fetch("/api/account/settings", {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
const data = await response.json();
const isAutoEntrepreneur = data.isAutoEntrepreneur === true;
```

### Application TVA

```typescript
// Pour une ligne
const vatRate = isAutoEntrepreneur ? 0 : (line.vatRate || 20);

// Pour une facture/devis
const vatRate = pricingMode === "AE_TTC" ? 0 : 20;
```

### Calculs avec TVA

```typescript
// Mode Auto-Entrepreneur (AE_TTC)
if (isAE) {
  const unitPriceTTC = 100;  // Prix TTC saisi
  const vatRate = 0;         // Toujours 0%
  const unitPriceHT = unitPriceTTC;  // Pas de TVA
  const totalTTC = unitPriceTTC * qty;
  const totalHT = totalTTC;  // Identique car TVA = 0
}

// Mode Normal (HT_TVA)
else {
  const unitPriceHT = 100;   // Prix HT saisi
  const vatRate = 20;        // TVA normale
  const unitPriceTTC = unitPriceHT * 1.20;  // +20%
  const totalHT = unitPriceHT * qty;
  const totalTTC = unitPriceTTC * qty;
}
```

---

## 📝 Checklist Développement

Lors de l'ajout de nouvelles fonctionnalités financières:

- [ ] Vérifier le statut auto-entrepreneur
- [ ] Appliquer TVA 0% si AE pour les ventes
- [ ] Conserver TVA réelle pour les achats
- [ ] Tester avec AE activé ET désactivé
- [ ] Vérifier les calculs HT/TTC
- [ ] Documenter les exceptions éventuelles

---

## 🧪 Tests

### Scénario 1: Auto-Entrepreneur Activé

1. Activer auto-entrepreneur dans settings
2. Créer un ticket avec prestations
3. Créer un devis
4. **Vérifier**: Toutes les lignes ont `vatRate: 0`
5. **Vérifier**: `totalHT === totalTTC`

### Scénario 2: Auto-Entrepreneur Désactivé

1. Désactiver auto-entrepreneur dans settings
2. Créer un ticket avec prestations
3. Créer un devis
4. **Vérifier**: Toutes les lignes ont `vatRate: 20`
5. **Vérifier**: `totalTTC === totalHT * 1.20`

### Scénario 3: Ajout Manuel Ligne

1. Avec AE activé
2. Créer devis et ajouter ligne manuelle
3. **Vérifier**: Ligne ajoutée a `vatRate: 0`
4. Désactiver AE
5. Créer devis et ajouter ligne manuelle
6. **Vérifier**: Ligne ajoutée a `vatRate: 20`

---

## ⚠️ Points d'Attention

### 1. Mention Légale

Sur les documents (PDF), si auto-entrepreneur:
- Ajouter mention: **"TVA non applicable, art. 293 B du CGI"**
- Ne pas afficher de ligne TVA
- Afficher uniquement le total TTC

### 2. Changement de Statut

Si l'utilisateur change de statut AE:
- Les documents existants conservent leur TVA d'origine
- Seuls les nouveaux documents utilisent le nouveau statut
- **Ne pas** recalculer automatiquement les anciens documents

### 3. Cas Particuliers

**Taux réduits** (10%, 5.5%):
- Même règle: 0% si AE
- Sinon: utiliser le taux spécifique

**Exonération de TVA**:
- Certains produits peuvent être exonérés
- Vérifier la réglementation spécifique

---

## 📚 Références

- Code Général des Impôts: Article 293 B
- Régime micro-entrepreneur
- TVA non applicable

---

**Version**: 1.0  
**Dernière mise à jour**: 15 octobre 2025  
**Auteur**: Règles TVA Auto-Entrepreneur

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
