# 🚀 PLAN D'AMÉLIORATIONS V3 - ATELIER VÉLO+
## Plan Stratégique Consolidé & Correction Build Portable

**Date** : 03 décembre 2025  
**Version Application** : 1.0.18 (Cible)  
**Statut** : 🎯 **PHASE 2 EN COURS** - **URGENCE BUILD PORTABLE**  
**Documents Sources** : 
- `PLAN-AMELIORATIONS-V2-27NOV2025.md` (Stratégie globale)
- `PLAN-AMELIORATION-QUALITE.md` (Détail Tests/Qualité - 22 Nov)
- `ANALYSE-BUILD-29NOV-COMPLETE.md` (Analyse échec build)

---

## 🚨 PRIORITÉ ABSOLUE : CORRECTION BUILD PORTABLE (IMMÉDIAT)

**Problème** : Le build portable échoue avec l'erreur `ENAMETOOLONG` lors de la signature.  
**Cause Racine** : Inclusion de l'intégralité du dossier `node_modules` (y compris `devDependencies`) dans le build, générant trop de fichiers pour l'outil de signature Windows.  
**Impact** : Impossible de générer un exécutable portable distribuable.

### 🛠️ Plan d'Action Immédiat (Sprint 2.3 - Spécial Build)

1.  **Optimisation `prepare-build-optimized.js`** :
    *   Modifier la stratégie de copie des modules.
    *   Au lieu de copier `node_modules` existant, créer un dossier temporaire.
    *   Copier `package.json` et `package-lock.json`.
    *   Exécuter `npm ci --omit=dev` pour installer UNIQUEMENT les dépendances de production.
    *   Copier ce `node_modules` épuré vers `electron-resources/web/npm_modules`.
    *   **Gain attendu** : Réduction drastique du nombre de fichiers (~15k -> ~3k fichiers).

2.  **Validation Build** :
    *   Lancer `npm run build:electron`.
    *   Vérifier succès de la signature.
    *   Vérifier fonctionnement de l'exécutable portable (démarrage, Prisma, accès DB).

3.  **Nettoyage Scripts** :
    *   Corriger syntaxe `analyse-erreurs-build.ps1`.
    *   Vérifier `Get-FileHash` dans les scripts de vérification.

---

## 📊 ÉTAT DES LIEUX CONSOLIDÉ (03/12/2025)

### ✅ Ce qui est Fait (Phase 1 & Début Phase 2)
*   **Build Unpacked** : Fonctionnel, taille réduite à ~518 MB (-60%).
*   **Qualité Code** :
    *   Console.log éradiqués en prod.
    *   TODOs critiques traités.
    *   **TypeScript** : -99% d'erreurs (reste ~2 erreurs mineures).
*   **Tests** :
    *   Tests Unitaires : 451 tests passants (100%).
    *   Tests E2E : 18/18 scénarios critiques passants (100%).
    *   Infrastructure Playwright/Jest robuste.

### ⚠️ Ce qui Reste à Faire (Dette Technique & Qualité)
*   **Build Portable** : ❌ ÉCHEC (Bloquant).
*   **Couverture Tests** : 7.09% (Cible: 60% selon plan Qualité).
*   **Architecture** : Logique métier encore trop couplée aux routes API.
*   **Performance** : Temps de chargement à optimiser (< 3s).

---

## 📅 ROADMAP V3 - EXÉCUTION

### 🟢 SPRINT 2.3 : BUILD & STABILITÉ (Semaine en cours)
**Objectif** : Un exécutable portable qui fonctionne et une base saine.

- [ ] **Correction Build Portable** (Voir ci-dessus "Priorité Absolue").
- [ ] **Validation Finale Build** : Test sur machine vierge (VM ou Sandbox).
- [ ] **Correction Scripts Analyse** : Rendre les outils de diagnostic fonctionnels.

### 🟡 SPRINT 2.4 : QUALITÉ & COUVERTURE (Basé sur Plan 22 Nov)
**Objectif** : Sécuriser le cœur métier (Facturation, Licences).

- [ ] **Tests Calculs Financiers** (`src/lib/invoice-totals.ts`) :
    *   Scénarios TVA multiples, Auto-Entrepreneur, Avoirs.
- [ ] **Tests Système Licences** (`src/lib/license-manager.ts`) :
    *   Validation machine ID, expiration, features par tier.
- [ ] **Tests Génération PDF** (`src/lib/pdf-invoice.ts`) :
    *   Vérification contenu, mentions légales, logo.
- [ ] **Refactoring Fichiers > 600 lignes** :
    *   Cibler `license-manager.ts` et gros composants UI.

### 🔵 SPRINT 3.0 : ARCHITECTURE & PERF (Phase 3 V2)
**Objectif** : Scalabilité et Maintenance.

- [ ] **Architecture Services** :
    *   Extraire logique de `src/app/api/customers` vers `src/services/customers.ts`.
    *   Généraliser aux Tickets et Factures.
- [ ] **Optimisation Performance** :
    *   Lazy loading des routes Admin.
    *   Optimisation requêtes Prisma (select spécifiques).

### 🟣 SPRINT 4.0 : FONCTIONNALITÉS & PROD (Phase 4 V2)
**Objectif** : Valeur Utilisateur.

- [ ] **Export Données** (JSON/CSV).
- [ ] **Documentation Technique** (JSDoc, OpenAPI).
- [ ] **Monitoring Production** (Logs structurés, Alertes).

---

## 📋 TABLEAU DE BORD TECHNIQUE V3

| Domaine | Indicateur | Actuel | Cible V3 | Priorité |
|---------|------------|--------|----------|----------|
| **Build** | Portable Exe | ❌ Échec | ✅ Succès | 🔥 **CRITIQUE** |
| **Qualité** | Erreurs TS | ~2 | 0 | 🟡 Moyenne |
| **Tests** | Couverture | 7% | 15% (Court terme) -> 60% | 🟡 Moyenne |
| **Tests** | E2E | 18/18 | 25+ (Couvrir edge cases) | 🟢 Basse |
| **Archi** | Services | 0% | 30% (Pilotes) | 🔵 Future |

## 📝 NOTES D'IMPLÉMENTATION POUR LE BUILD

Pour résoudre le problème `ENAMETOOLONG`, nous allons modifier `prepare-build-optimized.js` :

```javascript
// Pseudo-code de la modification
console.log('📦 Installation dépendances PROD uniquement...');
execSync('npm ci --omit=dev', { cwd: tempDir });
// Copie vers electron-resources/web/npm_modules
```

Cette approche est plus robuste que les filtres de copie manuels car elle s'appuie sur la définition officielle des dépendances de production de NPM.

---
**Validé pour exécution immédiate : Correction Build Portable.**
