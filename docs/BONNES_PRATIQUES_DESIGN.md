# 🎨 Bonnes Pratiques Design - Atelier Vélo+

**Version**: 2.0  
**Date**: 15 octobre 2025  
**Basé sur**: Expérience harmonisation complète

---

## 📋 Checklist Modernisation

### ✅ Avant de Commencer

- [ ] Lire ce guide complet
- [ ] Identifier le type de page (Ticket/Devis/Facture/Avoir)
- [ ] Vérifier les composants réutilisables disponibles
- [ ] Sauvegarder l'ancienne version (`page-old.tsx`)

### ✅ Pendant le Développement

- [ ] Utiliser `usePageTheme` pour les couleurs
- [ ] Appliquer Grid 8/4 pour les pages détail
- [ ] Réutiliser les composants existants
- [ ] Éviter les variables non définies
- [ ] Tester au fur et à mesure

### ✅ Après le Développement

- [ ] Vérifier aucune erreur console
- [ ] Tester toutes les interactions
- [ ] Commit avec message descriptif
- [ ] Documenter les changements

---

## 🎨 Système de Couleurs

### Hook usePageTheme

**Toujours utiliser le hook** au lieu de couleurs en dur:

```typescript
import { usePageTheme } from "@/hooks/usePageTheme";
import { type PageTheme } from "@/lib/theme-colors";

// Détection automatique
const theme = usePageTheme();

// Ou override explicite
const theme = usePageTheme('ticket'); // 'quote', 'invoice', 'credit'
```

### Application des Couleurs

**Fond de page**:
```typescript
<Box sx={{ bgcolor: theme.background, minHeight: '100vh' }}>
```

**Header**:
```typescript
<Box sx={{ 
  bgcolor: theme.background, 
  borderBottom: 2, 
  borderColor: theme.border 
}}>
```

**Cards**:
```typescript
<Card sx={{ 
  border: 2, 
  borderColor: theme.border, 
  bgcolor: theme.background 
}}>
```

**Boutons primaires**:
```typescript
<Button sx={{
  bgcolor: theme.primary,
  '&:hover': {
    bgcolor: theme.primaryDark
  }
}}>
```

**Boutons outlined**:
```typescript
<Button variant="outlined" sx={{
  borderColor: theme.primary,
  color: theme.text,
  '&:hover': {
    borderColor: theme.primaryDark,
    bgcolor: theme.primaryLight
  }
}}>
```

**Chips**:
```typescript
<Chip sx={{
  bgcolor: theme.primary,
  color: 'white',
  fontWeight: 'bold'
}} />
```

---

## 🏗️ Architecture Pages

### Grid Layout 8/4

**Structure recommandée** pour pages détail:

```typescript
<Container maxWidth="xl" sx={{ py: 3 }}>
  <Grid container spacing={3}>
    {/* Colonne Gauche - 8/12 */}
    <Grid item xs={12} md={8}>
      {/* Contenu principal */}
      <CustomerCard />
      <BikeCard />
      {/* Autres contenus */}
    </Grid>

    {/* Colonne Droite - 4/12 */}
    <Grid item xs={12} md={4}>
      {/* Résumé et actions */}
      <FinancialSummaryCard />
      {/* Actions rapides */}
    </Grid>
  </Grid>
</Container>
```

### Header Moderne

**Template header** avec thème:

```typescript
<Box sx={{ 
  bgcolor: theme.background, 
  borderBottom: 2, 
  borderColor: theme.border, 
  px: 3, 
  py: 2 
}}>
  <Container maxWidth="xl">
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Box>
        <Typography variant="h4" fontWeight="bold" sx={{ color: theme.text }}>
          {icon} {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        {/* Boutons actions */}
      </Stack>
    </Stack>
  </Container>
</Box>
```

---

## 🧩 Composants Réutilisables

### CustomerCard

**Utilisation**:
```typescript
import CustomerCard from "@/app/components/CustomerCard";

<CustomerCard
  customer={{
    firstName: "Jean",
    lastName: "Dupont",
    email: "jean@example.com",
    phone: "0612345678"
  }}
  elevation={0}
/>
```

### BikeCard

**Utilisation**:
```typescript
import BikeCard from "@/app/components/BikeCard";

<BikeCard
  bike={{
    brand: "Giant",
    model: "TCR",
    serialNumber: "ABC123"
  }}
  elevation={0}
/>
```

### FinancialSummaryCard

**Utilisation**:
```typescript
import FinancialSummaryCard from "@/app/components/FinancialSummaryCard";

<FinancialSummaryCard
  totals={{
    totalHT: 100,
    totalTVA: 20,
    totalTTC: 120
  }}
  isAutoEntrepreneur={false}
  elevation={0}
  highlighted={true}
/>
```

---

## ⚠️ Erreurs à Éviter

### 1. Variables Non Définies

**❌ Mauvais**:
```typescript
<Chip color={documentColor} /> // documentColor n'existe pas
```

**✅ Bon**:
```typescript
<Chip sx={{ bgcolor: theme.primary, color: 'white' }} />
```

### 2. Couleurs en Dur

**❌ Mauvais**:
```typescript
<Box sx={{ bgcolor: '#64B5F6' }}>
```

**✅ Bon**:
```typescript
const theme = usePageTheme('ticket');
<Box sx={{ bgcolor: theme.primary }}>
```

### 3. Duplication de Code

**❌ Mauvais**:
```typescript
// Répéter le même code dans chaque page
<Card>
  <Typography>{customer.firstName}</Typography>
  <Typography>{customer.lastName}</Typography>
  {/* ... */}
</Card>
```

**✅ Bon**:
```typescript
<CustomerCard customer={customer} />
```

### 4. Imports Manquants

**❌ Mauvais**:
```typescript
// Utiliser un composant sans l'importer
<CustomerCard customer={customer} />
```

**✅ Bon**:
```typescript
import CustomerCard from "@/app/components/CustomerCard";

<CustomerCard customer={customer} />
```

### 5. Types Incorrects

**❌ Mauvais**:
```typescript
const theme = usePageTheme('invalid'); // Type incorrect
```

**✅ Bon**:
```typescript
const theme = usePageTheme('ticket'); // 'ticket' | 'quote' | 'invoice' | 'credit'
```

---

## 📝 Conventions de Code

### Nommage

**Composants**: PascalCase
```typescript
CustomerCard.tsx
BikeCard.tsx
FinancialSummaryCard.tsx
```

**Hooks**: camelCase avec préfixe `use`
```typescript
usePageTheme.ts
useCustomer.ts
```

**Fichiers**: kebab-case
```typescript
theme-colors.ts
api-client.ts
```

### Structure Fichier

```typescript
"use client"; // Si nécessaire

// 1. Imports React/Next
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Imports MUI
import { Box, Button, Card } from "@mui/material";

// 3. Imports composants locaux
import CustomerCard from "@/app/components/CustomerCard";

// 4. Imports hooks/utils
import { usePageTheme } from "@/hooks/usePageTheme";
import { type PageTheme } from "@/lib/theme-colors";

// 5. Imports API
import { getCustomer } from "@/lib/api";

// 6. Config
export const dynamic = 'force-dynamic';

// 7. Composant
export default function MyPage() {
  // États
  const [data, setData] = useState(null);
  
  // Hooks
  const theme = usePageTheme();
  const router = useRouter();
  
  // Fonctions
  async function loadData() {
    // ...
  }
  
  // Effects
  useEffect(() => {
    loadData();
  }, []);
  
  // Render
  return (
    // JSX
  );
}
```

---

## 🧪 Tests

### Checklist Tests

**Avant commit**:
- [ ] Page charge sans erreur
- [ ] Aucune erreur console
- [ ] Couleurs thématiques appliquées
- [ ] Responsive (mobile/desktop)
- [ ] Interactions fonctionnent
- [ ] Données s'affichent correctement

**Tests manuels**:
1. Actualiser la page (F5)
2. Ouvrir console (F12)
3. Vérifier aucune erreur
4. Tester toutes les actions
5. Vérifier responsive (DevTools)

---

## 📦 Commits

### Format Message

```
type: Description courte

- Détail 1
- Détail 2
- Détail 3

Statistiques:
- Réduction: X%
- Composants: Y
```

### Types

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction bug
- `refactor:` Refactoring
- `style:` Changements style/UI
- `docs:` Documentation
- `test:` Tests
- `chore:` Maintenance

### Exemple

```
feat: Moderniser page Devis

- Grid 8/4 moderne
- Couleurs violettes thématiques
- Composants réutilisables
- Réduction code -64%

Composants:
- CustomerCard
- BikeCard
- FinancialSummaryCard
```

---

## 🎯 Résumé

### Règles d'Or

1. **Toujours** utiliser `usePageTheme`
2. **Toujours** réutiliser les composants existants
3. **Toujours** tester avant de commit
4. **Jamais** de couleurs en dur
5. **Jamais** de variables non définies
6. **Jamais** de duplication de code

### Workflow Idéal

1. Analyser la page existante
2. Identifier les composants réutilisables
3. Créer `page-new.tsx`
4. Appliquer le thème
5. Intégrer les composants
6. Tester
7. Renommer `page.tsx` → `page-old.tsx`
8. Renommer `page-new.tsx` → `page.tsx`
9. Commit
10. Documenter

---

**Version**: 2.0  
**Dernière mise à jour**: 15 octobre 2025  
**Auteur**: Basé sur l'expérience d'harmonisation complète

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
