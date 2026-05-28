/**
 * Logger Serveur - Atelier Vélo+
 * 
 * Version serveur uniquement du logger avec support electron-log
 * 
 * ✅ BEST PRACTICE: Utilise 'server-only' pour empêcher l'import côté client
 * Documentation: https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#server-only-and-client-only
 * 
 * @module lib/logger-server
 */

// ✅ BEST PRACTICE: Empêcher l'import de ce module côté client
// Si un composant client tente d'importer ce module, Next.js générera une erreur de compilation
import 'server-only';

import type { LogLevel, LogMeta } from './logger';

// Configuration
const IS_PRODUCTION = 
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

// Cache pour electron-log (chargé dynamiquement)
let electronLogCache: any = null;
let electronLogConfigured = false;

/**
 * Charge electron-log de manière sécurisée
 * Cette fonction ne sera jamais exécutée côté client grâce à 'server-only'
 * 
 * ✅ BEST PRACTICE: Import conditionnel avec vérification runtime
 */
function getElectronLog(): any {
  // Double vérification de sécurité (même si server-only devrait suffire)
  if (typeof window !== 'undefined') {
    return null;
  }

  if (typeof require === 'undefined') {
    return null;
  }

  // Si déjà chargé, retourner le cache
  if (electronLogCache) {
    return electronLogCache;
  }

  try {
    // ✅ SOLUTION DÉFINITIVE: Utiliser une construction dynamique pour empêcher
    // webpack d'analyser le require() même avec server-only
    // Construire le nom du module de manière dynamique
    const moduleParts = ['electron', '-', 'log'];
    const moduleName = moduleParts.join('');
    
    // Utiliser Function constructor pour empêcher l'analyse statique
    // webpack ne peut pas analyser le code dans Function()
    const getRequire = new Function('return typeof require !== "undefined" ? require : null');
    const nodeRequire = getRequire();
    
    if (!nodeRequire) {
      return null;
    }
    
    // Charger le module via Function pour empêcher l'analyse statique
    const loadModule = new Function('require', 'moduleName', 'try { return require(moduleName); } catch(e) { return null; }');
    const electronLog = loadModule(nodeRequire, moduleName);
    
    if (!electronLog) {
      return null;
    }
    
    // Configuration electron-log (une seule fois)
    if (!electronLogConfigured && electronLog) {
      if (electronLog.transports?.file) {
        electronLog.transports.file.level = IS_PRODUCTION ? 'info' : 'debug';
      }
      if (electronLog.transports?.console) {
        electronLog.transports.console.level = IS_PRODUCTION ? 'warn' : 'debug';
      }
      electronLogConfigured = true;
    }
    
    electronLogCache = electronLog;
    return electronLog;
  } catch (error) {
    // Si l'import échoue (module non disponible), retourner null
    return null;
  }
}

/**
 * Filtre les données sensibles des métadonnées
 */
function sanitizeMeta(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;

  const sanitized = { ...meta };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Formate le message de log
 */
function formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

/**
 * Logger serveur avec support electron-log
 * 
 * ✅ BEST PRACTICE: API identique à logger.ts pour compatibilité
 */
export const loggerServer = {
  /**
   * Log de débogage (développement uniquement)
   */
  debug: (message: string, meta?: LogMeta) => {
    if (IS_PRODUCTION) return;

    const sanitized = sanitizeMeta(meta);
    const electronLog = getElectronLog();
    
    if (electronLog) {
      electronLog.debug(message, sanitized);
    } else {
      // eslint-disable-next-line no-console -- fallback when electron-log unavailable
      console.log(formatMessage('debug', message, sanitized));
    }
  },

  /**
   * Log d'information
   */
  info: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    const electronLog = getElectronLog();
    
    if (electronLog) {
      electronLog.info(message, sanitized);
    } else {
      // eslint-disable-next-line no-console -- fallback when electron-log unavailable
      console.log(formatMessage('info', message, sanitized));
    }
  },

  /**
   * Log d'avertissement
   */
  warn: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    const electronLog = getElectronLog();
    
    if (electronLog) {
      electronLog.warn(message, sanitized);
    } else {
      console.warn(formatMessage('warn', message, sanitized));
    }
  },

  /**
   * Log d'erreur
   */
  error: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    const electronLog = getElectronLog();
    
    if (electronLog) {
      electronLog.error(message, sanitized);
    } else {
      console.error(formatMessage('error', message, sanitized));
    }
  },
};

export default loggerServer;

