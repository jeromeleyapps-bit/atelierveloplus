/**
 * Main Window Management
 * 
 * RESPONSABILITÉ: Création et gestion fenêtre principale
 * ISOLATION: BrowserWindow + configuration + lifecycle
 */

const { BrowserWindow, Menu, session } = require('electron');
const path = require('path');
const http = require('http');

const LOCAL_SERVER_HOSTS = new Set(['127.0.0.1', 'localhost']);

function attachElectronAuthHeader(browserSession, logger) {
  const token = process.env.ELECTRON_AUTH_TOKEN;
  if (!token) {
    logger.warn('[SECURITY] ELECTRON_AUTH_TOKEN missing — local auth bypass not closed');
    return;
  }
  browserSession.webRequest.onBeforeSendHeaders((details, callback) => {
    try {
      const { hostname } = new URL(details.url);
      if (LOCAL_SERVER_HOSTS.has(hostname)) {
        details.requestHeaders['x-electron-auth-token'] = token;
      }
    } catch {
      // non-http URL (devtools://, file://) — skip
    }
    callback({ requestHeaders: details.requestHeaders });
  });
}

/**
 * Crée la fenêtre principale de l'application
 * 
 * @param {Object} config - Configuration fenêtre
 * @param {boolean} isDev - Mode développement
 * @param {Object} logger - Logger
 * @returns {BrowserWindow} - Fenêtre créée
 */
function createWindow(config, isDev, logger) {
  const mainWindow = new BrowserWindow({
    width: config.width || 1400,
    height: config.height || 900,
    minWidth: config.minWidth || 1200,
    minHeight: config.minHeight || 700,
    title: 'Atelier Vélo+',
    backgroundColor: config.backgroundColor || '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,      // ✅ Sécurité: Pas de Node.js dans renderer
      contextIsolation: true,      // ✅ Sécurité: Isolation contexte
      sandbox: false,              // ✅ Désactivé: Fix bug focus inputs (desktop app standalone)
      webSecurity: false,          // ⚠️ TEMPORAIRE: Désactivé pour diagnostic page blanche (29/11/2025)
      preload: path.join(__dirname, '..', 'preload.js')
    },
    show: false  // Afficher seulement quand prêt
  });

  attachElectronAuthHeader(mainWindow.webContents.session, logger);

  // ❌ DÉSACTIVÉ : Logout forcé causait page blanche (solution existante 27/11/2024)
  // RAISON: Le logout forcé au démarrage peut causer des problèmes de redirection et page blanche
  // REF: OUTILS-DIAGNOSTIC-PAGE-BLANCHE.md
  // mainWindow.webContents.on('did-finish-load', () => {
  //   mainWindow.webContents.executeJavaScript(`
  //     localStorage.removeItem('jwt_token');
  //     localStorage.removeItem('user');
  //     console.log('[ELECTRON] Logout forcé au démarrage');
  //   `).catch(err => logger.warn('[WINDOW] Erreur logout:', err));
  // });
  
  // Afficher fenêtre quand contenu prêt (évite flash blanc)
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    logger.info('[WINDOW] Fenêtre affichée');
  });
  
  // Nettoyage à la fermeture
  mainWindow.on('closed', () => {
    logger.info('[WINDOW] Fenêtre fermée');
  });

  // ============================================
  // GESTION D'ERREURS ELECTRON (Solution existante)
  // REF: OUTILS-DIAGNOSTIC-PAGE-BLANCHE.md
  // ============================================
  
  // Capture erreurs chargement page
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    logger.error(`[WINDOW] ❌ Échec chargement: ${errorCode} - ${errorDescription} - ${validatedURL}`);
    if (isMainFrame) {
      logger.error('[WINDOW] ❌ Page principale n\'a pas pu charger');
    }
  });

  // Capture messages console du renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // warn (1) ou error (2)
      const levelName = level === 1 ? 'WARN' : 'ERROR';
      logger.warn(`[RENDERER] [${levelName}] ${message} (${sourceId}:${line})`);
    }
  });

  // Détection crash du renderer process
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logger.error(`[WINDOW] ❌ Renderer process crashed: ${details.reason} (exitCode: ${details.exitCode})`);
  });

  // Détection page non responsive
  mainWindow.webContents.on('unresponsive', () => {
    logger.warn('[WINDOW] ⚠️  Page non responsive');
  });

  mainWindow.webContents.on('responsive', () => {
    logger.info('[WINDOW] ✅ Page responsive again');
  });

  // Menu contextuel avec DevTools (diagnostic page blanche - 29/11/2025)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'DevTools',
      accelerator: 'F12',
      click: () => {
        if (mainWindow.webContents.isDevToolsOpened()) {
          mainWindow.webContents.closeDevTools();
        } else {
          mainWindow.webContents.openDevTools();
        }
      }
    },
    {
      label: 'Recharger',
      accelerator: 'Ctrl+R',
      click: () => {
        mainWindow.webContents.reload();
      }
    },
    { type: 'separator' },
    {
      label: 'Quitter',
      accelerator: 'Ctrl+Q',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  mainWindow.webContents.on('context-menu', () => {
    contextMenu.popup();
  });
  
  // Cacher le menu principal
  Menu.setApplicationMenu(null);
  
  // Raccourci clavier global pour DevTools (fonctionne même en production)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // F12 ou Ctrl+Shift+I pour ouvrir DevTools
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
      event.preventDefault();
    }
  });

  // Charger l'URL appropriée
  const url = 'http://127.0.0.1:3000/';
  
  if (isDev) {
    logger.info('[WINDOW] Mode dev - chargement immédiat:', url);
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    logger.info('[WINDOW] Mode prod - attente serveur...');
    waitForServer(mainWindow, url, logger);
    // NOTE 7 déc 2025: DevTools désactivés en production (diagnostic terminé)
  }
  
  return mainWindow;
}

/**
 * Attend que le serveur soit prêt avant de charger l'URL
 * 
 * @param {BrowserWindow} window - Fenêtre cible
 * @param {string} url - URL à charger
 * @param {Object} logger - Logger
 * @param {number} retries - Nombre de retries restants
 * @param {number} delayMs - Délai entre retries
 */
function waitForServer(window, url, logger, onReady, retries = 60, delayMs = 500) {
  http.get(url, (res) => {
    if (res.statusCode && res.statusCode < 500) {
      logger.info(`[WINDOW] ✅ Serveur prêt (HTTP ${res.statusCode})`);
      window.loadURL(url);
      // Appeler callback si fourni
      if (onReady && typeof onReady === 'function') {
        window.webContents.once('did-finish-load', onReady);
      }
    } else if (retries > 0) {
      logger.warn(`[WINDOW] Serveur HTTP ${res.statusCode} - Retry ${60 - retries}/60`);
      setTimeout(() => waitForServer(window, url, logger, onReady, retries - 1, delayMs), delayMs);
    } else {
      logger.error('[WINDOW] ❌ Serveur indisponible après 30s');
      window.loadURL(url);  // Charger quand même (affichera erreur Next.js)
      if (onReady && typeof onReady === 'function') {
        window.webContents.once('did-finish-load', onReady);
      }
    }
  }).on('error', (err) => {
    if (retries > 0) {
      if (retries % 10 === 0) {
        logger.warn(`[WINDOW] Attente serveur... Retry ${60 - retries}/60`);
      }
      setTimeout(() => waitForServer(window, url, logger, onReady, retries - 1, delayMs), delayMs);
    } else {
      logger.error(`[WINDOW] ❌ Échec connexion après 30s: ${err.message}`);
      window.loadURL(url);  // Charger quand même
      if (onReady && typeof onReady === 'function') {
        window.webContents.once('did-finish-load', onReady);
      }
    }
  });
}

module.exports = {
  createWindow,
  waitForServer
};
