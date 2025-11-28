# 🚀 SPRINT 2.2 : TESTS E2E & COUVERTURE - PLAN D'ACTION

**Date de démarrage** : 28 novembre 2025  
**Objectif** : Couverture 15% + E2E fonctionnels  
**Statut** : 🟡 **EN COURS**

---

## 📊 ÉTAT ACTUEL

### Tests E2E (Playwright)
- **Total** : 18 tests E2E configurés
- **Fichiers** : 4 fichiers de tests (auth, tickets, customers, navigation)
- **Problèmes identifiés** :
  - ⚠️ TransformStream polyfill manquant
  - ⚠️ Tests E2E ne peuvent pas s'exécuter dans Jest
  - ⚠️ Configuration Playwright à vérifier

### Couverture Tests
- **Actuel** : 7.09%
- **Cible** : 15%
- **Gap** : +7.91% à atteindre

---

## 🎯 OBJECTIFS SPRINT 2.2

### Objectif Principal
✅ **18/18 tests E2E passants (100%)**  
✅ **Couverture tests 15%+**

---

## 📋 ACTIONS À RÉALISER

### 1. Analyse État Actuel (EN COURS)

- [x] ✅ Lire fichiers tests E2E
- [x] ✅ Analyser configuration Playwright
- [x] ✅ Identifier problèmes TransformStream
- [ ] Analyser erreurs spécifiques des tests
- [ ] Vérifier setup/teardown des tests

### 2. Correction Tests E2E

#### 2.1 TransformStream Polyfill
- [ ] Ajouter polyfill TransformStream dans `playwright.config.ts`
- [ ] Ou créer fichier setup global pour Playwright
- [ ] Tester avec un test simple

#### 2.2 Stabilisation Tests Login
- [ ] Vérifier sélecteurs login
- [ ] Ajouter waits appropriés
- [ ] Stabiliser credentials de test
- [ ] Vérifier redirections après login

#### 2.3 Correction Sélecteurs Navigation
- [ ] Vérifier tous les sélecteurs de navigation
- [ ] Remplacer sélecteurs fragiles par `getByRole()`
- [ ] Ajouter attentes explicites

#### 2.4 Messages d'Erreur
- [ ] Vérifier messages d'erreur dans tests
- [ ] Corriger assertions si nécessaire

### 3. Augmentation Couverture Tests

#### 3.1 Tests Routes Admin
- [ ] Tests route `/api/admin/license`
- [ ] Tests route `/api/admin/jobs`
- [ ] Tests route `/api/admin/backup`
- [ ] Tests route `/api/admin/stats`

#### 3.2 Tests Composants UI
- [ ] Tests formulaires critiques
- [ ] Tests tables de données
- [ ] Tests dialogs/modales

#### 3.3 Tests Services Layer
- [ ] Si services créés, ajouter tests unitaires

### 4. Tests Performance

- [ ] Tests temps chargement pages
- [ ] Tests réactivité formulaires
- [ ] Tests erreurs réseau

---

## 🛠️ ÉTAPES IMMÉDIATES

### Étape 1 : Analyser Configuration Playwright
1. Vérifier `playwright.config.ts`
2. Identifier problème TransformStream
3. Proposer solution

### Étape 2 : Créer Setup Global
1. Créer fichier setup pour polyfill
2. Configurer dans playwright.config.ts
3. Tester avec un test simple

### Étape 3 : Corriger Tests Un Par Un
1. Commencer par tests auth (plus simples)
2. Puis navigation
3. Puis tickets/customers

---

## 📊 MÉTRIQUES DE SUCCÈS

- ✅ **18/18 tests E2E passants**
- ✅ **Couverture 15%+**
- ✅ **0 erreur dans tests unitaires**
- ✅ **Tests performance configurés**

---

## 🚀 COMMANDES UTILES

```powershell
# Installer Playwright browsers (si nécessaire)
npx playwright install chromium

# Lancer tests E2E (après corrections)
npm run test:e2e

# Lancer tests E2E en mode UI interactif
npm run test:e2e:ui

# Lancer un test spécifique
npx playwright test auth.spec.ts

# Voir couverture tests
npm run test:coverage
```

---

**Statut** : 🟡 **DÉMARRÉ**  
**Prochaine action** : Analyser configuration Playwright et corriger TransformStream

