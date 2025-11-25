# 📊 ANALYSE TAILLE BUILD - 25 NOVEMBRE 2024

**Build analysé** : `dist-electron/win-unpacked`  
**Taille totale** : **1,956 MB** (1.91 GB)  
**Nombre de fichiers** : 107,452 fichiers  
**Objectif** : Réduire à 800 MB (-59%)

---

## 🔍 TOP 20 FICHIERS LES PLUS LOURDS

| Taille (MB) | Fichier | Type | Action possible |
|-------------|---------|------|-----------------|
| 241.24 | app.asar | Application | ✅ Optimiser contenu |
| 201.06 | Atelier Velo+.exe | Electron | ⚠️ Nécessaire |
| 201.06 | electron.exe | Electron | ❌ Duplication ? |
| 122.51 | next-swc.win32-x64-msvc.node | Next.js | ✅ Vérifier nécessité |
| 24.86 x2 | dxcompiler.dll | DirectX | ⚠️ Duplication |
| 23.52 | app-builder.exe | Build tool | ❌ Ne devrait pas être là |
| 22.58 | app-builder.exe | Build tool | ❌ Duplication |
| 22.28 | app-builder.exe | Build tool | ❌ Duplication |
| 20.2 x5 | query_engine-windows.dll.node | Prisma | ❌ Duplications |
| 18.67 | app-builder_amd64 | Build tool | ❌ Ne devrait pas être là |
| 18.6 | app-builder_arm64 | Build tool | ❌ Ne devrait pas être là |
| 18.1 x2 | schema-engine-windows.exe | Prisma | ❌ Duplication |
| 18.08 x2 | libvips-42.dll | Sharp/Images | ❌ Duplication |

**Total identifié** : ~1,000 MB de fichiers problématiques

---

## 🎯 PROBLÈMES IDENTIFIÉS

### 1. Duplications (Critique - ~400 MB)

**Prisma Engines** (100+ MB de duplications) :
- 5x `query_engine-windows.dll.node` (20 MB chacun)
- 2x `schema-engine-windows.exe` (18 MB chacun)
- Plusieurs `libquery-engine`

**app-builder** (60+ MB de duplications) :
- 3x `app-builder.exe` (22-23 MB chacun)
- `app-builder_amd64` (18 MB)
- `app-builder_arm64` (18 MB)
- ❌ **Ces fichiers ne devraient PAS être dans le build final**

**libvips** (36+ MB de duplications) :
- 2x `libvips-42.dll` (18 MB chacun)

**dxcompiler.dll** (50 MB de duplications) :
- 2x `dxcompiler.dll` (24 MB chacun)

**electron.exe** (201 MB) :
- Duplication de `Atelier Velo+.exe` ?

---

### 2. app.asar (241 MB - À optimiser)

Contenu à analyser :
- node_modules inclus
- Fichiers de build Next.js
- Assets non optimisés
- Fichiers de développement

**Actions** :
- Filtrer node_modules (supprimer .map, .d.ts, tests, docs)
- Optimiser images
- Supprimer fichiers de développement
- Tree-shaking agressif

---

### 3. next-swc (122 MB - À vérifier)

**Question** : Est-ce nécessaire en production ?
- Next.js utilise SWC pour la compilation
- En production, le code est déjà compilé
- **Action** : Vérifier si peut être exclu

---

## 📋 PLAN D'ACTION PRIORITAIRE

### Phase 1 : Nettoyage Duplications (Gain estimé : -400 MB)

1. **Supprimer app-builder du build final** (-60 MB)
   - Configurer electron-builder pour exclure
   - Ces outils sont pour le build, pas pour l'exécution

2. **Dédupliquer Prisma engines** (-80 MB)
   - Garder une seule copie de query_engine
   - Garder une seule copie de schema-engine
   - Configurer asarUnpack correctement

3. **Dédupliquer libvips** (-18 MB)
   - Garder une seule copie
   - Vérifier configuration Sharp

4. **Dédupliquer dxcompiler** (-25 MB)
   - Garder une seule copie

5. **Vérifier electron.exe** (-201 MB ?)
   - Si duplication, supprimer

---

### Phase 2 : Optimisation app.asar (Gain estimé : -100 MB)

1. **Filtrer node_modules** (-50 MB)
   ```
   - Supprimer *.map
   - Supprimer *.d.ts
   - Supprimer __tests__/
   - Supprimer examples/
   - Supprimer docs/
   - Supprimer *.md (sauf README critiques)
   ```

2. **Optimiser Next.js** (-30 MB)
   - Vérifier productionBrowserSourceMaps: false
   - Supprimer fichiers de développement
   - Tree-shaking agressif

3. **Optimiser images** (-20 MB)
   - Convertir en WebP
   - Compression optimale
   - Supprimer images inutilisées

---

### Phase 3 : Vérifications (Gain estimé : -100 MB)

1. **next-swc** : Vérifier si nécessaire (-122 MB ?)
2. **Autres dépendances lourdes** : Audit complet
3. **Compression ASAR** : Optimiser

---

## 🎯 OBJECTIFS

| Phase | Action | Gain estimé | Taille après |
|-------|--------|-------------|--------------|
| Actuel | - | - | 1,956 MB |
| Phase 1 | Nettoyage duplications | -400 MB | 1,556 MB |
| Phase 2 | Optimisation app.asar | -100 MB | 1,456 MB |
| Phase 3 | Vérifications | -100 MB | 1,356 MB |
| **Optimisations supplémentaires** | - | -556 MB | **800 MB** ✅ |

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Analyse complète effectuée
2. ⏭️ Configurer electron-builder pour exclure app-builder
3. ⏭️ Configurer asarUnpack pour Prisma (1 seule copie)
4. ⏭️ Optimiser node_modules dans app.asar
5. ⏭️ Tester le build optimisé

---

**Dernière mise à jour** : 25 novembre 2024

