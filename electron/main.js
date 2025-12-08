/**
 * Atelier Vélo+ - Electron Main Process
 * 
 * Architecture:
 * - Production: Serveur Next.js standalone (resources/web/server.js)
 * - Développement: Connexion à localhost:3000
 * 
 * Sécurité (conforme best practices Electron 2024-2025):
 * - nodeIntegration: false
 * - contextIsolation: true
 * - sandbox: false (désactivé - fix inputs readonly bug desktop apps)
 * - webSecurity: true (protections XSS, CORS)
 * - contextBridge via preload.js (APIs sécurisées)
 * 
 * Ordre d'exécution:
 * 1. Imports et configuration
 * 2. Variables globales
 * 3. Fonctions utilitaires
 * 4. IPC handlers statiques (ne dépendent pas de app.ready)
 * 5. app.whenReady() → Initialisation → IPC dynamiques → Serveur → Fenêtre
 */

// ============================================================================
// 1. IMPORTS
// ============================================================================

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra'); // ✅ Enhanced filesystem pour robustesse (ensureSymlink, copySync avec retry)
const _Module = require('module');
const { spawn, execSync } = require('child_process');
const dotenv = require('dotenv');
const _archiver = require('archiver');

// ============================================================================
// 2. VARIABLES GLOBALES (déclarées AVANT single instance lock)
// ============================================================================

const isDev = !app.isPackaged;
let mainWindow = null;
let serverProcess = null;
let cloudflaredProc = null;

// ============================================================================
// SINGLE INSTANCE LOCK (empêche lancements multiples)
// ============================================================================
// Critique pour éviter:
// - Multiples serveurs Next.js sur même port (EADDRINUSE)
// - Conflits accès DB SQLite
// - Confusion utilisateur (11 processus comme rapporté)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Une autre instance tourne déjà
  console.log('[ELECTRON] Instance déjà active - Fermeture de cette instance');
  app.quit();
  // Ne pas continuer l'exécution
  process.exit(0);
} else {
  // Cette instance a le lock
  // Si une deuxième instance tente de démarrer, focus la fenêtre existante
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    console.log('[ELECTRON] Tentative lancement deuxième instance - Focus fenêtre existante');

    // Si fenêtre existe, la restaurer et focus
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.show();
    }
  });
}

// check-disk-space: Optionnel (peut échouer dans build packagé)
let checkDiskSpaceSync = null;
try {
  const checkDiskSpace = require('check-disk-space');
  checkDiskSpaceSync = checkDiskSpace.checkDiskSpaceSync;
} catch (_err) {
  console.warn('[INIT] check-disk-space non disponible (mode packagé)');
}

// ============================================================================
// SOLUTION ASAR TOTALE - 7 déc 2025
// ============================================================================
// CHANGEMENT: web/ est maintenant dans app.asar (pas extraResources)
// AVANTAGES:
// - Évite ENAMETOOLONG (2929 fichiers → 1 fichier ASAR)
// - Plus besoin de symlink node_modules → npm_modules
// - Electron résout automatiquement les chemins dans ASAR
// - Meilleure sécurité (code protégé)
// ============================================================================

/**
 * Retourne le chemin vers web/ (dans ASAR en mode packagé)
 */
function getWebPath() {
  if (app.isPackaged) {
    // En mode packagé, web/ est dans app.asar/web/
    return path.join(app.getAppPath(), 'web');
  }
  // En dev, utiliser le dossier standalone
  return path.join(__dirname, '..', '.next', 'standalone');
}

/**
 * Retourne le chemin vers npm_modules (dans ASAR en mode packagé)
 */
function getNpmModulesPath() {
  if (app.isPackaged) {
    // npm_modules dans ASAR (auto-résolu par Electron)
    return path.join(app.getAppPath(), 'web', 'npm_modules');
  }
  return path.join(__dirname, '..', 'node_modules');
}

/**
 * Trouve le Prisma query engine dans app.asar.unpacked
 * Les binaires .node sont automatiquement unpacked par electron-builder
 */
function findPrismaEngine() {
  if (!app.isPackaged) {
    return null; // En dev, Prisma trouve son engine automatiquement
  }
  
  const unpackedPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    'web',
    'npm_modules',
    '.prisma',
    'client'
  );
  
  try {
    if (fs.existsSync(unpackedPath)) {
      const files = fs.readdirSync(unpackedPath);
      const engine = files.find(f => f.endsWith('.node'));
      if (engine) {
        const enginePath = path.join(unpackedPath, engine);
        console.log('[PRISMA] ✅ Query engine trouvé:', enginePath);
        return enginePath;
      }
    }
    console.warn('[PRISMA] ⚠️ Query engine non trouvé dans:', unpackedPath);
  } catch (e) {
    console.error('[PRISMA] ❌ Erreur recherche engine:', e.message);
  }
  return null;
}

// NOTE: Plus besoin de ensureNodeModulesSymlink() car web/ est dans ASAR
// Electron résout automatiquement les chemins dans ASAR

// ============================================================================
// CRITIQUE: Configuration Prisma pour mode packagé (MODE ASAR)
// ============================================================================
// CHANGEMENT 7 déc 2025: Prisma est maintenant dans app.asar/electron/web/
// Le query engine .node est dans app.asar.unpacked/
// ============================================================================
function _loadPrismaClient() {
  if (!app.isPackaged) {
    return require('@prisma/client');
  }

  // MODE ASAR: Prisma dans app.asar/electron/web/npm_modules/
  const webPath = getWebPath();
  const npmModulesPath = getNpmModulesPath();
  
  // Engine dans app.asar.unpacked (binaire natif)
  const enginePath = findPrismaEngine();

  console.log('[PRISMA] Loading from ASAR');
  console.log('[PRISMA] webPath:', webPath);
  console.log('[PRISMA] npmModulesPath:', npmModulesPath);
  console.log('[PRISMA] enginePath:', enginePath);

  // Configuration variables d'environnement Prisma
  process.env.PRISMA_CLIENT_ENGINE_TYPE = 'library';
  if (enginePath) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  }

  // Ajouter npm_modules au module.paths pour que require() fonctionne
  const Module = require('module');
  if (!Module._nodeModulePaths.__patched) {
    const originalPaths = Module._nodeModulePaths;
    Module._nodeModulePaths = function(from) {
      const paths = originalPaths.call(this, from);
      // Ajouter npm_modules de l'ASAR en priorité
      paths.unshift(npmModulesPath);
      return paths;
    };
    Module._nodeModulePaths.__patched = true;
  }

  // Require Prisma depuis le chemin ASAR
  const prismaPath = path.join(npmModulesPath, '@prisma', 'client');
  return require(prismaPath);
}
// ============================================================================
// 2. CONFIGURATION
// ============================================================================

// Configuration electron-log
// Note: La config file sera faite dans app.whenReady() car elle utilise app.getPath()
if (log.transports && log.transports.console) {
  log.transports.console.level = 'debug';
}
log.info('[ELECTRON-LOG] Logging initialized');

// Chemins (initialisés dans app.whenReady)
let dataPath;
let dbPath;

log.info('[ELECTRON] Mode:', isDev ? 'DEVELOPMENT' : 'PRODUCTION');

// ============================================================================
// 4. FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Vérifie si un port HTTP répond
 */
function isPortResponding(url = 'http://127.0.0.1:3000/') {
  return new Promise((resolve) => {
    try {
      http.get(url, (res) => {
        resolve(!!res.statusCode && res.statusCode < 500);
      }).on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

/**
 * Trouve cloudflared sur Windows
 * Priorité: 1. Embarqué dans l'app, 2. C:\cloudflared, 3. PATH système
 */
function findCloudflaredOnWindows() {
  // 1. Chercher d'abord dans le build (embarqué)
  if (process.resourcesPath) {
    const embeddedPath = path.join(process.resourcesPath, 'cloudflared', 'cloudflared.exe');
    if (fs.existsSync(embeddedPath)) {
      return embeddedPath;
    }
  }

  // 2. Chercher dans C:\cloudflared (installation locale)
  const localPath = 'C:\\cloudflared\\cloudflared.exe';
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  // 3. Chercher dans PATH système
  try {
    const out = execSync('where cloudflared', { stdio: ['ignore', 'pipe', 'ignore'] });
    const p = String(out).split(/\r?\n/).find(l => l.trim());
    return p && fs.existsSync(p.trim()) ? p.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Trouve le dossier config cloudflared
 * Priorité: 1. Embarqué dans l'app, 2. ~/.cloudflared
 */
function findCloudflaredConfigPath() {
  // 1. Chercher d'abord dans le build (embarqué)
  if (process.resourcesPath) {
    const embeddedConfig = path.join(process.resourcesPath, 'cloudflared');
    const embeddedConfigYml = path.join(embeddedConfig, 'config.yml');
    if (fs.existsSync(embeddedConfigYml)) {
      return embeddedConfig;
    }
  }

  // 2. Fallback sur ~/.cloudflared (config locale)
  return path.join(process.env.USERPROFILE || process.env.HOME || '', '.cloudflared');
}

/**
 * Vérifie si un process tourne sur Windows
 */
function isProcessRunningWin(exeName) {
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${exeName}"`, { stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out).toLowerCase().includes(exeName.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Charge les variables d'environnement depuis .env files
 * Utilise dotenv pour parsing robuste (gère quotes, multiline, escape)
 * 
 * CHANGEMENT 7 déc 2025: .env.production est dans extraResources (pas ASAR)
 * Chemin: resources/.env.production (pas resources/web/)
 */
function loadEnvFiles() {
  const envVars = {};

  // En mode packagé, .env.production est dans extraResources (resources/)
  // En dev, il est à la racine du projet
  const envPaths = app.isPackaged
    ? [
        path.join(process.resourcesPath, '.env.production'),
        path.join(process.resourcesPath, '.env'),
      ]
    : [
        path.join(__dirname, '..', '.env.production'),
        path.join(__dirname, '..', '.env'),
      ];

  for (const envPath of envPaths) {
    log.info('[ENV] Checking', envPath);

    if (fs.existsSync(envPath)) {
      try {
        // dotenv.parse gère correctement tous les cas edge
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        Object.assign(envVars, envConfig);
        log.info('[ENV] ✅ Loaded', path.basename(envPath), '- keys=', Object.keys(envConfig).length);
      } catch (e) {
        log.error('[ENV] ❌ Failed to read', path.basename(envPath), e.message);
      }
    } else {
      log.warn('[ENV] ⚠️  File not found:', envPath);
    }
  }

  return envVars;
}

// ============================================================================
// 5. FONCTIONS MÉTIER
// ============================================================================

/**
 * Crée les dossiers nécessaires dans userData
 */
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

/**
 * Exécute les migrations Prisma en production (non bloquant)
 */
function runMigrationsIfAvailable() {
  try {
    const webPath = path.join(process.resourcesPath, 'web');
    const prismaCli = path.join(webPath, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

    if (!fs.existsSync(prismaCli)) {
      log.warn('[PRISMA] CLI non trouvé, skip migrations');
      return;
    }

    const env = { ...process.env, DATABASE_URL: `file:${dbPath}` };
    log.info('[PRISMA] migrate deploy...');

    const p = spawn(prismaCli, ['migrate', 'deploy'], { cwd: webPath, env });
    p.stdout.on('data', d => log.info('[PRISMA]', String(d).trim()));
    p.stderr.on('data', d => log.error('[PRISMA]', String(d).trim()));
    p.on('close', c => log.info('[PRISMA] exit', c));
  } catch (e) {
    log.error('[PRISMA] error', e.message);
  }
  // CAUSE: Échec symlink ET copie physique
  // CONSÉQUENCE: Serveur Next.js ne peut PAS démarrer (require errors)
  log.error('[NEXT] ❌ CRITIQUE: node_modules manquant');
  log.error('[NEXT] Serveur Next.js ne pourra pas démarrer');

  // Afficher dialogue et quitter proprement
  dialog.showErrorBox(
    'Erreur Serveur',
    'Impossible de configurer le serveur Next.js.\n\n' +
    'Le dossier node_modules ne peut pas être créé.\n' +
    'L\'application doit se fermer.'
  );

  app.quit();
  return; // Arrêter ici - Pas de serveur possible
}


/**
 * Démarre le serveur Next.js standalone en production
 * CHANGEMENT 7 déc 2025: web/ est maintenant dans ASAR
 */
async function startStandaloneServer() {
  const _port = 3000;

  // ============================================================================
  // SOLUTION ASAR TOTALE - 7 déc 2025
  // ============================================================================
  // web/ est maintenant dans app.asar (pas extraResources)
  // Utiliser getWebPath() pour obtenir le chemin correct
  // ============================================================================
  const webPath = getWebPath();
  const serverPath = path.join(webPath, 'server.js');

  log.info('[NEXT] ===== DÉMARRAGE SERVEUR NEXT.JS (MODE ASAR) =====');
  log.info('[NEXT] webPath:', webPath);
  log.info('[NEXT] serverPath:', serverPath);
  log.info('[NEXT] isPackaged:', app.isPackaged);

  // Vérifier que server.js existe (fonctionne dans ASAR)
  if (!fs.existsSync(serverPath)) {
    log.error('[NEXT] ❌ Fichier server.js INTROUVABLE:', serverPath);
    try {
      log.error('[NEXT] Contenu de appPath:', fs.readdirSync(app.getAppPath()));
      if (fs.existsSync(webPath)) {
        log.error('[NEXT] Contenu de webPath:', fs.readdirSync(webPath));
      }
    } catch (e) {
      log.error('[NEXT] Erreur lecture dossiers:', e.message);
    }
    return;
  }

  log.info('[NEXT] ✅ server.js trouvé');

  // Préparer logs
  const logsDir = path.join(dataPath, 'logs');
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const serverLogPath = path.join(logsDir, 'next-server.log');

  // Node.js runtime: Utiliser Node.js embarqué dans Electron
  const nodePath = process.execPath;

  // Charger variables d'environnement
  // NOTE: .env.production est dans extraResources (pas ASAR)
  const envVars = loadEnvFiles();

  // ============================================================================
  // PRISMA ENGINE - Dans app.asar.unpacked
  // ============================================================================
  // Les binaires .node sont automatiquement unpacked par electron-builder
  // Utiliser findPrismaEngine() pour trouver le chemin
  // ============================================================================
  const enginePath = findPrismaEngine();
  const npmModulesPath = getNpmModulesPath();

  log.info('[PRISMA] enginePath:', enginePath);
  log.info('[PRISMA] npmModulesPath:', npmModulesPath);

  const env = {
    ...process.env,
    ...envVars,
    ELECTRON_RUN_AS_NODE: '1',
    HOSTNAME: '127.0.0.1',
    PORT: envVars.PORT || '3000',
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    AUTH_TRUST_HOST: envVars.AUTH_TRUST_HOST || '1',
    NEXTAUTH_URL: envVars.NEXTAUTH_URL || 'http://127.0.0.1:3000',
    DATABASE_URL: `file:${dbPath}`,
    RESOURCES_PATH: process.resourcesPath,
    USER_DATA_PATH: dataPath,

    // Variables Prisma critiques
    PRISMA_CLIENT_ENGINE_TYPE: 'library',
    PRISMA_QUERY_ENGINE_LIBRARY: enginePath,

    // NODE_PATH: npm_modules dans ASAR
    // Electron résout automatiquement les chemins dans ASAR
    NODE_PATH: npmModulesPath
  };

  log.info('[PRISMA] Variables environnement pour Next.js:');
  log.info('[PRISMA] - ENGINE_TYPE:', env.PRISMA_CLIENT_ENGINE_TYPE);
  log.info('[PRISMA] - ENGINE_LIBRARY:', env.PRISMA_QUERY_ENGINE_LIBRARY);
  log.info('[PRISMA] - NODE_PATH:', env.NODE_PATH);

  log.info('[NEXT] Lancement du serveur...');

  // Lancer le serveur
  serverProcess = spawn(nodePath, [serverPath], { cwd: webPath, env });
  log.info('[NEXT] ✅ Process spawned, PID:', serverProcess.pid);

  // Capturer logs
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

/**
 * Arrête le serveur Next.js
 */
function killServer() {
  if (serverProcess && serverProcess.pid) {
    try {
      if (process.platform === 'win32') {
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

/**
 * Crée la fenêtre principale
 */
function createWindow() {
  // ✅ BEST PRACTICE ELECTRON: L'icône est configurée dans electron-builder.config.yml
  // avec win.icon: resources/icon.ico
  // electron-builder intègre automatiquement l'icône dans l'exe Windows
  // Windows utilisera automatiquement cette icône pour:
  // - L'exécutable dans l'explorateur
  // - La barre des tâches
  // - La fenêtre de l'application
  //
  // ❌ NE PAS définir icon dans BrowserWindow en mode packagé
  // Cela peut causer des conflits et empêcher l'icône de s'afficher correctement
  // 
  // ✅ En mode dev, on peut définir l'icône pour voir le résultat immédiatement
  const windowOptions = {
    width: 1400,
    height: 900,
    title: 'Atelier Vélo+',
    webPreferences: {
      nodeIntegration: false,      // ✅ Sécurité: Pas de Node.js dans renderer
      contextIsolation: true,      // ✅ Sécurité: Isolation contexte
      sandbox: false,              // ✅ Désactivé: Fix bug focus inputs (desktop app standalone)
      webSecurity: true,           // ✅ Sécurité: Protection XSS/CORS
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  };
  
  // Définir l'icône pour la fenêtre (dev ET packagé)
  // Note: signAndEditExecutable: false empêche l'intégration dans l'exe
  // Donc on doit définir l'icône manuellement via BrowserWindow
  let iconPath;
  if (app.isPackaged) {
    // Mode packagé: icône dans resources/
    iconPath = path.join(process.resourcesPath, 'icon.ico');
  } else {
    // Mode dev: icône dans resources/ du projet
    iconPath = path.join(__dirname, '..', 'resources', 'icon.ico');
  }
  
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
    log.info('[WINDOW] ✅ Icône chargée:', iconPath);
  } else {
    log.warn('[WINDOW] ⚠️  Icône introuvable:', iconPath);
  }
  
  mainWindow = new BrowserWindow(windowOptions);

  // ❌ DÉSACTIVÉ : Logout forcé causait page blanche (solution existante 27/11/2024)
  // RAISON: Le logout forcé au démarrage peut causer des problèmes de redirection et page blanche
  // REF: OUTILS-DIAGNOSTIC-PAGE-BLANCHE.md
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.executeJavaScript(`
  //     localStorage.removeItem('jwt_token');
  //     localStorage.removeItem('user');
  //     console.log('[ELECTRON] Logout forcé au démarrage');
  //   `).catch(err => log.warn('[ELECTRON] Erreur logout:', err));
  // });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    log.info('[ELECTRON] Fenêtre affichée');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Cacher le menu
  Menu.setApplicationMenu(null);

  // Charger l'URL
  const url = 'http://127.0.0.1:3000/';

  if (isDev) {
    log.info('[ELECTRON] Mode dev - chargement:', url);
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    log.info('[ELECTRON] Mode prod - attente serveur...');
    waitForServer(url);
  }
}

/**
 * Attend que le serveur soit prêt avant de charger l'URL
 */
function waitForServer(url, retries = 60, delayMs = 500) {
  http.get(url, (res) => {
    if (res.statusCode && res.statusCode < 500) {
      log.info('[ELECTRON] ✅ Serveur prêt (HTTP', res.statusCode + ')');
      mainWindow.loadURL(url);
    } else if (retries > 0) {
      log.warn('[ELECTRON] Serveur HTTP', res.statusCode, '- Retry', 60 - retries, '/60');
      setTimeout(() => waitForServer(url, retries - 1, delayMs), delayMs);
    } else {
      log.error('[ELECTRON] ❌ Serveur indisponible après 30s');
      mainWindow.loadURL(url);
    }
  }).on('error', (err) => {
    if (retries > 0) {
      if (retries % 10 === 0) log.warn('[ELECTRON] Attente serveur... Retry', 60 - retries, '/60');
      setTimeout(() => waitForServer(url, retries - 1, delayMs), delayMs);
    } else {
      log.error('[ELECTRON] ❌ Échec connexion après 30s:', err.message);
      mainWindow.loadURL(url);
    }
  });
}

// ============================================================================
// 6. IPC HANDLERS - STATIQUES (ne dépendent pas de app.ready)
// ============================================================================

// Ouvrir un chemin
ipcMain.handle('open:path', async (e, p) => {
  try {
    if (!p) return { ok: false, message: 'Chemin manquant' };
    const res = await shell.openPath(p);
    return res ? { ok: false, message: res } : { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// Handler diagnostics:export déplacé vers electron/ipc/diagnosticsHandlers.js

// Ouvrir config cloudflared
ipcMain.handle('open:config-yml', async () => {
  const configDir = findCloudflaredConfigPath();
  const cfg = path.join(configDir, 'config.yml');
  return ipcMain.emit('open:path', null, cfg);
});

// Statut serveur HTTP local
ipcMain.handle('localhttp:status', async () => {
  const running = await isPortResponding('http://127.0.0.1:3000/');
  const exists = running || (!!serverProcess && !serverProcess.killed);
  const serverEntry = !isDev ? path.join(process.resourcesPath, 'web', 'server.js') : undefined;
  return { running, exists, serverEntry };
});

// Démarrer serveur HTTP
ipcMain.handle('localhttp:start', async () => {
  try {
    if (await isPortResponding('http://127.0.0.1:3000/')) {
      return { ok: true, already: true };
    }
    if (isDev) {
      return { ok: false, message: 'Indisponible en dev. Lancez "npm run dev".' };
    }
    if (!serverProcess) startStandaloneServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// Arrêter serveur HTTP
ipcMain.handle('localhttp:stop', async () => {
  try {
    killServer();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// Statut Cloudflared
ipcMain.handle('cloudflared:status', async () => {
  const cloudflaredPath = process.platform === 'win32' ? findCloudflaredOnWindows() : 'cloudflared';
  const found = !!cloudflaredPath;
  const running = process.platform === 'win32' ? isProcessRunningWin('cloudflared.exe') : isProcessRunningWin('cloudflared');
  const configDir = findCloudflaredConfigPath();
  const configPath = path.join(configDir, 'config.yml');
  const configFound = fs.existsSync(configPath);
  return { running, found, configFound, cloudflaredPath, configPath };
});

// Démarrer Cloudflared
ipcMain.handle('cloudflared:start', async () => {
  try {
    const configDir = findCloudflaredConfigPath();
    const cfg = path.join(configDir, 'config.yml');
    const exe = process.platform === 'win32' ? (findCloudflaredOnWindows() || 'cloudflared.exe') : 'cloudflared';

    if (process.platform === 'win32' && !findCloudflaredOnWindows()) {
      return { ok: false, message: 'cloudflared non détecté.' };
    }
    if (!fs.existsSync(cfg)) {
      return { ok: false, message: 'config.yml introuvable dans ' + configDir };
    }
    if (cloudflaredProc && !cloudflaredProc.killed) {
      return { ok: true, already: true };
    }

    log.info('[CF] Starting cloudflared from:', exe);
    log.info('[CF] Using config:', cfg);
    cloudflaredProc = spawn(exe, ['tunnel', '--config', cfg, 'run'], { stdio: 'pipe' });
    cloudflaredProc.stdout.on('data', d => log.info('[CF]', String(d).trim()));
    cloudflaredProc.stderr.on('data', d => log.error('[CF]', String(d).trim()));
    cloudflaredProc.on('close', c => {
      log.info('[CF] exit', c);
      cloudflaredProc = null;
    });

    return { ok: true };
  } catch (e) {
    log.error('[CF] start error', e);
    return { ok: false, message: e.message };
  }
});

// Arrêter Cloudflared
ipcMain.handle('cloudflared:stop', async () => {
  try {
    if (cloudflaredProc && cloudflaredProc.pid) {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${cloudflaredProc.pid} /f /t`, { stdio: 'ignore' });
      } else {
        cloudflaredProc.kill('SIGTERM');
      }
      cloudflaredProc = null;
      return { ok: true };
    }

    // Fallback: tuer tous les cloudflared
    if (process.platform === 'win32') {
      try {
        execSync('taskkill /IM cloudflared.exe /F /T', { stdio: 'ignore' });
      } catch { }
      return { ok: true };
    }

    return { ok: true, alreadyStopped: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

// Configurer le tunnel avec les informations utilisateur
ipcMain.handle('cloudflared:configure', async (event, config) => {
  try {
    const { tunnelId, credentials, hostname } = config;

    // Validation
    if (!tunnelId || !credentials || !hostname) {
      return { ok: false, message: 'Informations manquantes' };
    }

    // Créer dossier .cloudflared dans userData
    const configDir = path.join(dataPath, '.cloudflared');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Sauvegarder credentials JSON
    const credentialsPath = path.join(configDir, `${tunnelId}.json`);
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));

    // Créer config.yml
    const configYml = `# Configuration Cloudflare Tunnel
tunnel: ${tunnelId}
credentials-file: ${credentialsPath.replace(/\\/g, '\\\\')}

# Ingress rules
ingress:
  - hostname: ${hostname}
    service: http://localhost:3000
  - service: http_status:404
`;

    const configYmlPath = path.join(configDir, 'config.yml');
    fs.writeFileSync(configYmlPath, configYml);

    log.info('[CF] Configuration créée:', { tunnelId, hostname });

    return { ok: true, configPath: configYmlPath };
  } catch (e) {
    log.error('[CF] Erreur configuration:', e);
    return { ok: false, message: e.message };
  }
});

// ============================================================================
// 7. FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Valide un chemin de fichier/dossier
 * @param {string} p Chemin à valider
 * @returns {boolean} true si le chemin est valide
 */
function validatePath(p) {
  if (typeof p !== 'string') return false;
  // Empêcher les chemins relatifs suspects
  if (p.includes('..') || p.includes('~') || p.includes('//')) {
    log.warn(`Chemin suspect détecté: ${p}`);
    return false;
  }
  return true;
}

/**
 * Lecture sécurisée d'un fichier
 * @param {string} filePath Chemin du fichier
 * @returns {string|null} Contenu du fichier ou null en cas d'erreur
 */
function _safeReadFile(filePath) {
  try {
    if (!validatePath(filePath) || !fs.existsSync(filePath)) {
      log.warn(`Fichier non trouvé ou chemin invalide: ${filePath}`);
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    log.error(`Erreur lecture ${filePath}:`, error);
    return null;
  }
}

/**
 * Vérifie si un chemin est accessible en écriture
 * @param {string} dirPath Chemin du répertoire
 * @returns {boolean} true si écriture possible
 */
function isWritable(dirPath) {
  try {
    const testFile = path.join(dirPath, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Vérifie l'intégrité de la base de données SQLite
 * @param {string} dbPath Chemin de la base de données
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function checkDatabaseIntegrity(dbPath) {
  try {
    if (!fs.existsSync(dbPath)) {
      return { valid: true }; // DB neuve, pas de vérification nécessaire
    }

    // Vérifier que le fichier n'est pas corrompu (taille > 0)
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) {
      return { valid: false, error: 'Base de données vide (0 bytes)' };
    }

    // Tentative de lecture avec Prisma (test de connexion)
    const prisma = new PrismaClient({
      datasources: { db: { url: `file:${dbPath}` } },
      log: ['error']
    });

    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return { valid: true };
    } catch (error) {
      await prisma.$disconnect();
      return { valid: false, error: error.message };
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// ============================================================================
// 8. INITIALISATION APP
// ============================================================================

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  const errorMsg = `ERREUR NON GÉRÉE: ${error.stack || error.message}`;
  log.error(errorMsg);

  // Tenter d'écrire dans un fichier de crash
  try {
    const crashLogPath = path.join(app.getPath('temp'), 'atelier-velo-crash.log');
    fs.appendFileSync(crashLogPath, `[${new Date().toISOString()}] ${errorMsg}\n`);
  } catch (e) {
    console.error('Impossible d\'écrire le log de crash:', e);
  }

  if (app.isReady()) {
    dialog.showErrorBox(
      'Erreur Critique',
      `Une erreur critique est survenue. Veuillez redémarrer l'application.\n\n` +
      `Détails: ${error.message}\n\n` +
      `Consultez les logs pour plus d'informations.`
    );
  }

  // Ne pas quitter immédiatement pour permettre la journalisation
  setTimeout(() => process.exit(1), 1000);
});

log.info('[ELECTRON] ===== APP STARTING =====');
log.info('[ELECTRON] app.isPackaged:', app.isPackaged);
log.info('[ELECTRON] __dirname:', __dirname);

// Configuration des timeouts
const INIT_TIMEOUT = 30000; // 30 secondes max pour l'initialisation
let initStartTime = Date.now();

/**
 * Vérifie si le temps d'initialisation est dépassé
 * @throws {Error} Si le timeout est dépassé
 */
function checkInitTimeout() {
  if (Date.now() - initStartTime > INIT_TIMEOUT) {
    throw new Error(`Initialisation dépassant le timeout de ${INIT_TIMEOUT / 1000} secondes`);
  }
}

app.whenReady().then(async () => {
  initStartTime = Date.now();
  const _initSuccess = false;

  try {
    log.info('[INIT] Début initialisation application');

    // 1. Initialiser les chemins D'ABORD
    const appDataPath = app.getPath('appData');
    if (!validatePath(appDataPath)) {
      throw new Error(`Chemin AppData invalide: ${appDataPath}`);
    }

    const userDataPath = path.join(appDataPath, 'Atelier Velo+');
    if (!validatePath(userDataPath)) {
      throw new Error(`Chemin userData invalide: ${userDataPath}`);
    }

    app.setPath('userData', userDataPath);
    dataPath = app.getPath('userData');

    // Créer le dossier data s'il n'existe pas
    const dataDir = path.join(dataPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    dbPath = path.join(dataDir, 'atelier.db');
    log.info(`[INIT] Chemins initialisés - Data: ${dataPath}, DB: ${dbPath}`);
    checkInitTimeout();

    // 2. Configurer electron-log avec rotation automatique
    // electron-log gère la rotation, les niveaux, les transports automatiquement
    const logsDir = path.join(dataPath, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    log.transports.file.resolvePathFn = () => path.join(logsDir, 'main.log');

    // Rotation automatique (electron-log le gère nativement)
    log.transports.file.archiveLog = (oldLogFile) => {
      const info = path.parse(oldLogFile.path);
      const timestamp = new Date().toISOString().split('T')[0];
      const archivePath = path.join(info.dir, `${info.name}.${timestamp}${info.ext}`);
      try {
        fs.renameSync(oldLogFile.path, archivePath);
      } catch (e) {
        log.error('[LOG] Rotation failed:', e);
      }
    };

    log.info('[ELECTRON] ===== APP READY EVENT =====');

    log.info('[ELECTRON] Data Path:', dataPath);
    log.info('[ELECTRON] DB Path:', dbPath);
    log.info('[ELECTRON] Resources:', process.resourcesPath);

    // 4. Créer les dossiers nécessaires
    ensureDirectories(dataPath);

    // 5. Initialiser la base de données (migrations Prisma)
    let dbInitialized = false;
    let dbError = null;

    // Tentative d'initialisation avec reprise sur erreur
    const maxDbRetries = 3;
    for (let attempt = 1; attempt <= maxDbRetries; attempt++) {
      try {
        log.info(`[DB] Tentative d'initialisation (${attempt}/${maxDbRetries})...`);

        // Vérifier l'espace disque disponible (minimum 100MB requis)
        if (checkDiskSpaceSync) {
          try {
            const diskInfo = checkDiskSpaceSync(path.parse(dbPath).root);
            const minFreeSpace = 100 * 1024 * 1024; // 100MB

            if (diskInfo.free < minFreeSpace) {
              throw new Error(`Espace disque insuffisant: ${Math.round(diskInfo.free / 1024 / 1024)}MB disponibles, ${minFreeSpace / 1024 / 1024}MB requis`);
            }
          } catch (err) {
            log.warn(`[DB] Impossible de vérifier l'espace disque: ${err.message}`);
          }
        } else {
          log.warn('[DB] Vérification espace disque désactivée (check-disk-space non disponible)');
        }

        // Vérifier les permissions
        if (!isWritable(path.dirname(dbPath))) {
          throw new Error(`Permissions insuffisantes pour écrire dans: ${path.dirname(dbPath)}`);
        }

        // Sauvegarder l'ancienne DB si elle existe
        if (fs.existsSync(dbPath) && attempt === 1) {
          const backupPath = `${dbPath}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
          log.info(`[DB] Sauvegarde de la base existante vers: ${backupPath}`);
          fs.copyFileSync(dbPath, backupPath);
        }

        // Instancier PrismaClient avec configuration complète
        // FIX PC2: Pattern IPC Handlers - Prisma chargé ICI, pas dans app.asar
        const webPath = path.join(process.resourcesPath, 'web');
        const npmModulesPath = path.join(webPath, 'npm_modules');
        const engineRoot = path.join(npmModulesPath, '.prisma', 'client');

        let enginePath = null;
        try {
          const engineFile = fs
            .readdirSync(engineRoot)
            .find((file) => file.endsWith('.node'));
          if (engineFile) {
            enginePath = path.join(engineRoot, engineFile);
            log.info('[DB] Query engine trouvé:', enginePath);
          }
        } catch (error) {
          log.error('[DB] Erreur recherche query engine:', error.message);
        }

        const prismaClient = new PrismaClient({
          datasources: {
            db: {
              url: `file:${dbPath}`
            }
          },
          __internal: {
            engine: {
              binaryPath: enginePath
            }
          },
          log: isDev ? ['error', 'warn'] : ['error']
        });

        log.info('[DB] PrismaClient instancié avec __internal.engine.binaryPath');

        // Initialiser la base de données avec l'instance Prisma
        await initDatabase(dbPath, isDev, log, prismaClient);

        // Déconnecter après init
        await prismaClient.$disconnect();
        log.info('[DB] PrismaClient déconnecté');

        // Vérifier l'intégrité de la base de données
        const integrityCheck = await checkDatabaseIntegrity(dbPath);
        if (!integrityCheck.valid) {
          throw new Error(`Échec vérification intégrité DB: ${integrityCheck.error}`);
        }

        dbInitialized = true;
        log.info('[DB] Base de données initialisée avec succès');
        break;

      } catch (error) {
        dbError = error;
        log.error(`[DB] ❌ Tentative ${attempt} échouée:`, error);

        if (attempt < maxDbRetries) {
          // Attendre avant de réessayer
          const delay = attempt * 2000; // 2s, 4s, 6s...
          log.info(`[DB] Nouvelle tentative dans ${delay / 1000} secondes...`);
          await new Promise(resolve => setTimeout(resolve, delay));

          // Essayer de réparer la base corrompue
          if (fs.existsSync(dbPath)) {
            try {
              fs.renameSync(dbPath, `${dbPath}.corrupt.${Date.now()}`);
              log.info('[DB] Base corrompue déplacée, nouvelle tentative...');
            } catch (e) {
              log.error('[DB] Impossible de déplacer la base corrompue:', e);
            }
          }
        }
      }
    }

    if (!dbInitialized) {
      const errorMsg = `Échec d'initialisation de la base de données après ${maxDbRetries} tentatives: ${dbError?.message || 'Erreur inconnue'}`;
      log.error(errorMsg);

      // Mode dégradé avec stockage en mémoire
      log.warn('[DB] Activation du mode dégradé (stockage en mémoire)');
      // Implémenter un stockage en mémoire si nécessaire

      // Avertir l'utilisateur
      dialog.showErrorBox(
        'Mode dégradé activé',
        'Impossible d\'initialiser la base de données.\n' +
        'Les modifications ne seront pas enregistrées après le redémarrage.\n\n' +
        'Veuillez contacter le support technique.'
      );
    }

    checkInitTimeout();

    // 6. Enregistrer les IPC handlers dynamiques (dépendent de dataPath/dbPath)
    ipcMain.handle('get-app-path', () => dataPath);
    ipcMain.handle('get-db-path', () => dbPath);

    ipcMain.handle('app:reset', async () => {
      try {
        const dataDir = path.dirname(dbPath);
        if (fs.existsSync(dbPath)) {
          fs.rmSync(dbPath, { force: true });
          log.info('[RESET] DB removed:', dbPath);
        }
        try { fs.rmdirSync(dataDir); } catch { }
        app.relaunch();
        app.exit(0);
        return { ok: true };
      } catch (e) {
        log.error('[RESET] Failed:', e);
        return { ok: false, error: e.message };
      }
    });

    // 4. En production: migrations + serveur
    if (!isDev) {
      log.info('[ELECTRON] Mode PRODUCTION');
      runMigrationsIfAvailable();
      startStandaloneServer();
    } else {
      log.info('[ELECTRON] Mode DEV - localhost:3000');
    }

    // 4.5. Vérifier activation (Beta testeurs)
    // TEMPORAIRE: Affiche Machine ID pour génération clés, ne bloque pas
    // TODO: Activer blocage après phase beta
    try {
      const { getMachineId, getActivationStatus } = require('./license');
      const machineId = getMachineId();
      const activationStatus = await getActivationStatus(machineId);

      log.info('[ACTIVATION] ===== BETA MODE =====');
      log.info('[ACTIVATION] Machine ID:', machineId);
      log.info('[ACTIVATION] Status:', activationStatus.isActivated ? 'ACTIVÉE ✅' : 'NON ACTIVÉE ⚠️');

      if (activationStatus.isActivated) {
        log.info('[ACTIVATION] Clé valide jusqu\'au:', new Date(activationStatus.expiresAt).toLocaleDateString());
      } else {
        log.warn('[ACTIVATION] ⚠️ Mode Beta - Application lance sans clé');
        log.warn('[ACTIVATION] ⚠️ Contactez le développeur pour obtenir votre clé');
        log.warn('[ACTIVATION] ⚠️ Machine ID à communiquer:', machineId);

        // BETA: Ne pas bloquer pour l'instant
        // TODO: Décommenter après beta pour forcer activation
        // const { dialog } = require('electron');
        // const response = await dialog.showMessageBox({
        //   type: 'warning',
        //   title: 'Activation Requise',
        //   message: 'Cette application nécessite une clé d\'activation.',
        //   detail: `Machine ID: ${machineId}\n\nContactez le développeur pour obtenir votre clé.`,
        //   buttons: ['Quitter'],
        //   defaultId: 0
        // });
        // app.quit();
        // return;
      }
    } catch (licenseError) {
      log.warn('[ACTIVATION] Module license.js non disponible ou erreur:', licenseError.message);
      log.warn('[ACTIVATION] Continuons sans vérification (mode dev/beta)');
    }

    // 5. Créer la fenêtre
    createWindow();

    log.info('[ELECTRON] ✅ Application prête');

  } catch (error) {
    log.error('[ELECTRON] ❌ ERREUR CRITIQUE:', error);
    log.error('[ELECTRON] Stack:', error.stack);
    app.quit();
  }
});

// ============================================================================
// 8. EVENT HANDLERS
// ============================================================================

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

app.on('before-quit', killServer);
app.on('quit', killServer);
