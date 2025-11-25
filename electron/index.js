/**
 * Atelier Vélo+ - Electron Main Process (Modular Architecture)
 * 
 * PHASE 2: Refactoring modulaire (10 nov 2025)
 * COMMIT: Phase 2 - Architecture modulaire + Fix icône
 * 
 * Architecture:
 * - utils/: Logger, Symlink, Prisma loader
 * - windows/: Main window management
 * - server/: Next.js standalone server
 * - ipc/: IPC handlers (system, server)
 * - config/: Constants centralisées
 * 
 * Sécurité (conforme best practices Electron 2024-2025):
 * - nodeIntegration: false
 * - contextIsolation: true
 * - sandbox: false (fix inputs readonly - desktop apps)
 * - webSecurity: true
 * 
 * Ordre d'exécution:
 * 1. Single Instance Lock
 * 2. Imports modules
 * 3. app.whenReady() → Init paths → DB → Server → Window
 */

const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// ============================================================================
// IMPORTS MODULES
// ============================================================================

// Configuration
const { WINDOW_CONFIG, TIMEOUTS: _TIMEOUTS } = require('./config/constants');

// Utils
const { configureLogger } = require('./utils/logger');
const { ensureNodeModulesSymlink } = require('./utils/symlink');

// Windows
const { createWindow } = require('./windows/mainWindow');

// Server
const { startStandaloneServer, killServer } = require('./server/standalone');

// IPC
const { registerSystemHandlers } = require('./ipc/systemHandlers');
const { registerServerHandlers } = require('./ipc/serverHandlers');
const { registerDiagnosticsHandlers } = require('./ipc/diagnosticsHandlers');

// Database init
const { initDatabase } = require('./init-database');

// Auto-updater
const AutoUpdater = require('./auto-updater');

// Monitoring désactivé (15/11/2025) - Sentry supprimé

// ============================================================================
// VARIABLES GLOBALES
// ============================================================================

const isDev = !app.isPackaged;
let mainWindow = null;
let serverProcess = null;
let updater = null;
let dataPath = null;
let dbPath = null;
let log = console; // Temporaire, remplacé après config

// ============================================================================
// SINGLE INSTANCE LOCK
// ============================================================================
// CAUSE: Éviter multiples instances (confusion utilisateur)
// SOLUTION: requestSingleInstanceLock() AVANT app.whenReady()
// ============================================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[ELECTRON] Instance déjà active, focus fenêtre existante');
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      console.log('[ELECTRON] Focus fenêtre (second-instance)');
    }
  });
}

// ============================================================================
// SYMLINK CREATION (Mode Packagé Uniquement)
// ============================================================================
// CRITIQUE: Créer symlink AVANT chargement Prisma
// Raison: Prisma requiert node_modules/ pour résolution
// Phase 1 (10 nov 2025): fs-extra + fallback copie physique
// ============================================================================

if (app.isPackaged) {
  const webPath = path.join(process.resourcesPath, 'web');
  
  // APPEL: Fonction helper avec validation retour
  const success = ensureNodeModulesSymlink(webPath, console);
  
  if (!success) {
    // CAUSE: Échec symlink ET copie physique
    // CONSÉQUENCE: Prisma va échouer au chargement
    console.error('[INIT] ❌ Configuration node_modules échouée');
    // Ne pas quitter - dialog.showErrorBox déjà affiché dans fonction
  }
}

// ============================================================================
// APP LIFECYCLE
// ============================================================================

app.whenReady().then(async () => {
  try {
    log = console; // Temporaire
    log.info('[INIT] ===== APP STARTING =====');
    log.info('[INIT] isPackaged:', app.isPackaged);
    log.info('[INIT] __dirname:', __dirname);
    
    // 1. Initialiser chemins
    const appDataPath = app.getPath('appData');
    const userDataPath = path.join(appDataPath, 'Atelier Velo+');
    app.setPath('userData', userDataPath);
    dataPath = app.getPath('userData');
    
    // Créer dossier data
    const dataDir = path.join(dataPath, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    dbPath = path.join(dataDir, 'atelier.db');
    log.info('[INIT] Chemins - Data:', dataPath, '| DB:', dbPath);
    
    // 1.5. Charger variables d'environnement (mode packagé uniquement)
    if (!isDev) {
      const envPath = path.join(process.resourcesPath, 'web', '.env.production');
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        log.info('[INIT] ✅ .env.production chargé:', envPath);
      } else {
        log.warn('[INIT] ⚠️  .env.production non trouvé:', envPath);
      }
    }
    
    // 2. Configurer logger
    log = configureLogger(dataPath);
    log.info('[INIT] ✅ Logger configuré');
    
    // 2.5. Monitoring natif (15/11/2025)
    log.info('[INIT] ✅ Monitoring natif actif (Sentry désactivé)');
    
    // 3. Créer dossiers requis
    const requiredDirs = ['logs', 'uploads', 'cache'];
    requiredDirs.forEach(dir => {
      const dirPath = path.join(dataPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.info('[INIT] Dossier créé:', dir);
      }
    });
    
    // 4. Initialiser base de données
    log.info('[INIT] Initialisation base de données...');
    
    // Pattern EXACT de main.js lignes 1078-1119 (testé et fonctionnel)
    let prismaClient = null;
    try {
      // Charger Prisma module
      let PrismaClient;
      
      if (app.isPackaged) {
        // Mode packagé: Charger via utils/prisma.js (résolution custom)
        const { loadPrismaClient } = require('./utils/prisma');
        const prismaModule = loadPrismaClient(app, log);
        PrismaClient = prismaModule.PrismaClient;
      } else {
        // Mode dev: Require standard
        const prismaModule = require('@prisma/client');
        PrismaClient = prismaModule.PrismaClient;
      }
      
      // En mode packagé: Localiser query engine explicitement
      // (Pattern main.js lignes 1080-1095)
      let enginePath = null;
      if (app.isPackaged) {
        const webPath = path.join(process.resourcesPath, 'web');
        const npmModulesPath = path.join(webPath, 'npm_modules');
        const engineRoot = path.join(npmModulesPath, '.prisma', 'client');
        
        try {
          // Filtrer explicitement pour le binaire Windows
          // Doc Prisma: https://www.prisma.io/docs/concepts/components/prisma-engines
          // Format: libquery_engine-windows.dll.node
          const engineFile = fs
            .readdirSync(engineRoot)
            .find((file) => file.includes('windows') && file.endsWith('.node'));
          
          if (engineFile) {
            enginePath = path.join(engineRoot, engineFile);
            log.info('[INIT] Query engine Windows trouvé:', engineFile);
          } else {
            log.error('[INIT] ❌ Aucun binaire Windows trouvé dans:', engineRoot);
            log.error('[INIT] Fichiers présents:', fs.readdirSync(engineRoot));
          }
        } catch (error) {
          log.error('[INIT] Erreur recherche query engine:', error.message);
        }
      }
      
      // Instancier PrismaClient avec config complète
      // (Pattern main.js lignes 1097-1109)
      const prismaConfig = {
        datasources: {
          db: {
            url: `file:${dbPath}`
          }
        },
        log: isDev ? ['error', 'warn'] : ['error']
      };
      
      // CRITIQUE: Ajouter __internal.engine.binaryPath en mode packagé
      if (app.isPackaged && enginePath) {
        prismaConfig.__internal = {
          engine: {
            binaryPath: enginePath
          }
        };
      }
      
      prismaClient = new PrismaClient(prismaConfig);
      log.info('[INIT] PrismaClient instancié');
      
      // Initialiser DB avec tous les paramètres
      await initDatabase(dbPath, isDev, log, prismaClient);
      
      // Déconnecter après init
      await prismaClient.$disconnect();
      log.info('[INIT] PrismaClient déconnecté');
      
      log.info('[INIT] ✅ Base de données prête');
      
    } catch (error) {
      log.error('[INIT] ❌ Erreur init DB:', error.message);
      log.error('[INIT] Stack:', error.stack);
      throw error;
    }
    
    // 5. Démarrer serveur Next.js (mode production uniquement)
    if (!isDev) {
      log.info('[INIT] Démarrage serveur Next.js...');
      
      serverProcess = startStandaloneServer({
        resourcesPath: process.resourcesPath,
        dataPath,
        dbPath,
        ensureSymlink: ensureNodeModulesSymlink
      }, log);
      
      if (serverProcess) {
        log.info('[INIT] ✅ Serveur Next.js démarré (PID:', serverProcess.pid, ')');
      } else {
        log.error('[INIT] ❌ Échec démarrage serveur');
      }
    }
    
    // 6. Enregistrer IPC handlers
    registerSystemHandlers({ dataPath, dbPath }, log);
    
    // Server manager pour IPC
    const serverManager = {
      start: () => {
        if (!serverProcess) {
          serverProcess = startStandaloneServer({
            resourcesPath: process.resourcesPath,
            dataPath,
            dbPath,
            ensureSymlink: ensureNodeModulesSymlink
          }, log);
        }
      },
      stop: () => {
        killServer(log);
        serverProcess = null;
      },
      getProcess: () => serverProcess
    };
    
    registerServerHandlers(serverManager, { isDev, resourcesPath: process.resourcesPath }, log);
    registerDiagnosticsHandlers(log);
    
    log.info('[INIT] ✅ IPC handlers enregistrés');
    
    // 7. Créer fenêtre principale
    log.info('[INIT] Création fenêtre principale...');
    mainWindow = createWindow(WINDOW_CONFIG, isDev, log);
    log.info('[INIT] ✅ Fenêtre créée');
    
    // 8. Initialiser auto-updater (mode production uniquement)
    if (!isDev) {
      log.info('[INIT] Initialisation auto-updater...');
      updater = new AutoUpdater(mainWindow);
      
      // Vérifier mises à jour au démarrage (après 10s)
      setTimeout(() => {
        updater.checkForUpdates();
      }, 10000);
      
      log.info('[INIT] ✅ Auto-updater initialisé');
    } else {
      log.info('[INIT] ⏭️  Auto-updater désactivé (mode dev)');
    }
    
    log.info('[INIT] ===== APP READY =====');
    
  } catch (error) {
    log.error('[INIT] ❌ ERREUR CRITIQUE:', error.message);
    log.error('[INIT] Stack:', error.stack);
    
    dialog.showErrorBox(
      'Erreur Initialisation',
      'Impossible de démarrer l\'application.\n\n' +
      'Erreur: ' + error.message + '\n\n' +
      'Veuillez consulter les logs.'
    );
    
    app.quit();
  }
});

// Quitter quand toutes fenêtres fermées (sauf macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (log && log.info) log.info('[APP] Toutes fenêtres fermées, quit...');
    app.quit();
  }
});

// Recréer fenêtre si activé (macOS)
app.on('activate', () => {
  if (mainWindow === null) {
    if (log && log.info) log.info('[APP] Activate - recréation fenêtre');
    mainWindow = createWindow(WINDOW_CONFIG, isDev, log);
  }
});

// Cleanup avant quit
app.on('before-quit', () => {
  if (log && log.info) log.info('[APP] Before quit - cleanup...');
  
  // Arrêter serveur
  if (serverProcess) {
    killServer(log || console);
  }
});

// Gestion erreurs non gérées
process.on('uncaughtException', (error) => {
  const errorMsg = `Uncaught Exception: ${error.message}\n${error.stack}`;
  if (log && log.error) log.error('[CRASH]', errorMsg);
  else console.error('[CRASH]', errorMsg);
  
  // Écrire crash log
  try {
    const crashLogPath = path.join(app.getPath('temp'), 'atelier-velo-crash.log');
    fs.appendFileSync(crashLogPath, `[${new Date().toISOString()}] ${errorMsg}\n`);
  } catch (e) {
    console.error('Impossible écrire crash log:', e);
  }
  
  if (app.isReady()) {
    dialog.showErrorBox(
      'Erreur Critique',
      'Une erreur critique est survenue.\n\n' +
      'Détails: ' + error.message + '\n\n' +
      'Consultez les logs pour plus d\'informations.'
    );
  }
  
  setTimeout(() => process.exit(1), 1000);
});

console.log('[ELECTRON] ===== MODULE LOADED =====');
