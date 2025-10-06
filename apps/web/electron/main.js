const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');

let mainWindow;
let tray;
let nextProcess;
let isQuitting = false;

// Demarrer le serveur Next.js
function startNextServer() {
  console.log('[Electron] Demarrage du serveur Next.js...');
  
  const nextBin = process.platform === 'win32' ? 'next.cmd' : 'next';
  const nextPath = isDev 
    ? path.join(__dirname, '..', 'node_modules', '.bin', nextBin)
    : path.join(process.resourcesPath, 'app', 'node_modules', '.bin', nextBin);
  
  const cwd = isDev 
    ? path.join(__dirname, '..')
    : path.join(process.resourcesPath, 'app');
  
  nextProcess = spawn(nextBin, ['dev', '-p', '3000'], {
    cwd: cwd,
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  nextProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });
  
  nextProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error] ${data.toString().trim()}`);
  });
  
  nextProcess.on('close', (code) => {
    console.log(`[Next.js] Processus termine avec le code ${code}`);
  });
}

// Creer la fenetre principale
function createWindow() {
  console.log('[Electron] Creation de la fenetre principale...');
  
  const iconPath = path.join(__dirname, '..', 'public', 'logo.png');
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    title: 'Atelier Velo+',
    show: false, // Ne pas afficher immediatement
  };
  
  // Ajouter l'icone seulement si le fichier existe
  const fs = require('fs');
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
  }
  
  mainWindow = new BrowserWindow(windowOptions);

  // Afficher la fenetre quand elle est prete
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('[Electron] Fenetre affichee');
  });

  // Attendre que Next.js demarre (8 secondes)
  console.log('[Electron] Attente du demarrage de Next.js...');
  setTimeout(() => {
    console.log('[Electron] Chargement de l\'application...');
    mainWindow.loadURL('http://localhost:3000/dashboard');
  }, 8000);

  // Minimiser dans la barre des taches au lieu de fermer
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Creer l'icone dans la barre des taches
function createTray() {
  const fs = require('fs');
  const iconPath = path.join(__dirname, '..', 'public', 'logo.png');
  
  // Ne creer le tray que si l'icone existe
  if (!fs.existsSync(iconPath)) {
    console.log('[Electron] Icone non trouvee, tray non cree');
    return;
  }
  
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir Atelier Velo+',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Dashboard',
      click: () => {
        mainWindow.show();
        mainWindow.loadURL('http://localhost:3000/dashboard');
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setToolTip('Atelier Velo+');
  tray.setContextMenu(contextMenu);
  
  // Double-clic pour ouvrir
  tray.on('double-click', () => {
    mainWindow.show();
  });
}

// Quand Electron est pret
app.on('ready', () => {
  console.log('[Electron] Application prete');
  startNextServer();
  createWindow();
  createTray();
});

// Fermer tous les processus
app.on('before-quit', () => {
  isQuitting = true;
  if (nextProcess) {
    console.log('[Electron] Arret du serveur Next.js...');
    nextProcess.kill();
  }
});

app.on('window-all-closed', () => {
  // Sur macOS, garder l'app active
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('[Electron] Erreur non geree:', error);
});

console.log('[Electron] Initialisation...');
