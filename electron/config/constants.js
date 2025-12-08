/**
 * Configuration Constants
 * 
 * CAUSE: Valeurs hardcodées éparpillées dans main.js
 * SOLUTION: Centralisation configuration
 * BÉNÉFICE: Maintenance simplifiée, pas de magic numbers
 */

const _path = require('path');

/**
 * Ports réseau
 */
const PORTS = {
  NEXT_DEV: 3000,
  NEXT_PROD: 3000
};

/**
 * Timeouts (millisecondes)
 */
const _TIMEOUTS = {
  SERVER_STARTUP: 30000,    // 30s max attente serveur
  SERVER_RETRY: 2000,       // 2s entre retries
  PROCESS_KILL: 2000,       // 2s attente après kill
  WINDOW_READY: 1000        // 1s attente fenêtre ready
};

/**
 * Chemins critiques (relatifs à resourcesPath)
 */
const PATHS = {
  WEB: 'web',
  SERVER: 'web/server.js',
  NODE_MODULES: 'web/node_modules',
  NPM_MODULES: 'web/npm_modules',
  ENV_PRODUCTION: 'web/.env.production'
};

/**
 * Configuration fenêtre principale
 */
const WINDOW_CONFIG = {
  width: 1400,
  height: 900,
  minWidth: 1200,
  minHeight: 700,
  backgroundColor: '#1a1a1a',
  
  webPreferences: {
    nodeIntegration: false,           // ✅ Sécurité
    contextIsolation: true,           // ✅ Sécurité
    sandbox: false,                    // ❌ Désactivé (fix inputs readonly desktop apps)
    webSecurity: true,                // ✅ Protection XSS/CORS
    preload: null                      // Défini dynamiquement
  }
};

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 10,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 5000,
  BACKOFF_MULTIPLIER: 1.5
};

/**
 * Logs configuration
 */
const LOGS_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024,  // 10MB
  LEVEL_DEV: 'debug',
  LEVEL_PROD: 'info',
  FORMAT: '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'
};

/**
 * Sécurité
 */
const SECURITY = {
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  CSP_DIRECTIVES: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", "http://localhost:3000"]
  }
};

module.exports = {
  PORTS,
  // TIMEOUTS: _TIMEOUTS, // Unused
  PATHS,
  WINDOW_CONFIG,
  RETRY_CONFIG,
  LOGS_CONFIG,
  SECURITY
};
