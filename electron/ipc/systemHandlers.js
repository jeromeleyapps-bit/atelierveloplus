/**
 * System IPC Handlers
 * 
 * RESPONSABILITÉ: Handlers IPC système (paths, reset, etc.)
 */

const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

/**
 * Enregistre les handlers IPC système
 * 
 * @param {Object} config - Configuration
 * @param {string} config.dataPath - Chemin userData
 * @param {string} config.dbPath - Chemin base de données
 * @param {Object} logger - Logger
 */
function registerSystemHandlers(config, logger) {
  const { dataPath, dbPath } = config;
  
  // Ouvrir un chemin avec l'application par défaut
  ipcMain.handle('open:path', async (e, p) => {
    try {
      if (!p) return { ok: false, message: 'Chemin manquant' };
      const res = await shell.openPath(p);
      return res ? { ok: false, message: res } : { ok: true };
    } catch (error) {
      logger.error('[IPC] open:path erreur:', error.message);
      return { ok: false, message: error.message };
    }
  });
  
  // Obtenir chemin userData
  ipcMain.handle('get-app-path', () => {
    logger.log('[IPC] get-app-path:', dataPath);
    return dataPath;
  });
  
  // Obtenir chemin base de données
  ipcMain.handle('get-db-path', () => {
    logger.log('[IPC] get-db-path:', dbPath);
    return dbPath;
  });
  
  // Reset application (supprime DB + données)
  ipcMain.handle('app:reset', async () => {
    try {
      logger.warn('[IPC] app:reset demandé');
      
      const _dataDir = path.dirname(dbPath);
      
      // Supprimer DB
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
        logger.info('[IPC] DB supprimée:', dbPath);
      }
      
      // Supprimer dossiers optionnels
      const toClean = ['logs', 'uploads', 'cache'];
      toClean.forEach(dir => {
        const dirPath = path.join(dataPath, dir);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          logger.info('[IPC] Dossier nettoyé:', dir);
        }
      });
      
      logger.info('[IPC] ✅ Reset terminé');
      return { ok: true };
      
    } catch (error) {
      logger.error('[IPC] app:reset erreur:', error.message);
      return { ok: false, message: error.message };
    }
  });
  
  logger.info('[IPC] System handlers enregistrés');
}

module.exports = {
  registerSystemHandlers
};
