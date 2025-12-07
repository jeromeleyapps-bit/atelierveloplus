# 🔧 PLAN COMPLET - SOLUTION ASAR TOTALE

**Date** : 7 décembre 2025  
**Objectif** : Résoudre ENAMETOOLONG en mettant TOUT dans ASAR  
**Statut** : 📋 PLAN DÉTAILLÉ RÉVISÉ

---

## 📊 ANALYSE SITUATION ACTUELLE

### Problème Identifié
```
npm_modules seul : 255 523 caractères (7.8x limite)
.next/ seul      : 47 462 caractères (1.4x limite)
TOTAL            : 302 985 caractères (9.2x limite)
Limite Windows   : 32 767 caractères
```

### DÉCOUVERTE CRITIQUE
Même en mettant npm_modules dans ASAR, `.next/` seul dépasse encore la limite !
→ **Solution : Mettre TOUT dans ASAR** (npm_modules + .next/ + server.js)

### Architecture Actuelle
```
dist-electron/win-unpacked/
├── Atelier Velo+.exe
├── resources/
│   ├── app.asar              ← Code Electron (electron/*)
│   ├── app.asar.unpacked/    ← Binaires natifs (.node)
│   ├── web/                  ← HORS ASAR (extraResources)
│   │   ├── .next/            ← Build Next.js
│   │   ├── npm_modules/      ← 2379 fichiers (PROBLÈME!)
│   │   ├── server.js         ← Serveur Next.js
│   │   └── .env.production
│   └── icon.ico
```

### Pourquoi ENAMETOOLONG Persiste
- `extraResources` copie TOUS les fichiers individuellement
- `app-builder.exe` reçoit la liste de TOUS les chemins en ligne de commande
- 2379 fichiers × 106 chars/chemin = 252 000+ caractères > 32 767 limite

---

## 🎯 SOLUTION PROPOSÉE

### Nouvelle Architecture (ASAR TOTALE)
```
dist-electron/win-unpacked/
├── Atelier Velo+.exe
├── resources/
│   ├── app.asar              ← TOUT: electron/ + web/ (.next/, npm_modules, server.js)
│   ├── app.asar.unpacked/    ← Binaires natifs (.node, Prisma engine, sharp)
│   ├── icon.ico              ← Icône (1 fichier)
│   └── .env.production       ← Secrets (1 fichier, hors ASAR pour sécurité)
```

### Principe
1. **TOUT le code** → Dans `app.asar` (1 fichier)
2. **Binaires natifs** (.node) → Dans `app.asar.unpacked` (auto-détecté)
3. **.env.production** → Seul fichier dans `extraResources`
4. **icon.ico** → Dans `extraResources` pour BrowserWindow

### Fichiers Hors ASAR (Estimation)
```
app.asar           : 1 fichier
app.asar.unpacked/ : ~20 fichiers (.node binaires)
icon.ico           : 1 fichier
.env.production    : 1 fichier
TOTAL              : ~23 fichiers × 100 chars = 2300 caractères ✅
```

---

## ⚠️ PRÉREQUIS ET CONTRAINTES

### Contraintes Electron ASAR
| Contrainte | Impact | Solution |
|------------|--------|----------|
| **Read-only** | Fichiers ne peuvent pas être modifiés | ✅ OK (pas de modification runtime) |
| **Pas de cwd** | Impossible de changer le working directory | ⚠️ Spawn avec cwd vers userData |
| **Binaires .node** | Doivent être unpacked | ✅ asarUnpack automatique |
| **child_process.spawn** | Fonctionne si script dans ASAR | ✅ Electron supporte spawn depuis ASAR |
| **fs.readdir** | Fonctionne dans ASAR | ✅ OK pour Next.js et require() |

### Contraintes Next.js (CRITIQUES)
| Contrainte | Impact | Solution |
|------------|--------|----------|
| **.next/ lisible** | fs.readdir sur server/ | ✅ Fonctionne dans ASAR |
| **require() modules** | Doit trouver npm_modules | ✅ Chemin ASAR dans NODE_PATH |
| **server.js spawn** | Doit être exécutable | ✅ Spawn avec ELECTRON_RUN_AS_NODE |
| **Écriture cache** | Next.js peut vouloir écrire | ⚠️ Rediriger vers userData |

### Contraintes Prisma
| Contrainte | Impact | Solution |
|------------|--------|----------|
| **Query engine .node** | Binaire natif | ✅ asarUnpack automatique |
| **.prisma/client** | Doit être accessible | ✅ Dans ASAR, engine unpacked |
| **@prisma/client** | require() standard | ✅ Chemin ASAR dans NODE_PATH |

### Risques Identifiés
| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Next.js écrit dans .next/ | Moyenne | Crash | Rediriger vers userData |
| Prisma engine non trouvé | Faible | Crash | Variables env explicites |
| Chemins trop longs dans ASAR | Faible | Build fail | Tester avant commit |
| Performance dégradée | Faible | Lenteur | Benchmark avant/après |

---

## 📋 PLAN D'IMPLÉMENTATION

### Phase 1 : Sauvegarde (OBLIGATOIRE)
```powershell
# Créer backup complet
git stash
git checkout -b backup-before-asar-solution
git add -A
git commit -m "backup: avant solution ASAR npm_modules"
git checkout main
```

### Phase 2 : Modifier prepare-build-optimized.js

**Changement** : Copier TOUT dans `electron/web/` au lieu de `electron-resources/web/`

```javascript
// NOUVELLE DESTINATION: electron/web/ (sera inclus dans ASAR)
const PATHS = {
  // ...
  resources: path.join(__dirname, 'electron', 'web'),  // ← CHANGÉ
};
```

**Modifications requises** :
1. Changer `PATHS.resources` vers `electron/web/`
2. Garder le renommage `node_modules → npm_modules`
3. Supprimer la copie vers `electron-resources/` (plus utilisé)

### Phase 3 : Modifier electron-builder.config.yml

```yaml
# ============================================================================
# FICHIERS INCLUS DANS ASAR (TOUT le code)
# ============================================================================
files:
  - package.json
  - electron/**/*           # Code Electron + web/ (NOUVEAU)
  - "!electron/**/*.md"
  
  # Exclusions dev
  - "!**/node_modules/@sentry/cli-win32-x64/**/*"
  - "!**/node_modules/app-builder-bin/**/*"
  # ... autres exclusions ...

# ============================================================================
# ASAR ACTIVÉ - TOUT LE CODE DEDANS
# ============================================================================
asar: true
asarUnpack:
  # Binaires natifs DOIVENT être unpacked
  - "**/npm_modules/.prisma/client/*.node"
  - "**/npm_modules/@prisma/client/runtime/*.node"
  - "**/npm_modules/sharp/**/*.node"
  - "**/npm_modules/@img/**/*.node"
  - "**/*.node"

# ============================================================================
# RESSOURCES HORS ASAR (MINIMAL)
# ============================================================================
extraResources:
  # SEULEMENT les fichiers qui NE PEUVENT PAS être dans ASAR
  - from: .env.production
    to: .env.production
  - from: resources/icon.ico
    to: icon.ico
```

### Phase 4 : Modifier electron/main.js

**Changements majeurs** :

```javascript
// ============================================================================
// NOUVEAU: Chemins pour mode ASAR
// ============================================================================
function getWebPath() {
  if (app.isPackaged) {
    // En mode packagé, web/ est dans app.asar
    return path.join(app.getAppPath(), 'web');
  }
  // En dev, utiliser le dossier standalone
  return path.join(__dirname, '..', '.next', 'standalone');
}

function getNpmModulesPath() {
  if (app.isPackaged) {
    // npm_modules dans ASAR (auto-résolu par Electron)
    return path.join(app.getAppPath(), 'web', 'npm_modules');
  }
  return path.join(__dirname, '..', 'node_modules');
}

// ============================================================================
// SUPPRIMER: ensureNodeModulesSymlink() (plus nécessaire)
// ============================================================================
// Electron résout automatiquement les chemins dans ASAR
// Pas besoin de symlink

// ============================================================================
// MODIFIER: startStandaloneServer()
// ============================================================================
async function startStandaloneServer() {
  const webPath = getWebPath();
  const serverPath = path.join(webPath, 'server.js');
  
  // Vérifier existence (fonctionne dans ASAR)
  if (!fs.existsSync(serverPath)) {
    log.error('[NEXT] server.js non trouvé:', serverPath);
    return;
  }
  
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    NODE_ENV: 'production',
    // Chemin vers npm_modules dans ASAR
    NODE_PATH: getNpmModulesPath(),
    // Prisma engine (unpacked)
    PRISMA_QUERY_ENGINE_LIBRARY: findPrismaEngine(),
    // .env.production est dans extraResources
    // Charger manuellement si nécessaire
  };
  
  // Spawn fonctionne avec scripts dans ASAR
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: app.getPath('userData'),  // CWD vers userData (writable)
    env
  });
}

// ============================================================================
// NOUVEAU: Trouver Prisma engine (unpacked)
// ============================================================================
function findPrismaEngine() {
  const unpackedPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'web',
    'npm_modules',
    '.prisma',
    'client'
  );
  
  try {
    const files = fs.readdirSync(unpackedPath);
    const engine = files.find(f => f.endsWith('.node'));
    if (engine) {
      return path.join(unpackedPath, engine);
    }
  } catch (e) {
    log.error('[PRISMA] Engine non trouvé:', e.message);
  }
  return null;
}
```

### Phase 5 : Adapter server.js pour ASAR

Le server.js généré par Next.js standalone devrait fonctionner tel quel car :
- `require()` fonctionne dans ASAR
- `fs.readdir()` fonctionne dans ASAR
- Les chemins sont résolus automatiquement

**Vérification** : Si Next.js tente d'écrire dans `.next/cache/`, il faudra rediriger :

```javascript
// AU DÉBUT de server.js
if (process.env.NEXT_CACHE_DIR) {
  // Rediriger le cache vers userData
  process.env.NEXT_CACHE_DIR = process.env.USER_DATA_PATH 
    ? path.join(process.env.USER_DATA_PATH, 'next-cache')
    : undefined;
}
```

---

## 🧪 PLAN DE TESTS DÉTAILLÉ

### Test 1 : Build Next.js Standalone
```powershell
npm run build
```
**Vérifications** :
- [ ] `.next/standalone/` créé
- [ ] `.next/standalone/node_modules/` présent (~2000 fichiers)
- [ ] `.next/standalone/server.js` présent
- [ ] Pas d'erreur TypeScript

### Test 2 : Prebuild (Copie vers electron/web/)
```powershell
node prepare-build-optimized.js
```
**Vérifications** :
- [ ] `electron/web/` créé
- [ ] `electron/web/.next/` présent
- [ ] `electron/web/npm_modules/` présent
- [ ] `electron/web/server.js` présent
- [ ] `electron-resources/` NON utilisé (ou vide)

### Test 3 : Build Electron Unpacked
```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64 --dir
```
**Vérifications** :
- [ ] ✅ Pas d'erreur ENAMETOOLONG
- [ ] `dist-electron/win-unpacked/resources/app.asar` créé
- [ ] `dist-electron/win-unpacked/resources/app.asar.unpacked/` contient .node files
- [ ] Taille app.asar raisonnable (~50-100 MB)

### Test 4 : Vérifier Contenu ASAR
```powershell
# Installer asar si nécessaire
npm install -g asar

# Lister contenu
npx asar list dist-electron/win-unpacked/resources/app.asar | Select-String "web"

# Vérifier npm_modules
npx asar list dist-electron/win-unpacked/resources/app.asar | Select-String "npm_modules" | Measure-Object
```
**Vérifications** :
- [ ] `web/` présent dans ASAR
- [ ] `web/.next/` présent dans ASAR
- [ ] `web/npm_modules/` présent dans ASAR
- [ ] `web/server.js` présent dans ASAR

### Test 5 : Vérifier Binaires Unpacked
```powershell
Get-ChildItem "dist-electron/win-unpacked/resources/app.asar.unpacked" -Recurse -Filter "*.node" | Select-Object FullName
```
**Vérifications** :
- [ ] Prisma query engine `.node` présent
- [ ] Sharp binaires `.node` présents (si utilisé)
- [ ] Pas de fichiers JS/TS (seulement binaires)

### Test 6 : Lancement Application
```powershell
Start-Process "dist-electron\win-unpacked\Atelier Velo+.exe"
Start-Sleep -Seconds 15
Get-Content "$env:APPDATA\Atelier Velo+\logs\production.log" -Tail 50
```
**Vérifications** :
- [ ] Application démarre sans crash
- [ ] Pas d'erreur "Cannot find module"
- [ ] Serveur Next.js démarre (port 3000)
- [ ] Prisma se connecte à la DB
- [ ] Interface utilisateur s'affiche

### Test 7 : Test Fonctionnel Complet
```
1. Ouvrir l'application
2. Se connecter (ou créer compte)
3. Naviguer vers Dashboard
4. Créer un client
5. Créer un ordre de travail
6. Générer une facture PDF
```
**Vérifications** :
- [ ] Toutes les pages chargent
- [ ] API fonctionne (création données)
- [ ] Prisma fonctionne (lecture/écriture DB)
- [ ] PDF génère correctement

### Test 8 : Build NSIS Installer
```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64
```
**Vérifications** :
- [ ] ✅ Pas d'erreur ENAMETOOLONG
- [ ] `dist-electron/Atelier Velo+-1.0.17-Setup.exe` créé
- [ ] Taille installer raisonnable (~150-250 MB)

### Test 9 : Installation et Test Final
```powershell
# Installer
Start-Process "dist-electron\Atelier Velo+-1.0.17-Setup.exe" -Wait

# Lancer depuis Program Files
Start-Process "$env:LOCALAPPDATA\Programs\Atelier Velo+\Atelier Velo+.exe"
```
**Vérifications** :
- [ ] Installation réussie
- [ ] Application démarre depuis Program Files
- [ ] Toutes fonctionnalités OK

---

## 🔄 PROCÉDURE DE ROLLBACK

### Si Échec Phase 2-5 (Code)
```powershell
git checkout -- prepare-build-optimized.js
git checkout -- electron-builder.config.yml
git checkout -- electron/main.js
```

### Si Échec Build
```powershell
# Restaurer backup complet
git stash pop
# OU
git checkout backup-before-asar-solution
git checkout -b main-restored
```

### Si Échec Runtime
```powershell
# Revenir à la solution ZIP
git checkout main
npm run build
node prepare-build-optimized.js
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --config electron-builder.config.yml --win --x64 --dir
node post-build-icon.js
Compress-Archive -Path "dist-electron\win-unpacked\*" -DestinationPath "dist-electron\Atelier-Velo-Plus-1.0.17-win-x64.zip" -Force
```

---

## 📊 ESTIMATION RÉSULTATS

### Avant (Actuel - extraResources)
| Métrique | Valeur |
|----------|--------|
| Fichiers hors ASAR | 2 929 |
| Longueur ligne commande | 255 523 chars |
| Limite Windows | 32 767 chars |
| Dépassement | **7.8x** |
| Build NSIS | ❌ ENAMETOOLONG |

### Après (Solution ASAR TOTALE)
| Métrique | Valeur Estimée |
|----------|----------------|
| Fichiers hors ASAR | **~25** (app.asar + unpacked + env + icon) |
| Fichiers dans ASAR | ~3000 (tout le code) |
| Longueur ligne commande | **~2 500 chars** |
| Limite Windows | 32 767 chars |
| Marge | **13x sous la limite** ✅ |
| Build NSIS | ✅ **DEVRAIT FONCTIONNER** |

### Calcul Détaillé
```
Fichiers hors ASAR:
- app.asar                    : 1 fichier
- app.asar.unpacked/*.node    : ~20 fichiers (binaires)
- .env.production             : 1 fichier
- icon.ico                    : 1 fichier
TOTAL                         : ~23 fichiers

Longueur estimée:
23 fichiers × 100 chars/chemin = 2 300 caractères
+ marge sécurité              = 2 500 caractères

Limite Windows: 32 767 caractères
Marge: 32 767 / 2 500 = 13x ✅
```

### Avantages Supplémentaires
| Avantage | Impact |
|----------|--------|
| **Sécurité** | Code protégé dans ASAR (non lisible directement) |
| **Performance** | Lecture ASAR plus rapide que filesystem |
| **Taille** | ASAR compressé (~30% plus petit) |
| **Simplicité** | Plus de symlink node_modules |

---

## ⏱️ ESTIMATION TEMPS

| Phase | Durée Estimée |
|-------|---------------|
| Phase 1 : Sauvegarde | 2 min |
| Phase 2 : prepare-build-optimized.js | 15 min |
| Phase 3 : electron-builder.config.yml | 10 min |
| Phase 4 : electron/main.js | 20 min |
| Phase 5 : server.js | 10 min |
| Tests 1-6 | 30 min |
| **TOTAL** | **~90 min** |

---

## ✅ CHECKLIST PRÉ-IMPLÉMENTATION

- [ ] Backup git créé
- [ ] Branche backup-before-asar-solution créée
- [ ] Build actuel fonctionne (unpacked)
- [ ] ZIP distribution créé comme fallback
- [ ] Compréhension complète du plan

---

## 🚀 COMMANDE POUR DÉMARRER

```powershell
# Créer backup
git stash
git checkout -b backup-before-asar-solution
git add -A
git commit -m "backup: avant solution ASAR npm_modules"
git checkout main

# Confirmer prêt
Write-Host "Backup créé. Prêt pour implémentation."
```

---

**IMPORTANT** : Ce plan est réversible à chaque étape. En cas d'échec, le rollback est simple et rapide.
