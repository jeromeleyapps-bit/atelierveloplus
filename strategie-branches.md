# 🌳 STRATÉGIE BRANCHES - Séparation Windows/macOS

**Date** : 22 novembre 2025  
**Objectif** : Organisation claire branches par plateforme

---

## 🎯 ARCHITECTURE BRANCHES

### Branches Principales

#### 1. `main` - Branche Principale
- **Usage** : Code stable, testé, validé
- **Plateforme** : Multi-plateforme (base commune)
- **Action** : ✅ **GARDER**

#### 2. `fix/macos-build` - Corrections Windows (Actuelle)
- **Usage** : Corrections build Electron **WINDOWS**
- **Plateforme** : Windows
- **Contenu** : Corrections 22nov2025 (config macOS supprimée)
- **Action** : ✅ **GARDER** - Branche active Windows

---

### Branches macOS (À Préserver pour Futur)

#### 3. `macos-workflow-only` - Build macOS Futur
- **Usage** : Configuration build Electron **macOS**
- **Plateforme** : macOS uniquement
- **Dossier futur** : Autre dossier projet macOS
- **Action** : ✅ **GARDER** - Réservé build macOS futur

#### 4. `refactor/flat-structure` - Structure macOS
- **Usage** : Structure projet pour macOS
- **Plateforme** : macOS
- **Action** : ⚠️ **ÉVALUER** - Vérifier si mergée ou utile

---

### Branches à Supprimer (Obsolètes/Mergées)

#### Branches de Backup/Test Temporaires
- `backup-typescript-fixes-20251121-123644` - Backup temporaire
- Autres branches de backup anciennes
- Branches de test ponctuelles terminées

---

## 📋 PLAN DE NETTOYAGE

### Étape 1 : Identifier Branches
```powershell
# Lister toutes les branches
git branch -a

# Identifier branches mergées dans main
git branch --merged main

# Identifier branches non mergées
git branch --no-merged main
```

### Étape 2 : Catégoriser

#### ✅ GARDER (Windows - Dossier Actuel)
- `main`
- `fix/macos-build` (branche active corrections Windows)

#### ✅ GARDER (macOS - Futur Dossier Séparé)
- `macos-workflow-only`
- Autres branches spécifiques macOS

#### ❌ SUPPRIMER (Obsolètes)
- Branches de backup temporaires
- Branches mergées et terminées
- Branches de test ponctuelles

---

## 🔧 COMMANDES DE NETTOYAGE

### Supprimer Branches Backup Temporaires

```powershell
# Exemple: Backup TypeScript (si mergé)
git branch -d backup-typescript-fixes-20251121-123644

# Supprimer aussi sur GitHub (si existe)
git push origin --delete backup-typescript-fixes-20251121-123644
```

### Vérifier Avant Suppression

```powershell
# Voir commits uniques dans branche
git log main..backup-typescript-fixes-20251121-123644 --oneline

# Si vide ou déjà dans main → Peut supprimer
```

---

## 🎓 ORGANISATION FUTURE

### Dossier Windows (Actuel)
```
C:\Users\j_ley\Atelier-velo+\
├── Branches:
│   ├── main (base commune)
│   ├── fix/macos-build (corrections Windows)
│   └── feat/* (nouvelles fonctionnalités Windows)
└── Build: Electron Windows
```

### Dossier macOS (Futur)
```
/Users/<user>/Atelier-velo-mac/
├── Branches:
│   ├── main (base commune - pull depuis Windows)
│   ├── macos-workflow-only (config macOS)
│   └── feat/* (nouvelles fonctionnalités macOS)
└── Build: Electron macOS
```

---

## 🚀 WORKFLOW RECOMMANDÉ

### Développement Windows (Actuel)
1. Créer branche depuis `main`
2. Développer fonctionnalité
3. Tester build Windows
4. Merger dans `main`
5. Push vers GitHub

### Développement macOS (Futur)
1. Clone repo dans dossier macOS
2. Checkout `macos-workflow-only`
3. Pull derniers changements `main`
4. Développer spécificités macOS
5. Tester build macOS
6. Merger dans `macos-workflow-only`
7. Push vers GitHub

### Synchronisation
```powershell
# Sur Windows: Push main
git checkout main
git push origin main

# Sur macOS: Pull main
git checkout macos-workflow-only
git pull origin main
git push origin macos-workflow-only
```

---

## 📊 ÉTAT ACTUEL BRANCHES

### Branches Locales Probables
```
* fix/macos-build              ← Actuelle (corrections Windows)
  main                         ← Stable
  macos-workflow-only          ← Réservé macOS futur
  backup-typescript-fixes-...  ← À supprimer si mergé
  refactor/flat-structure      ← À évaluer
```

### Branches Distantes (GitHub)
```
origin/main
origin/fix/macos-build
origin/macos-workflow-only
origin/refactor/flat-structure
...
```

---

## ✅ ACTIONS IMMÉDIATES

### 1. Analyser Branches Actuelles
```powershell
# Script personnalisé
git branch -a > branches-analyse.txt
git branch --merged main >> branches-analyse.txt
git branch --no-merged main >> branches-analyse.txt
```

### 2. Supprimer Branches Backup Temporaires
```powershell
# Identifier branches backup
git branch | Select-String "backup"

# Supprimer si mergées
git branch -d backup-typescript-fixes-20251121-123644
```

### 3. Préserver Branches macOS
```powershell
# NE PAS SUPPRIMER:
# - macos-workflow-only
# - Autres branches avec "macos" dans le nom
```

### 4. Push Corrections Windows
```powershell
# Push branche actuelle
git push origin fix/macos-build
```

---

## 🎯 RÉSUMÉ DÉCISIONS

| Branche | Plateforme | Action | Raison |
|---------|-----------|--------|--------|
| `main` | Commune | ✅ GARDER | Base stable |
| `fix/macos-build` | Windows | ✅ GARDER | Corrections actives |
| `macos-workflow-only` | macOS | ✅ GARDER | Build macOS futur |
| `backup-typescript-*` | Backup | ❌ SUPPRIMER | Temporaire, mergé |
| `refactor/flat-structure` | macOS? | ⚠️ ÉVALUER | Vérifier utilité |

---

## 📝 NOTES IMPORTANTES

### Séparation Windows/macOS

**Pourquoi Séparer ?**
1. Configurations build différentes
2. Dépendances spécifiques plateforme
3. Tests indépendants
4. Éviter conflits configuration

**Comment Gérer ?**
1. Dossiers séparés physiquement
2. Branches dédiées par plateforme
3. `main` comme base commune
4. Merge sélectif des fonctionnalités

### Branches à NE JAMAIS Supprimer
- `main` - Base stable
- `macos-workflow-only` - Config macOS
- Branches actives en développement

### Branches Safe à Supprimer
- Branches backup temporaires
- Branches mergées et validées
- Branches de test ponctuelles terminées

---

**© 2024-2025 Jérôme Leyssard - Upgraded Bikes**  
**Stratégie définie le 22 novembre 2025**

