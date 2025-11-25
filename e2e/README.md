# Tests E2E avec Playwright

## 📋 Vue d'ensemble

Tests End-to-End (E2E) pour l'application Atelier Vélo+ utilisant Playwright.

**Total** : 18 tests E2E couvrant les parcours critiques

---

## 🎯 Tests Créés

### 1. Authentication (`auth.spec.ts`) - 4 tests
- ✅ Affichage page de login
- ✅ Erreur avec credentials invalides
- ✅ Connexion réussie et redirection
- ✅ Déconnexion

### 2. Tickets (`tickets.spec.ts`) - 4 tests
- ✅ Affichage page tickets
- ✅ Ouverture dialog création ticket
- ✅ Filtrage par statut
- ✅ Recherche de tickets

### 3. Customers (`customers.spec.ts`) - 4 tests
- ✅ Affichage page clients
- ✅ Ouverture dialog création client
- ✅ Recherche de clients
- ✅ Affichage détails client

### 4. Navigation (`navigation.spec.ts`) - 6 tests
- ✅ Navigation vers Dashboard
- ✅ Navigation vers Tickets
- ✅ Navigation vers Clients
- ✅ Navigation vers Catalogue
- ✅ Navigation vers Finance
- ✅ Accès paramètres Admin

---

## 🚀 Utilisation

### Prérequis
```bash
# Installer les browsers Playwright
npx playwright install chromium
```

### Lancer les tests

```bash
# Mode headless (par défaut)
npm run test:e2e

# Mode UI interactif
npm run test:e2e:ui

# Mode headed (voir le browser)
npm run test:e2e:headed

# Mode debug
npm run test:e2e:debug

# Voir le rapport
npm run test:e2e:report
```

### Lancer un fichier spécifique

```bash
# Test auth uniquement
npx playwright test auth.spec.ts

# Test tickets uniquement
npx playwright test tickets.spec.ts
```

---

## ⚙️ Configuration

La configuration se trouve dans `playwright.config.ts` :

- **Base URL** : `http://localhost:3000`
- **Timeout** : 30s par test
- **Retries** : 2 en CI, 0 en local
- **Browser** : Chromium (Desktop Chrome)
- **Traces** : Activées en cas d'échec
- **Screenshots** : En cas d'échec uniquement
- **Video** : En cas d'échec uniquement

---

## 📝 Credentials de Test

Les tests utilisent des credentials par défaut :
- **Email** : `admin@atelier-velo.fr`
- **Password** : `Admin123!`

⚠️ **Important** : Adapter ces credentials selon votre environnement de test.

---

## 🔧 Bonnes Pratiques

### 1. Sélecteurs
- Privilégier `getByRole()` et `getByLabel()`
- Éviter les sélecteurs CSS/XPath fragiles
- Utiliser des regex pour la flexibilité : `/connexion/i`

### 2. Attentes
- Toujours utiliser `expect()` avec timeout
- Utiliser `waitForTimeout()` avec parcimonie
- Préférer les attentes explicites

### 3. Isolation
- Chaque test doit être indépendant
- Utiliser `beforeEach()` pour le setup
- Ne pas dépendre de l'ordre d'exécution

### 4. Maintenance
- Mettre à jour les tests avec les changements UI
- Ajouter des tests pour les nouvelles features
- Supprimer les tests obsolètes

---

## 📊 Couverture

### Parcours couverts
- ✅ Authentification complète
- ✅ Navigation principale
- ✅ Gestion tickets (CRUD)
- ✅ Gestion clients (CRUD)

### À ajouter (Phase 2)
- [ ] Gestion catalogue
- [ ] Facturation et devis
- [ ] Paramètres admin
- [ ] Gestion vélos
- [ ] Calendrier RDV

---

## 🐛 Debug

### Voir les traces
```bash
npx playwright show-trace trace.zip
```

### Mode debug interactif
```bash
npm run test:e2e:debug
```

### Logs détaillés
```bash
DEBUG=pw:api npm run test:e2e
```

---

## 📈 CI/CD

Les tests E2E sont configurés pour s'exécuter :
- ✅ En local avant commit
- ✅ Dans GitHub Actions (CI)
- ✅ Avant chaque release

Configuration CI : `.github/workflows/test.yml`

---

## 🎯 Prochaines Étapes

1. Ajouter tests pour les parcours finance
2. Ajouter tests pour le catalogue
3. Ajouter tests pour les paramètres
4. Configurer tests visuels (screenshots)
5. Ajouter tests de performance

---

**Date de création** : 25 novembre 2024  
**Framework** : Playwright 1.56.1  
**Statut** : ✅ Infrastructure complète, 18 tests créés

