# MODIFICATIONS FINALES REQUISES - 22 novembre 2025

## 🎯 ÉTAT ACTUEL

Le fichier `electron-builder.config.yml` n'a PAS les modifications nécessaires pour résoudre ENAMETOOLONG.

## ✅ MODIFICATIONS À APPLIQUER

### Fichier : `electron-builder.config.yml`

#### 1. Section `files:` (ligne ~32-40)

**AJOUTER** après `- "!electron/**/*.md"` :

```yaml
  # FIX ENAMETOOLONG: Inclure electron-resources/web dans ASAR
  # Raison: extraResources passe 17,318 fichiers en argument → dépasse limite Windows
  # Solution: ASAR compresse tout en 1 fichier, unpacker seulement binaires natifs
  - electron-resources/web/**/*
```

#### 2. Section `asarUnpack:` (ligne ~62-78)

**REMPLACER** :
```yaml
asarUnpack:
  # Binaires natifs ne peuvent PAS être dans ASAR
  # IMPORTANT: Seulement binaires référencés par electron/ (files:)
  # Sharp/libvips déjà dans web/ (extraResources) - pas besoin d'unpack
  
  # 1. Prisma Query Engine (binaire natif SQLite)
  # Note: Prisma utilisé depuis web/npm_modules (extraResources)
  # Ces patterns matchent si Prisma était dans electron/node_modules
  - "**/*.node"
  - "**/npm_modules/.prisma/**/*"
  - "**/npm_modules/@prisma/client/**/*"
  
  # 2. Better-sqlite3 (si présent dans electron/)
  - "**/npm_modules/better-sqlite3/**/*"
  
  # Sharp/libvips SUPPRIMÉ: Déjà accessible via web/ extraResources
  # Gain: -18 MB (pas de duplication app.asar.unpacked)
```

**PAR** :
```yaml
asarUnpack:
  # Binaires natifs ne peuvent PAS être dans ASAR
  # FIX ENAMETOOLONG: web/ maintenant dans ASAR, unpacker seulement binaires
  
  # 1. Prisma Query Engine (binaire natif SQLite)
  - "**/*.node"
  - "**/electron-resources/web/npm_modules/.prisma/**/*"
  - "**/electron-resources/web/npm_modules/@prisma/client/**/*"
  
  # 2. Sharp/libvips (binaires natifs images)
  - "**/electron-resources/web/npm_modules/sharp/**/*"
  - "**/electron-resources/web/npm_modules/@img/**/*"
  
  # 3. Better-sqlite3 (si présent)
  - "**/electron-resources/web/npm_modules/better-sqlite3/**/*"
```

#### 3. Section `extraResources:` (ligne ~86-170)

**REMPLACER TOUTE LA SECTION** par :
```yaml
extraResources:
  # FIX ENAMETOOLONG: web/ maintenant dans ASAR (pas extraResources)
  # Raison: extraResources passe 17,318 fichiers en argument → dépasse limite Windows
  # Solution: ASAR compresse tout en 1 fichier, unpacker seulement binaires natifs
  
  # 1. SCHEMA SQL (pour initialisation DB)
  - from: electron-resources/schema.sql
    to: schema.sql
```

#### 4. Section `win:` (ligne ~198-203)

**VÉRIFIER** que c'est bien :
```yaml
win:
  target:
    - target: nsis  # Installateur Windows professionnel
      arch:
        - x64
```

#### 5. Section `nsis:` (ligne ~230-260)

**VÉRIFIER** que `useZip: true` est présent :
```yaml
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  allowElevation: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "${productName}"
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  deleteAppDataOnUninstall: false
  differentialPackage: false
  packElevateHelper: false
  useZip: true  # ← DOIT ÊTRE LÀ !
```

## 📋 CHECKLIST VÉRIFICATION

Après modifications, vérifier :

```powershell
# 1. Vérifier files: contient electron-resources/web
Select-String -Path "electron-builder.config.yml" -Pattern "electron-resources/web/\*\*/\*" -Context 1,1

# 2. Vérifier asarUnpack contient electron-resources/web/npm_modules
Select-String -Path "electron-builder.config.yml" -Pattern "electron-resources/web/npm_modules" -Context 0,2

# 3. Vérifier extraResources contient SEULEMENT schema.sql
Select-String -Path "electron-builder.config.yml" -Pattern "extraResources:" -Context 0,10

# 4. Vérifier target: nsis
Select-String -Path "electron-builder.config.yml" -Pattern "target: nsis"

# 5. Vérifier useZip: true
Select-String -Path "electron-builder.config.yml" -Pattern "useZip: true"
```

## 🚀 APRÈS MODIFICATIONS

```powershell
.\build-nsis-log.ps1
```

---

**IMPORTANT** : Toutes ces modifications doivent être faites ENSEMBLE, pas une par une !


