# 🔧 Progression Remplacement console.* → logger.*

**Date**: 25 novembre 2024  
**Objectif**: Remplacer 580 occurrences de `console.*` dans 177 fichiers

## 📊 État Global

- **Total fichiers**: 177
- **Total occurrences**: 580
- **Fichiers traités**: 31 ✅
- **Occurrences éliminées**: ~184
- **Progression**: 18% des fichiers (32% des occurrences)

## ✅ Lot 1 - Fichiers src/lib (10 fichiers) - COMPLÉTÉ

| Fichier | Occurrences | Statut |
|---------|-------------|--------|
| `src/lib/api-helpers.ts` | 5 | ✅ |
| `src/lib/license-manager.ts` | 26 | ✅ |
| `src/lib/email-with-db-config.ts` | 12 | ✅ |
| `src/lib/db.ts` | 9 | ✅ |
| `src/lib/license-guards.ts` | 6 | ✅ |
| `src/lib/mailer.ts` | 6 | ✅ |
| `src/lib/prisma.ts` | 6 | ✅ |
| `src/lib/crypto.ts` | 5 | ✅ |
| `src/lib/email-logger.ts` | 5 | ✅ |
| `src/lib/jwt.ts` | 4 | ✅ |

**Total Lot 1**: 84 occurrences éliminées

## ✅ Lot 2 - Fichiers src/app/api (10 fichiers) - COMPLÉTÉ

| Fichier | Occurrences | Statut |
|---------|-------------|--------|
| `src/app/api/finance/invoices/[id]/send-email/route.ts` | 15 | ✅ |
| `src/app/api/finance/invoices/[id]/pdf/route.ts` | 14 | ✅ |
| `src/app/api/catalog/import-catalogsnap/route.ts` | 12 | ✅ |
| `src/app/api/finance/invoices/route.ts` | 10 | ✅ |
| `src/app/api/admin/test-email/route.ts` | 9 | ✅ |
| `src/app/api/catalog/scan-bulk/route.ts` | 9 | ✅ |
| `src/app/api/news/bike-feeds/route.ts` | 9 | ✅ |
| `src/app/api/pos/workorders/[id]/quote-pdf/route.ts` | 7 | ✅ |
| `src/app/api/admin/system-settings/route.ts` | 6 | ✅ |
| `src/app/api/calendar/bookings/route.ts` | 6 | ✅ |

**Total Lot 2**: 97 occurrences éliminées

## ✅ Lot 3 - Fichiers src/app/api (suite - 10 fichiers) - COMPLÉTÉ

| Fichier | Occurrences | Statut |
|---------|-------------|--------|
| `src/app/api/workorders/[id]/lines/route.ts` | 5 | ✅ |
| `src/app/api/catalog/scan/route.ts` | 5 | ✅ |
| `src/app/api/communications/send/route.ts` | 4 | ✅ |
| `src/app/api/communications/route.ts` | 4 | ✅ |
| `src/app/api/finance/invoices/[id]/route.ts` | 2 | ✅ |
| `src/app/api/admin/test-email-db/route.ts` | 4 | ✅ |
| `src/app/api/catalog/barcode/route.ts` | 4 | ✅ |
| `src/app/api/admin/pricing-margins/route.ts` | 3 | ✅ |
| `src/app/api/bikes/[id]/route.ts` | 3 | ✅ |
| `src/app/api/catalog/migrate-suppliers/route.ts` | 3 | ✅ |

**Total Lot 3**: ~37 occurrences éliminées (estimation)

## ✅ Lot 4 - Fichier src/app/api (1 fichier restant) - COMPLÉTÉ

| Fichier | Occurrences | Statut |
|---------|-------------|--------|
| `src/app/api/finance/invoices/[id]/pdf/route.ts` | 3 | ✅ |

**Total Lot 4**: 3 occurrences éliminées

**Note**: Les autres fichiers du Lot 4 avaient déjà été traités dans les lots précédents.

## 📋 Prochains Lots

### Lot 5 - Fichiers src/app/api (suite)
- `src/app/api/suppliers/search/route.ts` (3)
- `src/app/api/uploads/[...path]/route.ts` (3)
- `src/app/api/workorders/[id]/appointment/route.ts` (3)
- `src/app/api/workshop/workorders/route.ts` (3)
- ... (à compléter)

### Lot 6 - Fichiers src/hooks
- `src/hooks/useCachedData.ts` (6)
- `src/hooks/useCatalogMutations.ts` (6)
- `src/hooks/useCustomersMutations.ts` (6)
- ... (à compléter)

### Lot 5 - Fichiers src/app (pages et composants)
- `src/app/auth/AuthContext.tsx` (13)
- `src/app/account/page.tsx` (11)
- `src/app/components/OnboardingWizard.tsx` (10)
- ... (à compléter)

## 🔍 Méthode

1. **Ajout import logger**: `import { logger } from '@/lib/logger';`
2. **Remplacements**:
   - `console.log(` → `logger.info(`
   - `console.error(` → `logger.error(`
   - `console.warn(` → `logger.warn(`
   - `console.info(` → `logger.info(`
3. **Vérification**: Pas d'erreurs TypeScript/ESLint
4. **Validation**: Grep pour confirmer aucun `console.*` restant

## ⚠️ Notes

- Approche progressive pour éviter les erreurs en masse
- Vérification lint après chaque fichier
- Tests manuels sur fichiers critiques
- Commit par lots de 10-15 fichiers

## 🎯 Prochaines Étapes

1. ✅ Terminer Lot 1 (10 fichiers src/lib)
2. ✅ Terminer Lot 2 (10 fichiers src/app/api)
3. ✅ Terminer Lot 3 (10 fichiers src/app/api)
4. ✅ Terminer Lot 4 (1 fichier restant)
5. ⏳ Traiter Lot 5 (10 fichiers src/app/api)
6. ⏳ Traiter Lot 6 (10 fichiers src/hooks)
7. ⏳ Traiter Lot 7 (10 fichiers src/app)
8. ⏳ Continuer jusqu'à 100% (177 fichiers)

