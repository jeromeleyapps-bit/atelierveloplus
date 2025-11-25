# Analyse des erreurs de tests

## Résumé
- **Total tests** : 305
- **Tests passent** : 278 (91.1%)
- **Tests échouent** : 24 (7.9%)
- **Tests ignorés** : 3 (1.0%)

## Fichiers avec erreurs

### 1. `src/__tests__/lib/security.test.ts` (3 erreurs)
**Problème** : `crypto.subtle` n'est pas disponible dans l'environnement Jest/jsdom
**Erreur** : `TypeError: Cannot read properties of undefined (reading 'digest')`
**Cause** : `crypto.subtle` est une API Web Crypto qui n'est pas implémentée dans jsdom
**Solution** : Mocker `crypto.subtle` dans les tests

### 2. `src/__tests__/api/catalog-items.test.ts` (1 erreur)
**Problème** : Test s'attend à ce que `POST` rejette une promesse, mais la fonction gère l'erreur et retourne une `NextResponse`
**Erreur** : `expect(received).rejects.toThrow()` - Received promise resolved instead of rejected
**Cause** : La fonction `POST` gère les erreurs avec `handleApiError` et retourne une réponse 500 au lieu de throw
**Solution** : Corriger le test pour vérifier le status 500 au lieu d'attendre un throw

### 3. `src/__tests__/api/bikes-search.test.ts` (plusieurs erreurs)
**Problème** : Tests qui vérifient `prisma` directement, mais la route peut utiliser `getPrisma()` ou gérer différemment
**Solution** : Vérifier l'implémentation réelle et ajuster les mocks

### 4. `src/__tests__/api/invoices-id.test.ts` (1 erreur)
**Problème** : Test s'attend à ce que `GET` rejette, mais la fonction gère probablement l'erreur
**Solution** : Corriger le test pour vérifier le status 500 au lieu d'attendre un throw

### 5. `src/__tests__/api/finance-quotes.test.ts` (2 erreurs)
**Problème** : Mocks incomplets ou assertions incorrectes
**Solution** : Vérifier les mocks et corriger les assertions

### 6. `src/__tests__/api/customers-bikes.test.ts` (plusieurs erreurs)
**Problème** : Mocks ou assertions incorrectes
**Solution** : Vérifier les mocks Prisma et corriger les assertions

### 7. `src/__tests__/api/admin-stats.test.ts` (1 erreur)
**Problème** : Test de cache qui ne fonctionne pas correctement
**Solution** : Corriger le test de cache (déjà partiellement corrigé)

### 8. `src/__tests__/api/admin-system-settings.test.ts` (2 erreurs)
**Problème** : Mocks incomplets ou assertions incorrectes
**Solution** : Vérifier les mocks et corriger les assertions

### 9. `src/__tests__/lib/invoice-totals.test.ts` (plusieurs erreurs)
**Problème** : Assertions incorrectes ou données de test invalides
**Solution** : Vérifier les calculs attendus et corriger les assertions

### 10. `src/__tests__/lib/validation.test.ts` (1 erreur)
**Problème** : Test de `formatZodError` qui peut ne pas fonctionner correctement
**Solution** : Vérifier l'implémentation de `formatZodError` et corriger le test

### 11. `src/__tests__/lib/format.test.ts` (plusieurs erreurs)
**Problème** : Fonctions de formatage qui peuvent ne pas exister ou avoir des signatures différentes
**Solution** : Vérifier les fonctions réelles et corriger les tests

### 12. `src/__tests__/lib/jwt.test.ts` (plusieurs erreurs)
**Problème** : Tests JWT qui peuvent nécessiter des mocks supplémentaires
**Solution** : Vérifier les dépendances et ajouter les mocks nécessaires

## Corrections nécessaires

### Priorité 1 : Corrections critiques
1. **security.test.ts** - Mocker `crypto.subtle`
2. **catalog-items.test.ts** - Corriger l'attente d'erreur
3. **invoices-id.test.ts** - Corriger l'attente d'erreur

### Priorité 2 : Corrections importantes
4. **bikes-search.test.ts** - Vérifier et corriger les mocks
5. **finance-quotes.test.ts** - Compléter les mocks
6. **customers-bikes.test.ts** - Corriger les mocks

### Priorité 3 : Corrections mineures
7. **admin-stats.test.ts** - Test de cache
8. **admin-system-settings.test.ts** - Mocks
9. **invoice-totals.test.ts** - Assertions
10. **validation.test.ts** - FormatZodError
11. **format.test.ts** - Fonctions manquantes
12. **jwt.test.ts** - Mocks supplémentaires

