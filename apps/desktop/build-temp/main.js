const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let serverProcess;
let tunnelProcess;
let mainWindow;

// Chemin vers les données utilisateur
const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');

console.log('[Electron] User data path:', userDataPath);
console.log('[Electron] Database path:', dataPath);

// Créer le dossier data au premier lancement
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
  console.log('[Electron] Created data directory');
}

// Démarrer le tunnel Cloudflare (optionnel)
function startCloudfareTunnel() {
  const cloudflaredPath = 'C:\\cloudflared\\cloudflared.exe';
  const configPath = 'C:\\cloudflared\\config.yml';
  
  // Vérifier si cloudflared est installé
  if (!fs.existsSync(cloudflaredPath) || !fs.existsSync(configPath)) {
    console.log('[Tunnel] Cloudflared not found, skipping tunnel (RDV clients will not be accessible)');
    return;
  }
  
  console.log('[Tunnel] Starting Cloudflare Tunnel for public booking access...');
  tunnelProcess = spawn(cloudflaredPath, ['tunnel', '--config', configPath, 'run', 'atelier-velo'], {
    cwd: 'C:\\cloudflared'
  });
  
  tunnelProcess.stdout.on('data', (data) => {
    const log = data.toString().trim();
    // Filtrer les erreurs webpack-hmr normales en dev
    if (!log.includes('webpack-hmr') && !log.includes('Unauthorized') && log.length > 0) {
      console.log(`[Tunnel] ${log}`);
    }
  });
  
  tunnelProcess.stderr.on('data', (data) => {
    const log = data.toString().trim();
    if (!log.includes('webpack-hmr') && !log.includes('Unauthorized') && log.length > 0) {
      console.error(`[Tunnel] ${log}`);
    }
  });
  
  tunnelProcess.on('close', (code) => {
    console.log(`[Tunnel] Process exited with code ${code}`);
  });
}

// Démarrer le serveur Next.js
function startNextServer() {
  // Déterminer le chemin vers web/ selon l'environnement
  const isPackaged = app.isPackaged;
  const webPath = isPackaged 
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '../web');
  
  const buildPath = path.join(webPath, '.next');
  const isDev = !isPackaged || !fs.existsSync(buildPath);
  
  if (isDev) {
    // En dev: utiliser le serveur Next.js normal
    console.log('[Electron] Starting Next.js dev server...');
    serverProcess = spawn('pnpm', ['dev'], {
      cwd: webPath,
      shell: true,
      env: {
        ...process.env,
        PORT: '3000',
        DATABASE_PROVIDER: 'sqlite',
        SQLITE_DB_PATH: path.join(dataPath, 'atelier.db'),
        DATABASE_URL: `file:${path.join(dataPath, 'atelier.db')}`,
        NODE_ENV: 'development',
        NEXT_TELEMETRY_DISABLED: '1',
        WATCHPACK_POLLING: 'true',
        FAST_REFRESH: 'false',
        __NEXT_DISABLE_WEBSOCKET: '1'
      }
    });
  } else {
    // En prod: utiliser next start (serveur de production)
    console.log('[Electron] Starting Next.js production server...');
    console.log('[Electron] Web path:', webPath);
    console.log('[Electron] Build path:', buildPath);
    
    serverProcess = spawn('pnpm', ['start'], {
      cwd: webPath,
      shell: true,
      env: {
        ...process.env,
        PORT: '3000',
        DATABASE_PROVIDER: 'sqlite',
        SQLITE_DB_PATH: path.join(dataPath, 'atelier.db'),
        DATABASE_URL: `file:${path.join(dataPath, 'atelier.db')}`,
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1'
      }
    });
  }

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Next.js Error] ${data.toString().trim()}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Next.js] Process exited with code ${code}`);
  });
}

// Créer la fenêtre principale
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
    title: 'Atelier Vélo+',
    backgroundColor: '#ffffff'
  });

  // Masquer le menu par défaut
  Menu.setApplicationMenu(null);

  // Attendre que le serveur démarre (3 secondes)
  console.log('[Electron] Waiting for Next.js server to start...');
  setTimeout(() => {
    console.log('[Electron] Loading http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  }, 3000);

  // Ouvrir DevTools en dev
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Gérer les erreurs de chargement
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription);
    // Réessayer après 2 secondes
    setTimeout(() => {
      console.log('[Electron] Retrying...');
      mainWindow.loadURL('http://localhost:3000');
    }, 2000);
  });
}

// Initialisation de l'application
app.whenReady().then(() => {
  console.log('[Electron] App ready');
  startNextServer();
  
  // Démarrer le tunnel Cloudflare après 2 secondes (laisser Next.js démarrer d'abord)
  setTimeout(() => {
    startCloudfareTunnel();
  }, 2000);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quitter proprement
app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('[Electron] Quitting, killing processes...');
  if (serverProcess) {
    serverProcess.kill();
    console.log('[Electron] Next.js server killed');
  }
  if (tunnelProcess) {
    tunnelProcess.kill();
    console.log('[Electron] Cloudflare tunnel killed');
  }
});

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});
