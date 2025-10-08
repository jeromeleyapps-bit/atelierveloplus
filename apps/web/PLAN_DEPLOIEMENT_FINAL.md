# 🎯 Plan de Déploiement Final - Atelier Vélo+

**Date:** 08/10/2025  
**Cible:** Artisans auto-entrepreneurs (usage solo)

---

## 📋 Besoins Confirmés

- ✅ **Offline-first** : Tout fonctionne hors ligne (sauf RDV clients)
- ✅ **Mono-utilisateur** : 1 seul utilisateur par installation
- ✅ **Coût zéro** : Budget minimal ou gratuit
- ✅ **Installation simple** : Fonctionnel immédiatement après install
- ✅ **100+ déploiements** : Chaque atelier = installation indépendante

---

## 🏆 Architecture Retenue

### **Solution: Desktop Electron + SQLite**

```
AtelierVelo.exe (Application Desktop)
├─ Interface React (Next.js actuel réutilisé)
├─ SQLite local (./data/atelier.db) → 100% offline
├─ Serveur Next.js embarqué (standalone mode)
└─ Module RDV optionnel
   └─ Cloudflare Tunnel (si internet disponible)
```

### Stack Technique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Runtime** | Electron | Doc complète, communauté, réutilise code actuel |
| **Database** | SQLite | 0€, offline, rapide (<1ms), fichier portable |
| **Frontend** | Next.js actuel | 95% du code inchangé |
| **RDV clients** | Cloudflare Tunnel | Gratuit, déjà implémenté |
| **Distribution** | GitHub Releases | Gratuit, illimité |
| **Auto-update** | electron-updater | Gratuit, automatique |

---

## 💰 Coûts

| Poste | Montant |
|-------|---------|
| Base de données (SQLite) | **0€** |
| Hébergement | **0€** (local) |
| Distribution (GitHub) | **0€** |
| Cloudflare Tunnel | **0€** |
| Certificat code signing | **0€** (optionnel*) |
| **TOTAL** | **0€** |

*Certificat Windows (300€/an) évite alerte "Éditeur inconnu" - Pas obligatoire au début.

---

## 📦 Structure Projet

```
atelier-velo/
├─ apps/
│  ├─ web/                    # Code actuel Next.js
│  │  ├─ src/
│  │  ├─ prisma/
│  │  ├─ package.json
│  │  └─ next.config.mjs
│  │
│  └─ desktop/                # Nouveau wrapper Electron
│     ├─ main.js              # Entry point Electron
│     ├─ preload.js           # Sécurité sandbox
│     ├─ package.json
│     ├─ icon.ico
│     └─ build/               # Build artifacts
│
├─ data/                      # Base SQLite (créée au runtime)
│  └─ atelier.db
│
└─ README_INSTALL.md          # Instructions utilisateur
```

---

## 🚀 Plan d'Implémentation (7 jours)

### Phase 1: Préparation Code Web (2 jours)

#### 1.1 Forcer SQLite (30 min)

**Fichier:** `apps/web/.env.local`
```env
DATABASE_PROVIDER=sqlite
SQLITE_DB_PATH=./data/atelier.db
DATABASE_URL="file:./data/atelier.db"
```

**Vérification:**
```bash
cd apps/web
npm run dev
# Vérifier que SQLite est utilisé dans les logs
```

#### 1.2 Mode Standalone Next.js (30 min)

**Fichier:** `apps/web/next.config.mjs`
```javascript
const nextConfig = {
  output: 'standalone',  // ← Ajouter cette ligne
  reactStrictMode: false,
  // ... reste inchangé
};
```

**Build test:**
```bash
npm run build
# Résultat: .next/standalone/
```

#### 1.3 Corrections Sécurité (1 jour)

**Priorité 1: Supprimer stack traces en production**
```typescript
// Dans tous les catch() des routes API
catch (e: any) {
  console.error('[Internal]', e); // Log serveur uniquement
  return NextResponse.json(
    { 
      error: process.env.NODE_ENV === 'production' 
        ? 'internal_error' 
        : e.message 
    },
    { status: 500 }
  );
}
```

**Fichiers à modifier:**
- `src/app/api/workshop/workorders/merge/route.ts`
- `src/app/api/workshop/workorders/[id]/estimate/route.ts`
- Toutes les autres routes API

---

### Phase 2: Wrapper Electron (3 jours)

#### 2.1 Créer apps/desktop (1h)

```bash
mkdir apps/desktop
cd apps/desktop
npm init -y
npm install electron electron-builder --save-dev
```

#### 2.2 Fichier main.js (Entry Point Electron)

**Créer:** `apps/desktop/main.js`
```javascript
const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let serverProcess;
let mainWindow;

// Chemin vers les données
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

// Créer dossier data au premier lancement
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

// Démarrer serveur Next.js
function startNextServer() {
  const nextServerPath = path.join(__dirname, '../web/.next/standalone/server.js');
  
  serverProcess = spawn('node', [nextServerPath], {
    env: {
      ...process.env,
      PORT: '3000',
      DATABASE_PROVIDER: 'sqlite',
      SQLITE_DB_PATH: path.join(dataPath, 'atelier.db'),
      NODE_ENV: 'production'
    },
    cwd: path.join(__dirname, '../web/.next/standalone')
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error] ${data}`);
  });
}

// Créer fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico'),
    title: 'Atelier Vélo+'
  });

  // Masquer menu par défaut
  Menu.setApplicationMenu(null);

  // Attendre que le serveur démarre (2 secondes)
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
  }, 2000);

  // Ouvrir DevTools en dev
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Initialisation
app.whenReady().then(() => {
  startNextServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quitter proprement
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
```

#### 2.3 Fichier preload.js (Sécurité)

**Créer:** `apps/desktop/preload.js`
```javascript
// Fichier vide pour l'instant
// Utilisé pour exposer des APIs Node.js au renderer si besoin futur
window.addEventListener('DOMContentLoaded', () => {
  console.log('Atelier Vélo+ Desktop Ready');
});
```

#### 2.4 Configuration package.json

**Créer:** `apps/desktop/package.json`
```json
{
  "name": "atelier-velo-desktop",
  "version": "1.0.0",
  "description": "Atelier Vélo+ - Gestion d'atelier de réparation vélos",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --win portable",
    "build:installer": "electron-builder --win nsis"
  },
  "author": "Jérôme Leyssard",
  "license": "ISC",
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  },
  "build": {
    "appId": "com.ateliervelo.app",
    "productName": "Atelier Vélo+",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "icon.ico",
      "../web/.next/standalone/**/*",
      "../web/public/**/*"
    ],
    "win": {
      "target": [
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "icon.ico"
    },
    "portable": {
      "artifactName": "AtelierVelo-${version}.exe"
    }
  }
}
```

---

### Phase 3: Build & Test (1 jour)

#### 3.1 Build complet

**Script de build global** (`build-desktop.ps1`):
```powershell
# Build Next.js
Write-Host "Building Next.js app..." -ForegroundColor Green
cd apps/web
npm run build

# Build Electron
Write-Host "Building Electron app..." -ForegroundColor Green
cd ../desktop
npm run build

Write-Host "Build complete! Executable in apps/desktop/dist/" -ForegroundColor Green
```

**Exécution:**
```bash
pwsh ./build-desktop.ps1
```

**Résultat:** `apps/desktop/dist/AtelierVelo-1.0.0.exe` (~150MB)

#### 3.2 Tests

1. **Test build local:**
```bash
cd apps/desktop
npm start  # Lance en mode dev
```

2. **Test executable:**
```bash
cd apps/desktop/dist
./AtelierVelo-1.0.0.exe
```

3. **Test offline:**
- Désactiver WiFi
- Lancer l'app
- Vérifier que tout fonctionne (sauf RDV)

---

### Phase 4: Distribution (1 jour)

#### 4.1 Auto-Update Setup

**Installer electron-updater:**
```bash
cd apps/desktop
npm install electron-updater --save
```

**Modifier main.js:**
```javascript
// Ajouter en haut
const { autoUpdater } = require('electron-updater');

// Après app.whenReady()
autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  console.log('Update available');
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});
```

#### 4.2 GitHub Releases

**Créer release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Sur GitHub:**
1. Aller dans Releases
2. "Draft a new release"
3. Tag: v1.0.0
4. Upload: `AtelierVelo-1.0.0.exe`
5. Publish

**L'app vérifiera automatiquement les updates au démarrage!**

---

## 👤 Installation Utilisateur Final

### Scénario Simple (2 minutes)

```
1. Télécharger AtelierVelo-1.0.0.exe depuis GitHub
2. Double-clic sur le fichier
3. [Windows SmartScreen] → "Informations complémentaires" → "Exécuter quand même"
4. L'application démarre
5. Première utilisation: Créer un compte
6. Remplir nom atelier, infos légales
7. ✅ Prêt à utiliser !
```

### Localisation des données

```
Windows: C:\Users\[Nom]\AppData\Roaming\atelier-velo-desktop\data\atelier.db
```

### Backup manuel (simple)

```
Copier le fichier atelier.db sur une clé USB ou cloud
```

---

## 🔄 Workflow Mises à Jour

### Développeur (toi)

```bash
# 1. Modifier code
# 2. Incrémenter version dans package.json
# 3. Build
pwsh ./build-desktop.ps1

# 4. Tag et release GitHub
git tag v1.0.1
git push origin v1.0.1

# 5. Upload .exe sur GitHub Release
```

### Utilisateur

```
1. Lancer l'app
2. Notification "Mise à jour disponible"
3. Clic "Installer"
4. L'app se met à jour et redémarre
```

---

## ⚠️ Points d'Attention

### Sécurité

- [ ] Remplacer `x-user-id` par JWT (2h)
- [ ] Supprimer toutes les stack traces en production
- [ ] Ajouter validation Zod sur endpoints critiques
- [ ] Tester mode offline complet

### Performance

- [ ] Vérifier taille finale .exe (<200MB idéalement)
- [ ] Tester démarrage sur machine faible (temps <5s)
- [ ] Optimiser requêtes SQLite (index sur colonnes fréquentes)

### UX

- [ ] Splash screen pendant démarrage serveur
- [ ] Message clair si mode offline (RDV indisponible)
- [ ] Wizard première utilisation
- [ ] Backup automatique suggéré

---

## 📊 Comparaison Alternatives

| Critère | **Electron (retenu)** | Tauri | Web (Next.js) |
|---------|----------------------|-------|---------------|
| **Taille .exe** | ~150MB | ~15MB | N/A |
| **Complexité dev** | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) | ⭐⭐ (2/5) |
| **Install utilisateur** | ⭐ Simple | ⭐ Simple | ⭐⭐⭐⭐ Complexe |
| **Offline** | ✅ 100% | ✅ 100% | ❌ Non |
| **Coût** | 0€ | 0€ | 0€ |
| **Communauté** | ✅✅✅ Grande | ✅ Moyenne | ✅✅✅ Grande |
| **Réutilise code** | ✅ 95% | ✅ 95% | ✅ 100% |

**Verdict:** Electron offre le meilleur compromis simplicité/fonctionnalités pour ton cas.

---

## 🎯 Timeline Finale

| Phase | Durée | Status |
|-------|-------|--------|
| Préparation code web | 2 jours | 🔴 À faire |
| Wrapper Electron | 3 jours | 🔴 À faire |
| Build & tests | 1 jour | 🔴 À faire |
| Distribution setup | 1 jour | 🔴 À faire |
| **TOTAL** | **7 jours** | |

---

## 🚀 Prochaine Étape Immédiate

**Commencer par valider SQLite:**

```bash
cd apps/web

# 1. Configurer .env.local
echo "DATABASE_PROVIDER=sqlite" >> .env.local
echo "SQLITE_DB_PATH=./data/atelier.db" >> .env.local
echo 'DATABASE_URL="file:./data/atelier.db"' >> .env.local

# 2. Créer dossier data
mkdir data

# 3. Migrer la base
npx prisma migrate dev

# 4. Tester
npm run dev

# 5. Vérifier dans les logs: "[DB] Using sqlite database"
```

---

## 📞 Support & Ressources

- **Electron Docs:** https://www.electronjs.org/docs
- **electron-builder:** https://www.electron.build/
- **SQLite Prisma:** https://www.prisma.io/docs/concepts/database-connectors/sqlite
- **GitHub Releases:** https://docs.github.com/en/repositories/releasing-projects-on-github

---

**Document créé le:** 08/10/2025  
**Dernière mise à jour:** 08/10/2025  
**Version:** 1.0
