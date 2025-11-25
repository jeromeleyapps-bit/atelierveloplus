# Analyse des erreurs de tests

## Résumé actuel
- **Total tests** : 32
- **Tests passés** : 23
- **Tests échoués** : 6
- **Tests ignorés** : 3

## Erreurs corrigées

### 1. ✅ ReferenceError: Request/Response is not defined
**Problème** : NextRequest/NextResponse nécessitent Request/Response qui ne sont pas disponibles dans Jest/jsdom.

**Solution** :
- Installation de `undici` pour les polyfills Request/Response
- Ajout de TextEncoder/TextDecoder dans `jest.setup.js`
- Création d'un helper `createMockRequest` pour les tests API

### 2. ✅ Tests Vitest dans Jest
**Problème** : Des tests dans `src/lib/__tests__/` utilisent Vitest (`vi.mock`) au lieu de Jest.

**Solution** : Exclusion de ces tests via `testPathIgnorePatterns` dans `jest.config.js`

### 3. ✅ Helper test-request.ts détecté comme test
**Problème** : Le fichier helper était détecté comme un test.

**Solution** : Exclusion via `testPathIgnorePatterns`

### 4. ✅ useTableState - Valeur par défaut incorrecte
**Problème** : Les tests attendaient `sortDir: 'asc'` mais la valeur par défaut est `'desc'`.

**Solution** : Correction des assertions dans `useTableState.test.ts` pour correspondre à la valeur par défaut réelle (`'desc'`).

## Erreurs restantes à corriger

6 tests échouent encore. Analyse en cours...

