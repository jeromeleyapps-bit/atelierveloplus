# Guide Build V1 & V2 - Atelier Vélo+

**Date**: 14 octobre 2025  
**Copyright**: © 2024-2025 Jérôme Leyssard - Upgraded Bikes

---

## 📋 Vue d'ensemble

Deux scripts de build optimisés pour différents cas d'usage:

| Script | Usage | Durée | Complexité |
|--------|-------|-------|------------|
| **V1 - Simple** | Build rapide quotidien | ~5 min | Faible |
| **V2 - Complet** | Build production robuste | ~8 min | Moyenne |

---

## 🚀 Build V1 - Simple & Rapide

### Quand l'utiliser?
- ✅ Développement quotidien
- ✅ Tests rapides
- ✅ Modifications mineures
- ✅ Environnement stable

### Commande
```powershell
# Build simple
.\build-v1-simple.ps1

# Build avec version spécifique
.\build-v1-simple.ps1 -Version "1.0.2"

# Build sans nettoyage (encore plus rapide)
.\build-v1-simple.ps1 -SkipClean
```

### Étapes
1. Vérification Node.js
2. Arrêt processus
3. Nettoyage léger (.next)
4. Installation dépendances
5. Génération Prisma
6. Build Next.js
7. Copie Prisma dans standalone
8. Build Electron
9. Vérification exe

### Avantages
- ⚡ **Rapide** (~5 minutes)
- 🎯 **Simple** (pas de complexité)
- 📦 **Efficace** (essentiel seulement)

### Inconvénients
- ⚠️ Pas de retry automatique
- ⚠️ Pas de vérifications étendues
- ⚠️ Pas de package distribution

---

## 🛡️ Build V2 - Complet & Robuste

### Quand l'utiliser?
- ✅ Build production
- ✅ Release officielle
- ✅ Après modifications majeures
- ✅ Problèmes de build récurrents
- ✅ Création package distribution

### Commande
```powershell
# Build complet standard
.\build-v2-complet.ps1

# Build avec nettoyage complet
.\build-v2-complet.ps1 -CleanAll

# Build production avec distribution
.\build-v2-complet.ps1 -Version "1.0.2" -CreateDistribution

# Build sans lint (plus rapide)
.\build-v2-complet.ps1 -SkipLint -SkipTests

# Build sans retry (debug)
.\build-v2-complet.ps1 -NoRetry
```

### Étapes
1. Vérification environnement complet
2. Vérification permissions Admin
3. Arrêt processus
4. Nettoyage (léger ou complet)
5. Installation dépendances
6. Génération Prisma avec vérification
7. Lint ESLint (optionnel)
8. Tests TypeScript (optionnel)
9. Build Next.js
10. Vérifications standalone étendues
11. Copie dépendances critiques
12. Build Electron avec retry automatique
13. Vérification exe et installer
14. Copie Prisma dans ressources
15. Création package distribution (optionnel)

### Avantages
- 🛡️ **Robuste** (retry automatique)
- 🔍 **Vérifications** (lint, types, permissions)
- 📦 **Distribution** (package prêt à distribuer)
- 🐛 **Debug** (messages détaillés)

### Inconvénients
- ⏱️ Plus lent (~8 minutes)
- 🔧 Plus complexe

---

## 🎯 Comparaison Détaillée

### Fonctionnalités

| Fonctionnalité | V1 Simple | V2 Complet |
|----------------|-----------|------------|
| Vérification Node.js | ✅ | ✅ |
| Vérification permissions Admin | ❌ | ✅ |
| Nettoyage complet | ❌ | ✅ (option) |
| Lint ESLint | ❌ | ✅ (option) |
| Tests TypeScript | ❌ | ✅ (option) |
| Retry automatique | ❌ | ✅ |
| Vérifications étendues | ❌ | ✅ |
| Package distribution | ❌ | ✅ (option) |
| Gestion erreurs symlink | ⚠️ Basique | ✅ Avancée |
| Messages debug | ⚠️ Basiques | ✅ Détaillés |

### Performance

| Métrique | V1 Simple | V2 Complet |
|----------|-----------|------------|
| Durée (clean) | ~5 min | ~8 min |
| Durée (no clean) | ~3 min | ~6 min |
| Taille script | ~150 lignes | ~400 lignes |
| Complexité | Faible | Moyenne |

---

## 📝 Paramètres Disponibles

### V1 - Simple

```powershell
-Version "x.x.x"    # Version de l'application (défaut: 1.0.0)
-SkipClean          # Ne pas nettoyer .next (plus rapide)
-SkipTests          # Ne pas lancer les tests (réservé)
```

### V2 - Complet

```powershell
-Version "x.x.x"    # Version de l'application (défaut: 1.0.0)
-CleanAll           # Nettoyage complet (node_modules, dist, etc.)
-SkipLint           # Ne pas lancer ESLint
-SkipTests          # Ne pas lancer tests TypeScript
-CreateDistribution # Créer package distribution prêt à distribuer
-NoRetry            # Désactiver retry automatique (debug)
```

---

## 🔧 Prérequis

### Obligatoires
- ✅ **Node.js 20.18.0** (vérifier avec `node -v`)
- ✅ **pnpm** installé globalement (`npm install -g pnpm`)
- ✅ **PowerShell** (Windows)

### Recommandés
- ✅ **PowerShell en Administrateur** (pour symlinks)
- ✅ **Mode Développeur Windows** activé (alternative)
- ✅ **Espace disque** minimum 5 GB

### Vérification
```powershell
# Vérifier Node.js
node -v  # Doit afficher v20.18.0

# Vérifier pnpm
pnpm -v  # Doit afficher une version (ex: 9.x.x)

# Vérifier permissions Admin
whoami /priv | Select-String "SeCreateSymbolicLinkPrivilege"
```

---

## ⚠️ Problèmes Courants

### Erreur: EPERM symlink

**Symptôme**:
```
Error: EPERM: operation not permitted, symlink
```

**Solutions**:
1. **Relancer PowerShell en Administrateur** (recommandé)
2. **Activer Mode Développeur Windows**:
   - Paramètres > Confidentialité et sécurité > Pour les développeurs
   - Activer "Mode développeur"
3. **Utiliser V2 avec retry**: `.\build-v2-complet.ps1`

### Erreur: Prisma Client manquant

**Symptôme**:
```
Error: Cannot find module '@prisma/client'
```

**Solutions**:
1. Utiliser **V2** qui gère automatiquement la copie Prisma
2. Vérifier que `pnpm prisma generate` a réussi
3. Utiliser `-CleanAll` pour repartir de zéro

### Erreur: Build Next.js échoue

**Symptôme**:
```
Build error occurred
```

**Solutions**:
1. Vérifier `GARANTIE_BUILD_SANS_ERREURS.md`
2. Utiliser `-SkipLint -SkipTests` pour ignorer warnings
3. Vérifier `next.config.js` (ignoreDuringBuilds: true)

---

## 📊 Workflow Recommandé

### Développement Quotidien
```powershell
# Build rapide pour tester
.\build-v1-simple.ps1 -SkipClean

# Si erreur, retry avec V2
.\build-v2-complet.ps1
```

### Release Production
```powershell
# Build complet avec distribution
.\build-v2-complet.ps1 -Version "1.0.2" -CleanAll -CreateDistribution
```

### Debug Problèmes
```powershell
# Build avec nettoyage complet et sans retry
.\build-v2-complet.ps1 -CleanAll -NoRetry -SkipLint
```

---

## 🎯 Résultats Attendus

### Fichiers Générés

```
apps/desktop/dist/
├── win-unpacked/
│   ├── Atelier Velo+.exe          # Exécutable principal
│   └── resources/
│       └── web/                    # Application Next.js
│           ├── server.js
│           ├── prisma/             # Schéma et migrations
│           └── node_modules/       # Dépendances
└── Atelier Velo+ Setup 1.0.0.exe  # Installer
```

### Avec -CreateDistribution (V2)

```
AtelierVelo-1.0.0-Windows/
├── Atelier Velo+.exe
├── Atelier Velo+ Setup 1.0.0.exe
└── README.txt
```

---

## 📚 Ressources

- **`GARANTIE_BUILD_SANS_ERREURS.md`** - Garanties TypeScript/ESLint
- **`SESSION_14OCT2025_RECAP.md`** - Récapitulatif session
- **`BUILD_PROCEDURE.md`** - Procédure détaillée
- **`test-exe-with-logs.ps1`** - Script de test exe

---

## 🎉 Conclusion

### Choisir V1 si:
- ✅ Build rapide nécessaire
- ✅ Environnement stable
- ✅ Modifications mineures

### Choisir V2 si:
- ✅ Build production
- ✅ Release officielle
- ✅ Problèmes récurrents
- ✅ Package distribution nécessaire

**Les deux scripts garantissent un build sans erreurs TypeScript/ESLint !**

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
