# 📦 Distribution de l'Application - Atelier Vélo+

## 🎯 Objectif : Application Standalone Multi-Tenant

Chaque atelier installe l'application indépendamment avec sa propre base de données.

---

## 🚀 Option 1 : Installateur Windows avec Electron (Recommandé)

### Architecture
```
Atelier Vélo+ Installer.exe
├─ PostgreSQL Portable (embarqué)
├─ Application Next.js
├─ Configuration automatique
└─ Raccourcis Bureau + Menu Démarrer
```

### Avantages
- ✅ Installation en 1 clic
- ✅ Pas besoin d'installer PostgreSQL séparément
- ✅ Tout est portable
- ✅ Mises à jour automatiques possibles
- ✅ Icône dans la barre des tâches

### Technologies
- **Electron** : Wrapper desktop pour Next.js
- **electron-builder** : Créer l'installateur
- **PostgreSQL Portable** : Base de données embarquée

---

## 📋 Étapes pour Créer l'Installateur

### 1. Installer Electron dans le projet

```bash
cd apps/web
pnpm add -D electron electron-builder electron-is-dev
```

### 2. Créer le fichier Electron principal

Créer `apps/web/electron/main.js` :

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

// Démarrer le serveur Next.js
function startNextServer() {
  const nextPath = isDev 
    ? path.join(__dirname, '..', 'node_modules', '.bin', 'next')
    : path.join(process.resourcesPath, 'app', 'node_modules', '.bin', 'next');
    
  nextProcess = spawn('node', [nextPath, 'dev', '-p', '3000'], {
    cwd: isDev ? path.join(__dirname, '..') : path.join(process.resourcesPath, 'app'),
    shell: true
  });
  
  nextProcess.stdout.on('data', (data) => {
    console.log(`Next.js: ${data}`);
  });
}

// Créer la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '..', 'public', 'logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true, // Cacher la barre de menu
    title: 'Atelier Vélo+'
  });

  // Attendre que Next.js démarre
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000/dashboard');
  }, 5000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

### 3. Configurer electron-builder

Ajouter dans `apps/web/package.json` :

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron": "electron .",
    "electron:build": "electron-builder",
    "pack": "electron-builder --dir",
    "dist": "electron-builder"
  },
  "build": {
    "appId": "com.ateliervelo.app",
    "productName": "Atelier Vélo+",
    "directories": {
      "output": "dist"
    },
    "files": [
      "**/*",
      "!node_modules/**/*",
      "node_modules/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/logo.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### 4. Créer l'installateur

```bash
cd apps/web
pnpm run dist
```

Résultat : `apps/web/dist/Atelier Vélo+ Setup.exe`

---

## 🚀 Option 2 : Package Portable (Plus Simple)

### Créer un dossier portable avec tout inclus

```
AtelierVeloPlus-Portable/
├─ postgresql-portable/      # PostgreSQL portable
├─ app/                       # Application Next.js
├─ data/                      # Base de données (créée au 1er lancement)
├─ start.bat                  # Lance tout
└─ README.txt
```

### Script start.bat

```batch
@echo off
echo Demarrage Atelier Velo+...

REM Démarrer PostgreSQL portable
start /B postgresql-portable\bin\pg_ctl.exe -D data start

REM Attendre 3 secondes
timeout /t 3 /nobreak

REM Démarrer l'application
cd app
start http://localhost:3000/dashboard
npm run dev

pause
```

### Avantages
- ✅ Pas d'installation requise
- ✅ Peut être sur une clé USB
- ✅ Facile à distribuer (ZIP)

### Inconvénients
- ❌ Pas d'icône dans le menu Démarrer
- ❌ Pas de mises à jour automatiques

---

## 🌐 Option 3 : Application Web Hébergée (SaaS)

### Déployer sur Vercel + Supabase

Chaque atelier a son propre compte (multi-tenant) sur la même instance.

```
https://atelier-velo.app
├─ Atelier 1 (tenant_id: 1)
├─ Atelier 2 (tenant_id: 2)
└─ Atelier 3 (tenant_id: 3)
```

### Avantages
- ✅ Aucune installation
- ✅ Accessible depuis n'importe où
- ✅ Mises à jour automatiques
- ✅ Backup automatique
- ✅ Multi-appareils (PC, tablette, mobile)

### Inconvénients
- ❌ Nécessite Internet
- ❌ Coûts d'hébergement

---

## 📊 Comparaison des Options

| Critère | Electron | Portable | SaaS |
|---------|----------|----------|------|
| **Installation** | 1 clic | Décompresser ZIP | Aucune |
| **Mises à jour** | Auto | Manuel | Auto |
| **Offline** | ✅ Oui | ✅ Oui | ❌ Non |
| **Multi-appareils** | ❌ Non | ❌ Non | ✅ Oui |
| **Complexité** | Moyenne | Faible | Élevée |
| **Coût** | Gratuit | Gratuit | Hébergement |

---

## 🎯 Recommandation

### Pour Démarrer (Court terme)
**Option 2 : Package Portable**
- Rapide à créer
- Facile à distribuer
- Fonctionne immédiatement

### Pour Production (Long terme)
**Option 1 : Electron + Installateur**
- Professionnel
- Expérience utilisateur optimale
- Mises à jour automatiques

### Pour Scale (Futur)
**Option 3 : SaaS**
- Modèle d'abonnement
- Accessible partout
- Maintenance centralisée

---

## 🛠️ Prochaines Étapes

### Voulez-vous que je crée :

1. **Package Portable** (2-3h) ?
   - PostgreSQL portable inclus
   - Script de démarrage automatique
   - ZIP prêt à distribuer

2. **Application Electron** (1-2 jours) ?
   - Installateur Windows professionnel
   - Icône dans le menu Démarrer
   - Mises à jour automatiques

3. **Déploiement SaaS** (3-4 jours) ?
   - Hébergement Vercel
   - Base Supabase
   - Système d'abonnement

**Quelle option préférez-vous ?**
