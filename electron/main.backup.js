/**
 * Atelier Vélo+ - Electron Main Process
 * Production: lance le serveur Next standalone (resources/web/server.js)
 * Développement: charge http://localhost:3000
 */

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { shell } = require('electron');
const log = require('electron-log');

// Configuration electron-log (logging AVANT app.ready)
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('[ELECTRON-LOG] Logging initialized');

let mainWindow = null;
const isDev = !app.isPackaged;
let serverProcess = null;

// Chemins (seront initialisés dans app.whenReady)
let dataPath;
let dbPath;

log.info('[ELECTRON] Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');

// Créer les dossiers nécessaires
function ensureDirectories(userDataPath) {
  const dirs = [
    path.join(userDataPath, 'data'),
    path.join(userDataPath, 'logs'),
    path.join(userDataPath, 'prisma')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info('[ELECTRON] Dossier créé:', dir);
    }
  });
}

// Utilitaires
function isPortResponding(url = 'http://127.0.0.1:3000/') {
  return new Promise((resolve) => {
    try {
      http.get(url, (res) => {
        resolve(!!res.statusCode && res.statusCode < 500);
      }).on('error', () => resolve(false));
    } catch { resolve(false); }
  });
}

function findCloudflaredOnWindows() {
  try {
    const { execSync } = require('child_process');
    const out = execSync('where cloudflared', { stdio: ['ignore', 'pipe', 'ignore'] });
    const p = String(out).split(/\r?\n/).find(l => l.trim());
    return p && fs.existsSync(p.trim()) ? p.trim() : null;
  } catch { return null; }
}

function isProcessRunningWin(exeName) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`tasklist /FI "IMAGENAME eq ${exeName}"`, { stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out).toLowerCase().includes(exeName.toLowerCase());
  } catch { return false; }
}

// IPC: ouvrir chemins
ipcMain.handle('open:path', async (e, p) => {
  try {
    if (!p) return { ok: false, message: 'Chemin manquant' };
    const res = await shell.openPath(p);
    if (res) return { ok: false, message: res };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('open:config-yml', async () => {
  const cfg = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cloudflared', 'config.yml');
  return ipcMain.emit('open:path', null, cfg);
});

// IPC: statut/démarrage/arrêt serveur HTTP local
ipcMain.handle('localhttp:status', async () => {
  const running = await isPortResponding('http://127.0.0.1:3000/');
  const exists = running || (!!serverProcess && !serverProcess.killed);
  const serverEntry = !isDev ? path.join(process.resourcesPath, 'web', 'server.js') : undefined;
  return { running, exists, serverEntry };
});

ipcMain.handle('localhttp:start', async () => {
  try {
    if (await isPortResponding('http://127.0.0.1:3000/')) {
      return { ok: true, already: true };
    }
    if (isDev) {
      return { ok: false, message: 'Indisponible en dev. Lancez "npm run dev" ou "npm run start" dans apps/web.' };
    }
    if (!serverProcess) startStandaloneServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('localhttp:stop', async () => {
  try { killServer(); return { ok: true }; }
  catch (e) { return { ok: false, message: e.message }; }
});

// IPC: Cloudflared
ipcMain.handle('cloudflared:status', async () => {
  const cloudflaredPath = process.platform === 'win32' ? findCloudflaredOnWindows() : 'cloudflared';
  const found = !!cloudflaredPath;
  const running = process.platform === 'win32' ? isProcessRunningWin('cloudflared.exe') : isProcessRunningWin('cloudflared');
  const configPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cloudflared', 'config.yml');
  const configFound = fs.existsSync(configPath);
  return { running, found, configFound, cloudflaredPath, configPath };
});

let cloudflaredProc = null;
ipcMain.handle('cloudflared:start', async () => {
  try {
    const cfg = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cloudflared', 'config.yml');
    const exe = process.platform === 'win32' ? (findCloudflaredOnWindows() || 'cloudflared.exe') : 'cloudflared';
    if (process.platform === 'win32' && !findCloudflaredOnWindows()) {
      return { ok: false, message: 'cloudflared non détecté. Installez-le et ajoutez-le au PATH.' };
    }
    if (!fs.existsSync(cfg)) {
      return { ok: false, message: 'config.yml introuvable dans %USERPROFILE%/.cloudflared' };
    }
    if (cloudflaredProc && !cloudflaredProc.killed) {
      return { ok: true, already: true };
    }
    cloudflaredProc = spawn(exe, ['tunnel', '--config', cfg, 'run'], { stdio: 'pipe' });
    cloudflaredProc.stdout.on('data', d => log.info('[CF]', String(d).trim()));
    cloudflaredProc.stderr.on('data', d => log.error('[CF]', String(d).trim()));
    cloudflaredProc.on('close', c => { log.info('[CF] exit', c); cloudflaredProc = null; });
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle('cloudflared:stop', async () => {
  try {
    if (cloudflaredProc && cloudflaredProc.pid) {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${cloudflaredProc.pid} /f /t`, { stdio: 'ignore' });
      } else {
        cloudflaredProc.kill('SIGTERM');
      }
      cloudflaredProc = null;
      return { ok: true };
    }
    // fallback: tuer tout process cloudflared
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      try { execSync('taskkill /IM cloudflared.exe /F /T', { stdio: 'ignore' }); } catch {}
      return { ok: true };
    }
    return { ok: true, alreadyStopped: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// Exécuter les migrations Prisma en production (non bloquant)
function runMigrationsIfAvailable() {
  try {
    const webPath = path.join(process.resourcesPath, 'web');
    const prismaCli = path.join(webPath, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
    if (!fs.existsSync(prismaCli)) return;
    // Utiliser dbPath qui DOIT être initialisé avant l'appel de cette fonction
    const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };
    log.info('[PRISMA] migrate deploy...');
    const p = spawn(prismaCli, ['migrate', 'deploy'], { cwd: webPath, env });
    p.stdout.on('data', d => log.info('[PRISMA]', String(d).trim()));
    p.stderr.on('data', d => log.error('[PRISMA]', String(d).trim()));
    p.on('close', c => log.info('[PRISMA] exit', c));
  } catch (e) {
    log.error('[PRISMA] error', e.message);
  }
}

// IPC handlers - Seront enregistrés dans app.whenReady()
// car ils utilisent app.getPath() qui nécessite que l'app soit prête

// Démarrer le serveur Next.js standalone en production
function startStandaloneServer() {
  // CORRECTION: electron-builder.yml copie vers resources/web/
  // Donc le serveur standalone est à: resources/web/server.js
  const webPath = path.join(process.resourcesPath, 'web');
  const serverPath = path.join(webPath, 'server.js');
  
  log.info('[NEXT] ===== DÉMARRAGE SERVEUR NEXT.JS =====');
  log.info('[NEXT] process.resourcesPath:', process.resourcesPath);
  log.info('[NEXT] webPath:', webPath);
  log.info('[NEXT] serverPath:', serverPath);

  // Préparer logs
  const logsDir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const serverLogPath = path.join(logsDir, 'next-server.log');
  console.log('[NEXT] Logs:', serverLogPath);

  if (!fs.existsSync(serverPath)) {
    log.error('[NEXT] ❌ Fichier server.js INTROUVABLE:', serverPath);
    log.error('[NEXT] Contenu de resourcesPath:', fs.readdirSync(process.resourcesPath));
    if (fs.existsSync(webPath)) {
      log.error('[NEXT] Contenu de webPath:', fs.readdirSync(webPath));
    }
    return; // Arrêter si server.js n'existe pas
  } else {
    log.info('[NEXT] ✅ server.js trouvé:', serverPath);
  }

  // Prefer embedded Node runtime if available
  const embeddedNode = path.join(process.resourcesPath, 'node', process.platform === 'win32' ? 'node.exe' : 'bin/node');
  const nodePath = (process.platform === 'win32' && fs.existsSync(embeddedNode)) ? embeddedNode : 'node';

  // Load environment from packaged .env files, if present
  const envFiles = ['.env.production', '.env'];
  const envVars = {};
  // Env files are expected alongside app package; allow read from app root
  for (const f of envFiles) {
    const p = path.join(process.resourcesPath, 'app', f);
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        content.split('\n').forEach(line => {
          const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
          if (m) {
            const k = m[1].trim();
            let v = m[2].trim();
            v = v.replace(/^['"]|['"]$/g, '');
            if (v !== '') envVars[k] = v;
          }
        });
        log.info('[ENV] Loaded', f, 'keys=', Object.keys(envVars).length);
      } catch (e) {
        log.error('[ENV] Failed to read', f, e.message);
      }
    }
  }

  const env = {
    ...process.env,
    ...envVars,
    HOSTNAME: '127.0.0.1',
    PORT: envVars.PORT || '3000',
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    // Ensure auth works in desktop context
    AUTH_TRUST_HOST: envVars.AUTH_TRUST_HOST || '1',
    NEXTAUTH_URL: envVars.NEXTAUTH_URL || 'http://127.0.0.1:3000',
    DATABASE_URL: envVars.DATABASE_URL || `file:${dbPath}`,
    RESOURCES_PATH: process.resourcesPath
  };

  log.info('[NEXT] Lancement du serveur standalone...');
  log.info('[NEXT] Node path:', nodePath);
  log.info('[NEXT] CWD:', webPath);
  log.info('[NEXT] ENV.PORT:', env.PORT);
  log.info('[NEXT] ENV.DATABASE_URL:', env.DATABASE_URL);
  
  serverProcess = spawn(nodePath, [serverPath], { cwd: webPath, env });
  log.info('[NEXT] ✅ Process spawned, PID:', serverProcess.pid);

  const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' });
  serverProcess.stdout.on('data', (d) => {
    const line = d.toString();
    logStream.write(`[STDOUT] ${line}`);
    if (line.trim()) log.info('[Next]', line.trim());
  });
  serverProcess.stderr.on('data', (d) => {
    const line = d.toString();
    logStream.write(`[STDERR] ${line}`);
    if (line.trim()) log.error('[NextE]', line.trim());
  });
  serverProcess.on('error', (err) => {
    log.error('[Next] ❌ spawn error', err);
    logStream.write(`[ERROR] ${err}\n`);
  });
  serverProcess.on('close', (code) => {
    log.info('[Next] exited with code', code);
    logStream.write(`[CLOSE] Exit code: ${code}\n`);
  });
}

// Créer la fenêtre
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });
  
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    log.info('[ELECTRON] Fenêtre affichée');
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Cacher le menu
  try { Menu.setApplicationMenu(null); } catch {}

  const url = 'http://127.0.0.1:3000/';
  if (isDev) {
    log.info('[ELECTRON] Mode dev - chargement direct:', url);
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    log.info('[ELECTRON] Attente du serveur Next...');
    const wait = (retries = 60, delayMs = 500) => {
      http.get(url, (res) => {
        if (res.statusCode && res.statusCode < 500) {
          log.info('[ELECTRON] ✅ Serveur prêt (HTTP', res.statusCode + '), chargement UI');
          mainWindow.loadURL(url);
        } else if (retries > 0) {
          log.warn('[ELECTRON] Serveur HTTP', res.statusCode, '- Retry', 60 - retries, '/60');
          setTimeout(() => wait(retries - 1, delayMs), delayMs);
        } else {
          log.error('[ELECTRON] ❌ Serveur indisponible après 30s, chargement quand même');
          mainWindow.loadURL(url);
        }
      }).on('error', (err) => {
        if (retries > 0) {
          if (retries % 10 === 0) log.warn('[ELECTRON] Attente serveur... Retry', 60 - retries, '/60');
          setTimeout(() => wait(retries - 1, delayMs), delayMs);
        } else {
          log.error('[ELECTRON] ❌ Échec connexion après 30s:', err.message);
          mainWindow.loadURL(url);
        }
      });
    };
    wait();
  }
}

// Initialisation
log.info('[ELECTRON] ===== APP STARTING =====');
log.info('[ELECTRON] app.isPackaged:', app.isPackaged);
log.info('[ELECTRON] __dirname:', __dirname);

app.whenReady().then(async () => {
  try {
    log.info('[ELECTRON] ===== APP READY EVENT =====');
    
    // Initialiser les chemins (DOIT être après app.ready)
    dataPath = app.getPath('userData');
    dbPath = path.join(dataPath, 'data', 'atelier.db');
    
    log.info('[ELECTRON] Data Path:', dataPath);
    log.info('[ELECTRON] DB Path:', dbPath);
    log.info('[ELECTRON] process.resourcesPath:', process.resourcesPath);
    
    ensureDirectories(dataPath);
    
    // Enregistrer les IPC handlers (APRÈS app.ready)
    ipcMain.handle('get-app-path', () => dataPath);
    ipcMain.handle('get-db-path', () => dbPath);
    
    ipcMain.handle('app:reset', async () => {
      try {
        const dataDir = path.dirname(dbPath);
        if (fs.existsSync(dbPath)) {
          fs.rmSync(dbPath, { force: true });
          log.info('[RESET] DB file removed:', dbPath);
        }
        try { fs.rmdirSync(dataDir); } catch {}
        app.relaunch();
        app.exit(0);
        return { ok: true };
      } catch (e) {
        log.error('[RESET] Failed:', e);
        return { ok: false, error: e.message };
      }
    });

    if (!isDev) {
      log.info('[ELECTRON] Mode PRODUCTION - Lancement serveur standalone');
      runMigrationsIfAvailable();
      startStandaloneServer();
    } else {
      log.info('[ELECTRON] Mode DEV - Utilisation localhost:3000');
    }
    createWindow();

    log.info('[ELECTRON] ✅ Application prête');
    
  } catch (error) {
    log.error('[ELECTRON] ❌ ERREUR CRITIQUE:', error);
    log.error('[ELECTRON] Stack:', error.stack);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Arrêt propre
function killServer() {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${serverProcess.pid} /f /t`, { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
      log.info('[ELECTRON] Serveur Next arrêté');
    } catch (e) {
      log.error('[ELECTRON] Arrêt serveur erreur:', e.message);
    }
    serverProcess = null;
  }
}

app.on('before-quit', killServer);
app.on('quit', killServer);
