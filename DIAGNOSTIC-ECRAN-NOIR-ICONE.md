# 🔴 DIAGNOSTIC ÉCRAN NOIR + ICÔNE - 29 Novembre 2025

**Date** : 29 novembre 2025  
**Statut** : 🔴 **PROBLÈMES MULTIPLES IDENTIFIÉS**

---

## 📋 PROBLÈMES SIGNALÉS

1. ❌ **Écran noir** dans l'application
2. ❌ **Erreurs dans les logs**
3. ❌ **Icône personnalisée non visible**

---

## 🔍 ANALYSE DES PROBLÈMES

### 1. ÉCRAN NOIR 🔴

#### Causes Possibles

**A. Build incomplet (ENAMETOOLONG)**
- ❌ Build échoué avec erreur `ENAMETOOLONG`
- ⚠️ Build unpacked existe mais peut être corrompu
- ⚠️ Fichiers manquants ou incomplets

**B. Serveur Next.js ne démarre pas**
- ❌ Modules Node.js manquants
- ❌ Symlink node_modules incorrect
- ❌ .next/server manquant ou corrompu

**C. Erreurs JavaScript non gérées**
- ❌ Erreurs dans la console bloquant le rendu
- ❌ Modules non trouvés (require errors)

#### Diagnostic

**Structure vérifiée** :
- ✅ `dist-electron\win-unpacked\Atelier Velo+.exe` existe (201.06 MB)
- ✅ `resources\web\.next\server` présent (537 fichiers)
- ✅ `resources\web\npm_modules` présent (109,537 fichiers)
- ✅ `resources\web\node_modules` présent (symlink)

**Problème identifié** :
- ⚠️ Build a échoué avant la fin (ENAMETOOLONG)
- ⚠️ Fichiers peuvent être incomplets
- ⚠️ Serveur Next.js peut ne pas démarrer

---

### 2. ERREURS DANS LES LOGS 🔴

#### Erreur Principale

```
❌ Cannot spawn app-builder.exe: Error: spawn ENAMETOOLONG
```

**Contexte** :
- Erreur lors de `signAndEditResources` (WinPackager)
- Ligne de commande trop longue (>8191 caractères Windows)
- Causé par trop de fichiers dans `npm_modules/`

**Impact** :
- Build incomplet
- Fichiers non signés
- Structure potentiellement corrompue

---

### 3. ICÔNE PERSONNALISÉE NON VISIBLE 🔴

#### Configuration Actuelle

```yaml
# electron-builder.config.yml
directories:
  buildResources: resources

win:
  icon: resources/icon.ico
```

**Vérifications** :
- ✅ `resources/icon.ico` existe (278.79 KB)
- ✅ Configuration semble correcte
- ⚠️ Build a échoué → icône peut ne pas être intégrée

#### Causes Possibles

1. **Build incomplet** (le plus probable)
   - Build échoué avant intégration icône
   - Exécutable créé mais icône non intégrée

2. **Cache Windows**
   - Icône mise en cache par Windows
   - Nécessite refresh cache

3. **Configuration incorrecte**
   - Chemin relatif peut être incorrect
   - `buildResources` peut ne pas être résolu correctement

---

## 🔧 SOLUTIONS PROPOSÉES

### Solution 1 : CORRIGER BUILD ENAMETOOLONG (PRIORITÉ 1)

**Problème** : Trop de fichiers dans `npm_modules/` cause ligne de commande trop longue

**Solutions** :

#### A. Réduire nombre de fichiers copiés

Modifier `prepare-build-optimized.js` pour copier uniquement modules essentiels :

```javascript
// Au lieu de copier tout node_modules
// Copier seulement modules critiques
const criticalModules = [
  'next',
  'react',
  'react-dom',
  '@prisma/client',
  '.prisma/client',
  // ... autres modules essentiels
];
```

#### B. Utiliser build portable (contournement)

Utiliser target `portable` qui évite problèmes ENAMETOOLONG :

```yaml
win:
  target:
    - target: portable
      arch:
        - x64
```

#### C. Exclure plus de fichiers dans electron-builder.config.yml

Ajouter exclusions agressives :

```yaml
files:
  - "!**/node_modules/**/*.md"
  - "!**/node_modules/**/test/**"
  - "!**/node_modules/**/tests/**"
  - "!**/node_modules/**/__tests__/**"
  - "!**/node_modules/**/*.test.js"
  - "!**/node_modules/**/*.spec.js"
```

---

### Solution 2 : DIAGNOSTIQUER ÉCRAN NOIR

**Actions immédiates** :

#### A. Vérifier logs serveur Next.js

```powershell
# Vérifier logs Electron
Get-Content "$env:APPDATA\atelier-velo-plus\logs\*.log" -Tail 50
```

#### B. Tester serveur manuellement

```powershell
cd "dist-electron\win-unpacked\resources\web"
node server.js
```

#### C. Vérifier symlink

```powershell
# Vérifier que symlink fonctionne
cd "dist-electron\win-unpacked\resources\web"
Test-Path "node_modules"
Get-Item "node_modules" | Select-Object LinkType, Target
```

---

### Solution 3 : CORRIGER ICÔNE

#### A. Vérifier intégration icône

```powershell
# Vérifier que icône est dans l'exe
$exe = "dist-electron\win-unpacked\Atelier Velo+.exe"
# Utiliser ResourceHacker ou similaire pour vérifier
```

#### B. Forcer re-build avec icône

```yaml
# electron-builder.config.yml
win:
  icon: resources/icon.ico  # Chemin relatif depuis buildResources
  # OU chemin absolu
  # icon: C:/atelier/resources/icon.ico
```

#### C. Nettoyer cache Windows

```powershell
# Nettoyer cache icônes Windows
Remove-Item "$env:LOCALAPPDATA\IconCache.db" -Force -ErrorAction SilentlyContinue
ie4uinit.exe -show
```

---

## 📋 PLAN D'ACTION IMMÉDIAT

### Étape 1 : Diagnostiquer Écran Noir (30 min)

1. ✅ Vérifier logs Electron
2. ✅ Tester serveur Next.js manuellement
3. ✅ Vérifier symlink node_modules
4. ✅ Vérifier modules critiques

### Étape 2 : Corriger Build ENAMETOOLONG (1h)

1. ⚠️ Réduire fichiers copiés
2. ⚠️ OU utiliser build portable
3. ⚠️ OU améliorer exclusions

### Étape 3 : Re-build avec corrections (30 min)

1. ⚠️ Nettoyer dist-electron
2. ⚠️ Relancer prebuild
3. ⚠️ Relancer build Electron

### Étape 4 : Vérifier Icône (15 min)

1. ⚠️ Vérifier intégration
2. ⚠️ Nettoyer cache Windows si besoin
3. ⚠️ Tester visuellement

---

## 🎯 SOLUTION RAPIDE (RECOMMANDÉE)

### Option 1 : Build Portable (Contournement ENAMETOOLONG)

```powershell
# Modifier temporairement electron-builder.config.yml
# win:
#   target:
#     - target: portable

npx electron-builder --win portable --config electron-builder.config.yml
```

**Avantages** :
- ✅ Contourne problème ENAMETOOLONG
- ✅ Build plus rapide
- ✅ Exécutable auto-extractible

**Inconvénients** :
- ⚠️ Pas d'installateur NSIS
- ⚠️ Décompression au premier lancement

### Option 2 : Réduire Taille npm_modules

Copier uniquement modules essentiels au lieu de tout `node_modules`.

---

## 📊 STATUT ACTUEL

### Build Unpacked

- ✅ Exécutable créé : `dist-electron\win-unpacked\Atelier Velo+.exe` (201 MB)
- ⚠️ Build incomplet (ENAMETOOLONG)
- ⚠️ Structure peut être corrompue

### Structure Ressources

- ✅ `resources\web\.next\server` : 537 fichiers
- ✅ `resources\web\npm_modules` : 109,537 fichiers
- ✅ `resources\web\node_modules` : symlink présent
- ✅ `resources\web\public` : 15 fichiers
- ✅ `resources\web\server.js` : 1.02 KB

### Icône

- ✅ Source : `resources\icon.ico` (278.79 KB)
- ❌ Intégration : Non vérifiée (build incomplet)
- ⚠️ Visible : Non (cache Windows ou non intégrée)

---

**Créé** : 29 novembre 2025  
**Prochaine action** : Diagnostiquer écran noir puis corriger build
