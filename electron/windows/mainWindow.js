/**
 * Main Window Management
 * 
 * RESPONSABILITÉ: Création et gestion fenêtre principale
 * ISOLATION: BrowserWindow + configuration + lifecycle
 */

const { BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');

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
      webSecurity: true,           // ✅ Sécurité: Protection XSS/CORS
      preload: path.join(__dirname, '..', 'preload.js')
    },
    show: false  // Afficher seulement quand prêt
  });
  
  // Force logout au démarrage (vide localStorage JWT)
  // RAISON: Éviter JWT obsolètes après mise à jour
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user');
      console.log('[ELECTRON] Logout forcé au démarrage');
    `).catch(err => logger.warn('[WINDOW] Erreur logout:', err));
  });
  
  // Afficher fenêtre quand contenu prêt (évite flash blanc)
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    logger.info('[WINDOW] Fenêtre affichée');
  });
  
  // Nettoyage à la fermeture
  mainWindow.on('closed', () => {
    logger.info('[WINDOW] Fenêtre fermée');
  });

  // Cacher le menu par défaut
  Menu.setApplicationMenu(null);

  // Charger l'URL appropriée
  const url = 'http://127.0.0.1:3000/';
  
  if (isDev) {
    logger.info('[WINDOW] Mode dev - chargement immédiat:', url);
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    logger.info('[WINDOW] Mode prod - attente serveur...');
    waitForServer(mainWindow, url, logger);
    // DevTools désactivé en production (15/11/2025)
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
function waitForServer(window, url, logger, retries = 60, delayMs = 500) {
  http.get(url, (res) => {
    if (res.statusCode && res.statusCode < 500) {
      logger.info(`[WINDOW] ✅ Serveur prêt (HTTP ${res.statusCode})`);
      window.loadURL(url);
    } else if (retries > 0) {
      logger.warn(`[WINDOW] Serveur HTTP ${res.statusCode} - Retry ${60 - retries}/60`);
      setTimeout(() => waitForServer(window, url, logger, retries - 1, delayMs), delayMs);
    } else {
      logger.error('[WINDOW] ❌ Serveur indisponible après 30s');
      window.loadURL(url);  // Charger quand même (affichera erreur Next.js)
    }
  }).on('error', (err) => {
    if (retries > 0) {
      if (retries % 10 === 0) {
        logger.warn(`[WINDOW] Attente serveur... Retry ${60 - retries}/60`);
      }
      setTimeout(() => waitForServer(window, url, logger, retries - 1, delayMs), delayMs);
    } else {
      logger.error(`[WINDOW] ❌ Échec connexion après 30s: ${err.message}`);
      window.loadURL(url);  // Charger quand même
    }
  });
}

module.exports = {
  createWindow,
  waitForServer
};
