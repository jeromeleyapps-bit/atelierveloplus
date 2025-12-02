# Procédure de Build Electron - Atelier Vélo+

**Date de création** : 2 décembre 2025  
**Application** : Atelier Vélo+  
**Stack** : Electron + Next.js + Prisma

---

## 📋 Vue d'ensemble

Cette procédure décrit le processus complet de build pour l'application Electron **Atelier Vélo+**, incluant les étapes de prebuild, la configuration, et les scripts utilisés.

---

## 🔧 Fichiers impliqués

### 1. Script principal de build

**Fichier** : `build-avec-verification-complete.ps1`

Ce script PowerShell orchestre l'ensemble du processus de build en 5 étapes principales :

1. **Vérifications pré-build** (`scripts\verification-build-complete.ps1 -PreBuild`)
2. **Build Next.js** (`npm run build`)
3. **Prebuild** (`node prepare-build-optimized.js`)
4. **Vérifications post-build** (`scripts\verification-build-complete.ps1 -PostBuild`)
5. **Build Electron** (`npx electron-builder --config electron-builder.config.yml --win --x64 --dir`)

**Caractéristiques** :
- Logging complet avec timestamps
- Gestion des erreurs détaillée
- Génération de logs séparés pour chaque étape
- Détection automatique d'erreurs (ENAMETOOLONG, etc.)

### 2. Script de prebuild

**Fichier** : `prepare-build-optimized.js`

Ce script JavaScript (Node.js) prépare les ressources avant le build Electron. Il s'exécute automatiquement après le build Next.js via le hook `postbuild` dans `package.json`.

**Actions effectuées** :

1. **Génération schema.sql** : Génère le schéma SQL Prisma depuis `prisma/schema.prisma`
2. **Vérifications pré-build** : Vérifie la présence de `.next/`, fichiers critiques, etc.
3. **Nettoyage** : Supprime `electron-resources/web` s'il existe
4. **Copie .next/** : Copie le build Next.js vers `electron-resources/web/.next/`
5. **Copie clé publique RSA** : Copie `src/lib/license-rsa-public.pem`
6. **Copie fichiers statiques** : Copie `public/` et `.env.production`
7. **Copie node_modules** : Copie `node_modules` complet vers `electron-resources/web/npm_modules`
8. **Création server.js** : Crée un serveur Next.js minimal pour Electron
9. **Renommage** : Renomme `node_modules` → `npm_modules` (contourne l'ignore electron-builder)

**Structure créée** :
```
electron-resources/
  ├── web/
  │   ├── .next/
  │   ├── npm_modules/ (renommé depuis node_modules)
  │   ├── public/
  │   ├── src/
  │   │   └── lib/
  │   │       └── license-rsa-public.pem
  │   ├── server.js
  │   ├── package.json
  │   └── .env.production
  └── schema.sql
```

### 3. Configuration electron-builder

**Fichier** : `electron-builder.config.yml`

Configuration YAML pour `electron-builder` qui définit :

- **Packaging** : ASAR activé pour le code Electron, extraResources pour la web app
- **Plateforme** : Windows x64 uniquement
- **Cibles** : NSIS (installateur) configuré, portable disponible mais échoue
- **Ressources** : Icône, locales (fr, en), compression store
- **Signature** : Désactivée (évite ENAMETOOLONG)

**Points clés** :
- Code Electron dans ASAR (sécurité)
- Web app dans extraResources (accès filesystem requis)
- Binaires Prisma unpacked (`.node` fichiers)
- Signature désactivée (`forceCodeSigning: false` + `CSC_IDENTITY_AUTO_DISCOVERY=false`)

### 4. Scripts npm (package.json)

**Scripts de build** :

```json
{
  "prebuild": "npx prisma generate",
  "build": "npx cross-env NODE_ENV=production next build",
  "postbuild": "node prepare-build-optimized.js",
  "prebuild:electron": "node -e \"console.log('Prebuild: Skipping cleanup on CI')\" || powershell -ExecutionPolicy Bypass -File ./prebuild-cleanup.ps1",
  "build:electron": "npm run prebuild:electron && electron-builder -c electron-builder.config.yml"
}
```

**Séquence automatique** :
1. `npm run build` → exécute `prebuild` (Prisma), puis `build` (Next.js), puis `postbuild` (prebuild optimisé)
2. `npm run build:electron` → exécute `prebuild:electron` (nettoyage), puis `electron-builder`

---

## 🚀 Procédure de build complète

### Étape 1 : Prérequis

Assurez-vous d'avoir :
- Node.js 20.x installé
- PowerShell avec exécution de scripts activée
- `.env.production` présent à la racine
- Toutes les dépendances installées (`npm install`)

### Étape 2 : Lancement du build

**Méthode recommandée** : Utiliser le script PowerShell complet

```powershell
.\build-avec-verification-complete.ps1
```

Ce script effectue automatiquement :
1. ✅ Vérifications pré-build (fichiers manquants, dépendances, etc.)
2. ✅ Build Next.js avec Prisma generation
3. ✅ Prebuild optimisé (copie ressources, création structure)
4. ✅ Vérifications post-build
5. ✅ Build Electron unpacked

**Alternative** : Build manuel étape par étape

```powershell
# 1. Générer Prisma client
npx prisma generate

# 2. Build Next.js
npm run build
# (postbuild s'exécute automatiquement)

# 3. Build Electron unpacked
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64 --dir
```

### Étape 3 : Résultat

**Build unpacked (réussi)** :
- **Emplacement** : `dist-electron/win-unpacked/`
- **Exécutable** : `dist-electron/win-unpacked/Atelier Velo+.exe`
- **Status** : ✅ **Fonctionnel**

**Build portable (échec)** :
- **Commande tentée** : `npx electron-builder --config electron-builder.config.yml --win portable`
- **Status** : ❌ **Échoue** (erreur non documentée dans les logs)

---

## 📁 Structure des fichiers générés

### Avant le build

```
atelier/
├── .next/                    # Build Next.js (à générer)
├── node_modules/             # Dépendances complètes
├── electron-resources/       # (sera créé par prebuild)
└── dist-electron/            # (sera créé par electron-builder)
```

### Après le build

```
atelier/
├── .next/                    # Build Next.js généré
├── electron-resources/
│   ├── web/                  # Structure complète pour Electron
│   │   ├── .next/
│   │   ├── npm_modules/
│   │   ├── server.js
│   │   └── ...
│   └── schema.sql
└── dist-electron/
    └── win-unpacked/         # Build Electron unpacked
        ├── Atelier Velo+.exe
        ├── resources/
        │   ├── app.asar      # Code Electron (packagé)
        │   └── web/          # Web app (extraResources)
        └── ...
```

---

## 🔍 Détails techniques

### Configuration ASAR

- **Code Electron** : Dans `app.asar` (protégé, non modifiable)
- **Web app** : Dans `resources/web/` (accessible, modifiable)
- **Binaires** : Unpacked depuis ASAR (`.node` fichiers Prisma, better-sqlite3)

### Gestion des erreurs

**ENAMETOOLONG** (corrigé) :
- **Cause** : Trop de fichiers lors de la signature de code
- **Solution** : Signature désactivée (`CSC_IDENTITY_AUTO_DISCOVERY=false`)

**Build portable** :
- **Status** : ❌ Échoue actuellement
- **Build unpacked** : ✅ Fonctionne correctement

### Variables d'environnement

**Critiques pour le build** :
- `CSC_IDENTITY_AUTO_DISCOVERY=false` : Désactive la signature (évite ENAMETOOLONG)
- `NODE_ENV=production` : Mode production pour Next.js

---

## 📊 Logs générés

Le script `build-avec-verification-complete.ps1` génère plusieurs fichiers de logs :

1. **`build-complet-{timestamp}.log`** : Log principal du script
2. **`build-nextjs-{timestamp}.log`** : Sortie du build Next.js
3. **`build-prebuild-{timestamp}.log`** : Sortie du script prebuild
4. **`build-electron-{timestamp}.log`** : Sortie du build Electron
5. **`logs-verification/`** : Logs des vérifications pré/post-build

---

## ⚠️ Problèmes connus

### 1. Build portable échoue

**Symptôme** : Le build portable (`.exe` portable) échoue lors de la création.

**Status** : ❌ Non résolu  
**Workaround** : Utiliser le build unpacked (`--dir`) qui fonctionne correctement.

**Commande échouée** :
```powershell
npx electron-builder --config electron-builder.config.yml --win portable
```

### 2. Signature de code désactivée

**Raison** : Évite l'erreur `ENAMETOOLONG` due au nombre élevé de fichiers.

**Impact** : Windows Defender peut afficher des avertissements lors du premier lancement.

**Solution alternative** : Réduire le nombre de fichiers inclus dans le build (non implémenté).

---

## 🔄 Workflow de développement

1. **Modification du code** → Développement normal
2. **Build Next.js** → `npm run build` (teste le build web)
3. **Build Electron** → `.\build-avec-verification-complete.ps1` (build complet)
4. **Test** → Lancer `dist-electron/win-unpacked/Atelier Velo+.exe`

---

## 📝 Notes importantes

1. **Prebuild obligatoire** : Le script `prepare-build-optimized.js` doit s'exécuter avant `electron-builder` pour créer la structure `electron-resources/web/`

2. **node_modules complet** : Le prebuild copie `node_modules` complet (pas de liste blanche) pour garantir le fonctionnement

3. **Renommage npm_modules** : Le prebuild renomme `node_modules` → `npm_modules` pour contourner l'ignore de `electron-builder`

4. **.env.production** : Doit être présent et copié explicitement (pas dans standalone Next.js)

5. **BUILD_ID** : Le prebuild crée `BUILD_ID` dans `.next/` si manquant (requis par Next.js 14+)

---

## ✅ Checklist de build

Avant de lancer le build, vérifier :

- [ ] `.env.production` existe à la racine
- [ ] `prisma/schema.prisma` est à jour
- [ ] Toutes les dépendances installées (`npm install`)
- [ ] Pas d'erreurs ESLint bloquantes
- [ ] Variables d'environnement correctes
- [ ] Suffisamment d'espace disque (~2 GB recommandés)

---

## 🎯 Résultat final

**✅ Build unpacked** : Fonctionnel et testé  
**❌ Build portable** : Échec (à investiguer)

L'application est utilisable via le build unpacked dans `dist-electron/win-unpacked/`.

---

**Dernière mise à jour** : 2 décembre 2025
