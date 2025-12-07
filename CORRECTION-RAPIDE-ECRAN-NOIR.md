# ⚡ CORRECTION RAPIDE ÉCRAN NOIR + ICÔNE

**Date** : 29 novembre 2025  
**Action** : Corrections immédiates

---

## 🔴 PROBLÈMES IDENTIFIÉS

1. ❌ **Build échoué** avec ENAMETOOLONG
2. ❌ **Écran noir** (serveur Next.js ne démarre pas)
3. ❌ **Icône non visible** (build incomplet)

---

## ✅ SOLUTIONS RAPIDES

### Solution 1 : Build Portable (Évite ENAMETOOLONG)

Le build portable évite le problème ENAMETOOLONG car il ne fait pas de signature.

**Commande** :
```powershell
npx electron-builder --win portable --config electron-builder.config.yml --dir
```

**OU modifier config temporairement** :
```yaml
win:
  target:
    - target: portable
      arch:
        - x64
```

---

### Solution 2 : Vérifier et Corriger Icône

**Problème** : L'icône peut ne pas être intégrée si le build a échoué.

**Correction** :
1. S'assurer que `resources/icon.ico` existe
2. Vérifier configuration dans `electron-builder.config.yml`
3. Nettoyer cache Windows

---

### Solution 3 : Diagnostiquer Écran Noir

**Causes probables** :
1. Serveur Next.js ne démarre pas
2. Modules Node.js manquants
3. Symlink node_modules incorrect

**Actions** :
1. Vérifier logs Electron
2. Tester serveur manuellement
3. Vérifier symlink

---

## 🚀 ACTION IMMÉDIATE RECOMMANDÉE

### Option A : Re-build Portable

```powershell
# 1. Nettoyer
Remove-Item dist-electron -Recurse -Force

# 2. Préparation (déjà fait)
# npm run postbuild

# 3. Build portable
npx electron-builder --win portable --config electron-builder.config.yml --dir

# 4. Tester
Start-Process "dist-electron\win-unpacked\Atelier Velo+.exe"
```

### Option B : Corriger ENAMETOOLONG puis Re-build

Voir `DIAGNOSTIC-ECRAN-NOIR-ICONE.md` pour détails.

---

**Prochaine action** : Tester serveur Next.js manuellement pour identifier cause écran noir




