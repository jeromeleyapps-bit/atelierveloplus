/**
 * Server IPC Handlers
 * 
 * RESPONSABILITÉ: Handlers IPC serveur local (localhttp:*)
 */

const { ipcMain } = require('electron');
const http = require('http');
const path = require('path');

/**
 * Vérifie si un port répond
 * 
 * @param {string} url - URL à tester
 * @param {number} timeoutMs - Timeout en ms
 * @returns {Promise<boolean>} - true si répond
 */
function isPortResponding(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode && res.statusCode < 500);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Enregistre les handlers IPC serveur
 * 
 * @param {Object} serverManager - Gestionnaire serveur
 * @param {Function} serverManager.start - Démarrer serveur
 * @param {Function} serverManager.stop - Arrêter serveur
 * @param {Function} serverManager.getProcess - Obtenir processus
 * @param {Object} config - Configuration
 * @param {boolean} config.isDev - Mode développement
 * @param {string} config.resourcesPath - Chemin resources
 * @param {Object} logger - Logger
 */
function registerServerHandlers(serverManager, config, logger) {
  const { isDev, resourcesPath } = config;
  
  // Statut serveur HTTP local
  ipcMain.handle('localhttp:status', async () => {
    const running = await isPortResponding('http://127.0.0.1:3000/');
    const process = serverManager.getProcess();
    const exists = running || (!!process && !process.killed);
    const serverEntry = !isDev ? path.join(resourcesPath, 'web', 'server.js') : undefined;
    
    return { running, exists, serverEntry };
  });
  
  // Démarrer serveur HTTP
  ipcMain.handle('localhttp:start', async () => {
    try {
      // Vérifier si déjà running
      if (await isPortResponding('http://127.0.0.1:3000/')) {
        logger.info('[IPC] Serveur déjà actif');
        return { ok: true, already: true };
      }
      
      // Démarrer
      logger.info('[IPC] Démarrage serveur...');
      serverManager.start();
      return { ok: true };
      
    } catch (error) {
      logger.error('[IPC] localhttp:start erreur:', error.message);
      return { ok: false, message: error.message };
    }
  });
  
  // Arrêter serveur HTTP
  ipcMain.handle('localhttp:stop', async () => {
    try {
      logger.info('[IPC] Arrêt serveur...');
      serverManager.stop();
      return { ok: true };
    } catch (error) {
      logger.error('[IPC] localhttp:stop erreur:', error.message);
      return { ok: false, message: error.message };
    }
  });
  
  logger.info('[IPC] Server handlers enregistrés');
}

module.exports = {
  registerServerHandlers,
  isPortResponding
};
