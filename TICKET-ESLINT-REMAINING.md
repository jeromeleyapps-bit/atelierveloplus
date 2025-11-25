# 🎫 Ticket : Correction des 268 Erreurs ESLint Restantes

**Date** : 2025-11-21  
**Priorité** : Moyenne  
**Statut** : À faire

## 📊 Contexte

Après une correction massive des erreurs ESLint (408 → 268 erreurs, -34%), il reste **268 erreurs** à corriger :

- ✅ **Corrigé** : 51 variables non utilisées, 115 require(), 204 any, 1 React Hook
- ⚠️ **Restant** : 149 entités JSX, ~100 any réapparus, ~10 autres

## 🔍 Détail des Erreurs Restantes

### 1. Entités Non Échappées dans JSX (149 erreurs)
**Règle** : `react/no-unescaped-entities`  
**Impact** : Cosmétique (n'empêche pas le build)

**Exemples** :
```tsx
// ❌ Erreur
<Typography>L'application est prête</Typography>

// ✅ Correct
<Typography>L&apos;application est prête</Typography>
// ou
<Typography>{"L'application est prête"}</Typography>
```

**Fichiers concernés** (31 fichiers) :
- `src/app/account/components/SimpleBookingSection.tsx`
- `src/app/admin/guide/page.tsx` (28 erreurs)
- `src/app/admin/settings/SmtpConfigCard.tsx` (32 erreurs)
- `src/app/admin/online-booking/page.tsx`
- etc.

### 2. Types `any` Réapparus (~100 erreurs)
**Règle** : `@typescript-eslint/no-explicit-any`  
**Impact** : Moyen (perte de typage)

**Exemples** :
```typescript
// ❌ Erreur
const handleClick = (e: any) => { ... }

// ✅ Correct
const handleClick = (e: React.MouseEvent) => { ... }
// ou
const handleClick = (e: unknown) => { ... }
```

**Fichiers concernés** :
- `src/app/account/components/SimpleBookingSection.tsx` (5 erreurs)
- `src/app/admin/catalog/page.tsx` (10 erreurs)
- `src/app/admin/settings/page-complete.tsx` (17 erreurs)
- `src/app/finance/invoices/[id]/page.tsx` (12 erreurs)
- etc.

### 3. Variables Non Utilisées (~10 erreurs)
**Règle** : `@typescript-eslint/no-unused-vars`  
**Impact** : Faible

**Exemples** :
- `src/app/admin/page.tsx` : `router`, `handleStravaConnect`
- `src/app/admin/settings/page.tsx` : `handleSaveEmailSettings`
- `src/app/bikes/history/page.tsx` : `BikeHistory`, `BikeDetails`, `Customer`

### 4. Erreurs de Parsing (4 erreurs)
**Impact** : Critique (empêche la compilation)

**Fichiers** :
- `src/app/customers/[id]/bikes/page.tsx:174` - ',' expected
- `src/app/suppliers/page.tsx:64` - Unterminated string literal
- `src/components/CatalogGrid.tsx:49` - Declaration expected
- `src/components/SupplierCatalogGrid.tsx:50` - Declaration expected

### 5. Autres (10 warnings)
- React Hooks dependencies manquantes (non bloquant)
- `import/no-anonymous-default-export` (1 warning)

## 🎯 Plan de Correction

### Phase 1 : Erreurs Critiques (Priorité Haute)
1. ✅ Corriger les 4 erreurs de parsing
2. ✅ Corriger les variables non utilisées restantes

### Phase 2 : Types `any` (Priorité Moyenne)
1. Remplacer les `any` dans les event handlers par les types React appropriés
2. Remplacer les `any` dans les API calls par `unknown` ou types spécifiques

### Phase 3 : Entités JSX (Priorité Basse)
1. Utiliser un script pour remplacer automatiquement les apostrophes
2. Vérifier manuellement les cas complexes

### Phase 4 : Warnings (Optionnel)
1. Ajouter les dépendances manquantes aux React Hooks
2. Corriger l'export par défaut anonyme

## 📝 Notes

- Les erreurs `react/no-unescaped-entities` sont **cosmétiques** et n'empêchent pas le build
- Les erreurs de parsing sont **critiques** et doivent être corrigées en priorité
- L'application démarre correctement malgré ces erreurs

## 🔗 Références

- [ESLint React Rules](https://github.com/jsx-eslint/eslint-plugin-react/tree/master/docs/rules)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)

