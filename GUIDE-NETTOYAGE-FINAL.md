# 🧹 GUIDE NETTOYAGE FINAL - Simple et Efficace

**Date** : 22 novembre 2025  
**Stratégie** : Préserver Windows actuel + macOS futur séparés

---

## 🎯 OBJECTIF

Nettoyer branches obsolètes SANS toucher :
- ✅ Branches Windows (dossier actuel)
- ✅ Branches macOS (futur dossier séparé)

---

## 🚀 COMMANDE UNIQUE

```powershell
.\nettoyage-intelligent.ps1
```

**Ce script va** :
1. ✅ Analyser toutes les branches
2. ✅ Catégoriser (Windows / macOS / Obsolètes)
3. ✅ Identifier branches safe à supprimer
4. ✅ Proposer suppression (vous confirmez)
5. ✅ Nettoyer références distantes

**Durée** : 30 secondes

---

## 📋 BRANCHES PRÉSERVÉES

### Windows (Dossier Actuel)
- ✅ `main` - Base stable
- ✅ `fix/macos-build` - Corrections actives Windows

### macOS (Futur Dossier Séparé)
- ✅ `macos-workflow-only` - Config build macOS
- ✅ `refactor/flat-structure` - Structure macOS

### Branches Supprimées (Exemples)
- ❌ `backup-typescript-fixes-*` - Backups temporaires
- ❌ Autres branches mergées et obsolètes

---

## 🎓 STRATÉGIE COMPLÈTE

Voir fichier : **`strategie-branches.md`**

### Organisation Future

#### Dossier Windows (Actuel)
```
C:\Users\j_ley\Atelier-velo+\
└── Branches: main, fix/macos-build
└── Build: Electron Windows
```

#### Dossier macOS (Futur)
```
/Users/<user>/Atelier-velo-mac/
└── Branches: main, macos-workflow-only
└── Build: Electron macOS
```

---

## ✅ ACTIONS APRÈS NETTOYAGE

### 1. Push Corrections Windows
```powershell
.\push-github.ps1
```

### 2. Vérifier Branches
```powershell
git branch -a
```

### 3. Créer Tag (Après Build Réussi)
```powershell
git tag -a v1.0.17-build-fix-windows -m "Fix build Windows 22nov2025"
git push origin v1.0.17-build-fix-windows
```

---

## 📊 RÉSUMÉ

| Action | Script | Durée |
|--------|--------|-------|
| Nettoyage branches | `.\nettoyage-intelligent.ps1` | 30s |
| Push GitHub | `.\push-github.ps1` | 10s |
| Vérification | `git branch -a` | 5s |

---

## 🎯 COMMANDE IMMÉDIATE

```powershell
.\nettoyage-intelligent.ps1
```

**Puis confirmez les suppressions proposées (O/N)**

---

**© 2024-2025 Jérôme Leyssard - Upgraded Bikes**  
**Guide créé le 22 novembre 2025**

