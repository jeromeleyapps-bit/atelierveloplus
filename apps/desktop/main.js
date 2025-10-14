/**
 * Atelier Vélo+ - Application Desktop Electron
 * 
 * Copyright © 2024-2025 Jérôme Leyssard - Upgraded Bikes
 * Tous droits réservés.
 * 
 * Ce logiciel est la propriété exclusive de Jérôme Leyssard.
 * Toute reproduction, distribution ou modification non autorisée est interdite.
 * 
 * Contact: jerome.leyssard@upgradedbikes.com
 * Site: https://upgradedbikes.com
 */

const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Single instance lock to avoid multiple app windows / relaunch loops
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  // Ensure the process stops executing further
  return;
}

let serverProcess;
let tunnelProcess;
let tunnelStarted = false;
let mainWindow;
let hasCreatedMainWindow = false;

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

// Déterminer l'icône de l'application (différent en dev vs package)
const appIconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'logo.ico')
  : path.join(__dirname, 'icon.ico');

// Exécuter les migrations Prisma (packaged uniquement)
async function runMigrations() {
  if (!app.isPackaged) return;
  try {
    const webPath = path.join(process.resourcesPath, 'web');
    const prismaCli = path.join(webPath, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
    const dbUrl = `file:${path.join(dataPath, 'atelier.db')}`;
    const env = { ...process.env, DATABASE_URL: dbUrl };

    // Fallback to JS entry if prisma bin not present
    let cmd, args;
    if (fs.existsSync(prismaCli)) {
      cmd = prismaCli;
      args = ['migrate', 'deploy'];
    } else {
      const guessCliJs = path.join(webPath, 'node_modules', 'prisma', 'build', 'index.js');
      cmd = process.execPath;
      args = [guessCliJs, 'migrate', 'deploy'];
    }

    console.log('[Electron] Running Prisma migrate deploy...');
    await new Promise((resolve, reject) => {
      const p = spawn(cmd, args, { cwd: webPath, env });
      p.stdout.on('data', d => console.log('[Prisma]', d.toString().trim()));
      p.stderr.on('data', d => console.error('[Prisma]', d.toString().trim()));
      p.on('close', code => {
        if (code === 0) resolve(); else reject(new Error(`prisma migrate deploy exited with ${code}`));
      });
    });
    console.log('[Electron] Prisma migrate deploy done');
  } catch (e) {
    console.error('[Electron] Prisma migrate deploy failed:', e.message);
    throw e;
  }
}

// Démarrer le tunnel Cloudflare (optionnel)
function startCloudfareTunnel() {
  const cloudflaredPath = 'C:\\cloudflared\\cloudflared.exe';
  const configPath = 'C:\\cloudflared\\config.yml';
  
  // Vérifier si cloudflared est installé
  const hasExe = fs.existsSync(cloudflaredPath);
  const hasCfg = fs.existsSync(configPath);
  if (!hasExe || !hasCfg) {
    console.log('[Tunnel] Cloudflared prerequisites missing');
    console.log('[Tunnel] exists(cloudflared.exe)=', hasExe, 'path=', cloudflaredPath);
    console.log('[Tunnel] exists(config.yml)=', hasCfg, 'path=', configPath);
    console.log('[Tunnel] Skipping tunnel (RDV clients will not be accessible)');
    return;
  }
  
  console.log('[Tunnel] Starting Cloudflare Tunnel for public booking access...');
  console.log('[Tunnel] Using START_TUNNEL=', process.env.START_TUNNEL);
  console.log('[Tunnel] Spawning:', cloudflaredPath, 'args:', ['tunnel', '--config', configPath, 'run', 'atelier-velo']);
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

  tunnelProcess.on('error', (err) => {
    console.error('[Tunnel] Failed to spawn cloudflared:', err);
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
  // Utiliser le mode dev uniquement en développement
  const isDev = !isPackaged;
  
  if (isDev) {
    // En dev: utiliser le serveur Next.js normal
    console.log('[Electron] Starting Next.js dev server...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    serverProcess = spawn(npmCmd, ['run', 'dev'], {
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
    // En prod: utiliser le serveur standalone
    console.log('[Electron] Starting Next.js standalone server...');
    console.log('[Electron] Web path:', webPath);

    const serverPath = path.join(webPath, 'server.js');
    console.log('[Electron] Server path:', serverPath);

    // Préparer un fichier de log pour le serveur Next
    const logsDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const serverLogPath = path.join(logsDir, 'next-server.log');
    console.log('[Electron] Next.js logs:', serverLogPath);

    // Appliquer les migrations avant de démarrer (non bloquant)
    // Ignore les erreurs si déjà à jour
    runMigrations().catch(() => {});

    // Use system Node.js to run the standalone server
    // Charger le .env du serveur pour récupérer les secrets
    const envPath = path.join(webPath, '.env');
    let envVars = {};
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          envVars[key] = value;
        }
      });
      console.log('[Electron] Loaded env vars:', Object.keys(envVars));
      console.log('[Electron] AUTH_TRUST_HOST:', envVars.AUTH_TRUST_HOST);
      console.log('[Electron] NEXTAUTH_SECRET:', envVars.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
      // Propagate START_TUNNEL to process.env so app.whenReady() can see it
      if (envVars.START_TUNNEL && !process.env.START_TUNNEL) {
        process.env.START_TUNNEL = envVars.START_TUNNEL;
        console.log('[Tunnel] START_TUNNEL from .env =', process.env.START_TUNNEL);
      }
    } else {
      console.error('[Electron] .env file not found at:', envPath);
    }

    // Use system Node.js to run the standalone server
    // IMPORTANT: Do NOT use process.execPath as it causes infinite spawn loops
    const nodePath = process.platform === 'win32' 
      ? 'C:\\Program Files\\nodejs\\node.exe'
      : 'node';

    const serverEnv = {
      ...process.env,
      ...envVars,
      HOSTNAME: '127.0.0.1',
      PORT: '3000',
      DATABASE_PROVIDER: 'sqlite',
      SQLITE_DB_PATH: path.join(dataPath, 'atelier.db'),
      DATABASE_URL: `file:${path.join(dataPath, 'atelier.db')}`,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      RESOURCES_PATH: process.resourcesPath
    };

    console.log('[Electron] Starting server with AUTH_TRUST_HOST:', serverEnv.AUTH_TRUST_HOST);

    // Validate serverPath exists before spawning
    if (!fs.existsSync(serverPath)) {
      console.error('[Electron] Next.js server file not found:', serverPath);
    }

    serverProcess = spawn(nodePath, [serverPath], {
      cwd: webPath,
      env: serverEnv
    });

    // Rediriger les logs vers un fichier et la console
    const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' });
    serverProcess.stdout.on('data', (data) => {
      const line = data.toString();
      logStream.write(`[STDOUT] ${line}`);
      console.log(`[Next.js] ${line.trim()}`);
    });
    serverProcess.stderr.on('data', (data) => {
      const line = data.toString();
      logStream.write(`[STDERR] ${line}`);
      console.error(`[Next.js Error] ${line.trim()}`);
    });
  }

  serverProcess.on('error', (err) => {
    console.error('[Next.js] Failed to spawn server process:', err);
  });

  serverProcess.on('close', (code) => {
    console.log(`[Next.js] Process exited with code ${code}`);
  });
}

// Créer la fenêtre principale
function createWindow() {
  if (hasCreatedMainWindow && mainWindow && !mainWindow.isDestroyed()) {
    // Prevent multiple windows
    mainWindow.focus();
    return;
  }
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
    icon: appIconPath,
    title: 'Atelier Vélo+',
    backgroundColor: '#ffffff'
  });

  // Masquer le menu par défaut
  Menu.setApplicationMenu(null);

  // Ouvrir les DevTools pour le debugging (décommenter si nécessaire)
  // mainWindow.webContents.openDevTools();

  // Effacer la session au démarrage pour forcer le login
  mainWindow.webContents.session.clearStorageData({
    storages: ['localstorage', 'cookies', 'sessionstorage']
  }).then(() => {
    console.log('[Electron] Session cleared - user will need to login');
  });

  // Attendre que le serveur soit prêt avant de charger l'URL
  console.log('[Electron] Waiting for Next.js server to be ready...');

  function waitForServer(retries = 40, delayMs = 500) {
    const url = 'http://127.0.0.1:3000/';
    http.get(url, (res) => {
      if (res.statusCode && res.statusCode < 500) {
        console.log('[Electron] Server is up, loading UI...');
        mainWindow.loadURL(url);
        // Start Cloudflare tunnel only after UI/server is reachable
        if (process.env.START_TUNNEL === '1' && !tunnelStarted) {
          console.log('[Tunnel] Conditions met (server ready). Starting tunnel...');
          tunnelStarted = true;
          setTimeout(() => startCloudfareTunnel(), 200); // small delay to keep UI snappy
        }
      } else if (retries > 0) {
        setTimeout(() => waitForServer(retries - 1, delayMs), delayMs);
      } else {
        console.error('[Electron] Server did not start in time.');
        mainWindow.loadURL(url); // tenter quand même pour afficher l'erreur serveur
      }
    }).on('error', () => {
      if (retries > 0) {
        setTimeout(() => waitForServer(retries - 1, delayMs), delayMs);
      } else {
        console.error('[Electron] Server did not start in time (network error).');
        mainWindow.loadURL(url);
      }
    });
  }

  waitForServer();

  // Ouvrir DevTools en dev (ou si DEBUG=1)
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG === '1') {
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
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  console.log('[Electron] App ready');
  startNextServer();
  
  // Do not start the tunnel here; it will start after the server is reachable in waitForServer().
  if (process.env.START_TUNNEL !== '1') {
    console.log('[Tunnel] Skipped (START_TUNNEL not set to 1). To enable, set START_TUNNEL=1 in apps/web/.env and rebuild.');
  } else {
    console.log('[Tunnel] Deferred start: will launch after server is ready.');
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fonction pour tuer tous les processus
function killAllProcesses() {
  console.log('[Electron] Killing all processes...');
  
  // Tuer le serveur Next.js et tous ses processus enfants
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
        // Sur Windows, tuer l'arbre de processus complet
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
      console.log('[Electron] Next.js server killed');
    } catch (e) {
      console.error('[Electron] Error killing Next.js:', e.message);
    }
    serverProcess = null;
  }
  
  // Tuer le tunnel Cloudflare
  if (tunnelProcess && tunnelProcess.pid) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${tunnelProcess.pid} /f /t`, { stdio: 'ignore' });
      } else {
        tunnelProcess.kill('SIGTERM');
      }
      console.log('[Electron] Cloudflare tunnel killed');
    } catch (e) {
      console.error('[Electron] Error killing tunnel:', e.message);
    }
    tunnelProcess = null;
  }
}

// Quitter proprement
app.on('before-quit', (event) => {
  console.log('[Electron] Before quit event');
  killAllProcesses();
});

app.on('window-all-closed', () => {
  console.log('[Electron] All windows closed');
  killAllProcesses();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  console.log('[Electron] Quit event');
  killAllProcesses();
});

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});
