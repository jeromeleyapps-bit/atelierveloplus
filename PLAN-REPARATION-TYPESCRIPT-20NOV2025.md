# 🔧 PLAN DE RÉPARATION TYPESCRIPT - 20 NOV 2025

**Date**: 20 novembre 2025  
**Problème**: Erreurs TypeScript introduites lors de corrections lint automatiques pour build macOS  
**Objectif**: Zéro erreur TypeScript

---

## 📊 ÉTAT ACTUEL

### Statistiques d'erreurs (npm run typecheck)
- **Total erreurs**: 1060 lignes dans typecheck-errors.log
- **Fichiers affectés**: ~30+ fichiers
- **Types d'erreurs**:
  1. `Property 'X' does not exist on type 'unknown'` (90%)
  2. `Spread types may only be created from object types` (5%)
  3. `Type 'X' is not assignable to type 'Y'` (5%)

### Cause identifiée
Les corrections lint automatiques (probablement pour `@typescript-eslint/no-explicit-any`) ont remplacé des types par `unknown`, cassant l'inférence de types dans toute l'application.

---

## 🎯 STRATÉGIE DE RÉPARATION

### Phase 1: Analyse et Classification (15 min)
1. ✅ Identifier tous les fichiers avec erreurs
2. ✅ Classer les erreurs par type
3. ✅ Prioriser par criticité (API routes > Pages > Components)

### Phase 2: Corrections API Routes (45 min)
- Fichiers critiques pour le fonctionnement
- Pattern: Typer explicitement les responses/requests

### Phase 3: Corrections Pages (60 min)
- Fichiers UI avec hooks/queries
- Pattern: Typer les retours de `useQuery`, `useState`, etc.

### Phase 4: Corrections Components (30 min)
- Composants réutilisables
- Pattern: Définir des interfaces props

### Phase 5: Vérification et Tests (30 min)
- `npm run typecheck` → 0 erreur
- `npm run lint` → 0 warning
- Build test

---

## 📋 FICHIERS AFFECTÉS (PAR PRIORITÉ)

### 🔴 CRITIQUE - API Routes (14 fichiers)
1. `src/app/api/account/settings/route.ts` (18 erreurs)
2. `src/app/api/account/upload-logo/route.ts` (2 erreurs)
3. `src/app/api/admin/backup/route.ts` (85 erreurs)
4. `src/app/api/admin/jobs/daily/route.ts` (1 erreur)
5. `src/app/api/admin/license/activate/route.ts` (4 erreurs)
6. `src/app/api/admin/license/start-trial/route.ts` (3 erreurs)
7. `src/app/api/admin/pricing-margins/route.ts` (5 erreurs)
8. `src/app/api/admin/service-rates/route.ts` (1 erreur)
9. `src/app/api/bikes/[bikeId]/route.ts`
10. `src/app/api/bikes/[bikeId]/history/route.ts`
11. `src/app/api/calendar/availability/route.ts`
12. `src/app/api/catalog/items/[id]/route.ts`
13. `src/app/api/customers/[id]/route.ts`
14. `src/app/api/finance/invoices/[id]/route.ts`

### 🟠 IMPORTANT - Pages Admin (5 fichiers)
1. `src/app/admin/calendar/page.tsx` (55 erreurs)
2. `src/app/admin/license/page.tsx` (31 erreurs)
3. `src/app/admin/service-rates/page.tsx` (1 erreur)
4. `src/app/admin/settings/page.tsx` (3 erreurs)
5. `src/app/account/page.tsx`

### 🟡 MOYEN - Autres Pages (8 fichiers)
1. `src/app/catalog/page.tsx`
2. `src/app/customers/[id]/page.tsx`
3. `src/app/finance/invoices/[id]/page.tsx`
4. `src/app/pos/page.tsx`
5. `src/app/tickets/[id]/page.tsx`
6. `src/app/workshop/workorders/[id]/page.tsx`
7. `src/app/marketing/campaigns/page.tsx`
8. `src/app/stats/page.tsx`

### 🟢 FAIBLE - Components et Hooks (5+ fichiers)
1. `src/components/LineItemSelector.tsx`
2. `src/components/LineItemsTable.tsx`
3. `src/hooks/useBikesMutations.ts`
4. `src/hooks/useCustomerData.ts`
5. Plus...

---

## 🔧 PATTERNS DE CORRECTION

### Pattern 1: API Route avec body parsing
```typescript
// ❌ AVANT (type unknown)
const body = await req.json();
const name = body.name; // Error: Property 'name' does not exist on type 'unknown'

// ✅ APRÈS (typer explicitement)
interface BodyType {
  name: string;
  email: string;
}
const body = await req.json() as BodyType;
const name = body.name; // OK
```

### Pattern 2: useQuery avec type unknown
```typescript
// ❌ AVANT
const { data } = useQuery({ queryKey: ['license'], queryFn: fetchLicense });
const tier = data.tier; // Error: Property 'tier' does not exist on type 'unknown'

// ✅ APRÈS
interface LicenseData {
  tier: string;
  status: string;
  expiresAt: Date;
}
const { data } = useQuery<LicenseData>({ queryKey: ['license'], queryFn: fetchLicense });
const tier = data?.tier; // OK
```

### Pattern 3: useState avec type unknown
```typescript
// ❌ AVANT
const [calendarRef, setCalendarRef] = useState(null);
calendarRef.getApi(); // Error: Property 'getApi' does not exist on type 'unknown'

// ✅ APRÈS
import FullCalendar from '@fullcalendar/react';
const [calendarRef, setCalendarRef] = useState<FullCalendar | null>(null);
calendarRef?.getApi(); // OK
```

### Pattern 4: Event handlers
```typescript
// ❌ AVANT
const handleClick = (info) => {
  const id = info.event.id; // Error: Property 'event' does not exist on type 'unknown'
};

// ✅ APRÈS
import { EventClickArg } from '@fullcalendar/core';
const handleClick = (info: EventClickArg) => {
  const id = info.event.id; // OK
};
```

### Pattern 5: Spread object types
```typescript
// ❌ AVANT
const merged = { ...data, ref: calendarRef }; // Error: Spread types may only be created from object types

// ✅ APRÈS
const merged = { ...(data as Record<string, unknown>), ref: calendarRef }; // OK
// OU mieux: typer data correctement
```

---

## ⚠️ RÈGLES DE SÉCURITÉ

### 1. Ne PAS casser les fonctionnalités récentes
- ✅ Système de licences RSA (implémenté récemment)
- ✅ Corrections de bugs factures/devis (implémentées récemment)
- ✅ Système auto-entrepreneur (implémenté récemment)
- ✅ Kilométrage vélos électriques (implémenté récemment)

### 2. Comparer avec la sauvegarde du 19/11/25
- Chemin: `C:\Users\j_ley\App Atlier Sauvegarde #2-19-11-25`
- Utiliser pour référence des types corrects
- **ATTENTION**: Ne PAS restaurer aveuglément (manque corrections post-19/11)

### 3. Vérifier l'historique du chat
- Toutes les corrections récentes sont documentées dans le chat
- Se référer aux commits locaux et GitHub

### 4. Tests progressifs
- Vérifier `npm run typecheck` après chaque lot de corrections
- Ne pas introduire de nouvelles erreurs

---

## 📝 ORDRE D'EXÉCUTION

### Étape 1: Corrections Critiques (API Routes)
1. `src/app/api/account/settings/route.ts`
2. `src/app/api/admin/license/activate/route.ts`
3. `src/app/api/admin/license/start-trial/route.ts`
4. `src/app/api/admin/pricing-margins/route.ts`

### Étape 2: Pages Admin Principales
1. `src/app/admin/license/page.tsx`
2. `src/app/admin/calendar/page.tsx`
3. `src/app/admin/settings/page.tsx`

### Étape 3: Autres Fichiers
- Continuer par ordre de priorité

---

## 🧪 VÉRIFICATION FINALE

### Checklist
- [ ] `npm run typecheck` → 0 erreur
- [ ] `npm run lint` → 0 warning (ou acceptable)
- [ ] `npm run build` → Succès
- [ ] Test fonctionnel en dev
- [ ] Vérifier fonctionnalités critiques:
  - [ ] Système de licences
  - [ ] Factures/Devis
  - [ ] Auto-entrepreneur
  - [ ] Ajout vélos

---

## 📊 ESTIMATION TEMPS

| Phase | Durée Estimée |
|-------|---------------|
| Analyse | 15 min |
| API Routes (14 fichiers) | 45 min |
| Pages Admin (5 fichiers) | 60 min |
| Autres Pages (8 fichiers) | 30 min |
| Components (5+ fichiers) | 30 min |
| Vérification | 30 min |
| **TOTAL** | **3h30** |

---

## 📌 NOTES

- Les erreurs sont principalement cosmétiques (typage), pas logiques
- Le code fonctionne probablement en runtime
- Le problème est la compilation TypeScript
- Aucune fonctionnalité ne devrait être cassée après correction

---

**Document créé par**: Auto (AI Assistant)  
**Date**: 20 novembre 2025  
**Version**: 1.0.0

