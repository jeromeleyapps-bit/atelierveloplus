/**
 * Logger Configuration Centralisée
 * 
 * CAUSE: electron-log utilisé partout, config dupliquée
 * SOLUTION: Config unique réutilisable
 * BÉNÉFICE: Maintenance simplifiée, logs cohérents
 */

const log = require('electron-log');
const path = require('path');
const { app: _app } = require('electron');

/**
 * Configure electron-log avec settings optimaux
 * 
 * @param {string} dataPath - Chemin userData (AppData)
 * @returns {Object} - Logger configuré
 */
function configureLogger(dataPath) {
  // Niveau de log
  log.transports.file.level = 'debug';
  log.transports.console.level = 'debug';
  
  // Format
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
  
  // Taille max + rotation
  log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
  
  // Chemin personnalisé si fourni
  if (dataPath) {
    const logsDir = path.join(dataPath, 'logs');
    log.transports.file.resolvePathFn = () => {
      return path.join(logsDir, 'production.log');
    };
  }
  
  log.info('[LOGGER] Configuration applied');
  
  return log;
}

/**
 * Crée un logger préconfiguré pour dev
 * @returns {Object} - Logger dev
 */
function createDevLogger() {
  log.transports.console.level = 'debug';
  log.transports.file.level = false; // Pas de fichier en dev
  
  return log;
}

module.exports = {
  configureLogger,
  createDevLogger,
  log // Export direct pour import simple
};
