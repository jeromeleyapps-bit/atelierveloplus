/**
 * Logger Centralisé - Atelier Vélo+
 * 
 * Remplace console.log par un système de logging structuré
 * avec niveaux et filtrage
 * 
 * ⚠️ IMPORTANT: Ne PAS utiliser electron-log dans ce fichier
 * electron-log n'est pas disponible dans le renderer process Electron
 * et cause l'erreur "Cannot set properties of undefined (setting 'level')"
 * 
 * Pour le code serveur uniquement, utiliser logger-server.ts qui utilise
 * electron-log avec import conditionnel sécurisé.
 * 
 * @module lib/logger
 */

// Types de log
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Métadonnées optionnelles
export interface LogMeta {
  [key: string]: unknown;
}

// Configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
 * Logger principal
 * Utilise uniquement console.* (pas electron-log)
 */
export const logger = {
  /**
   * Log de débogage (développement uniquement)
   * @param message - Message à logger
   * @param meta - Métadonnées optionnelles
   */
  debug: (message: string, meta?: LogMeta) => {
    if (IS_PRODUCTION) return;

    const sanitized = sanitizeMeta(meta);
    // eslint-disable-next-line no-console -- logger uses console as transport
    console.log(formatMessage('debug', message, sanitized));
  },

  /**
   * Log d'information
   * @param message - Message à logger
   * @param meta - Métadonnées optionnelles
   */
  info: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    // eslint-disable-next-line no-console -- logger uses console as transport
    console.log(formatMessage('info', message, sanitized));
  },

  /**
   * Log d'avertissement
   * @param message - Message à logger
   * @param meta - Métadonnées optionnelles
   */
  warn: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    console.warn(formatMessage('warn', message, sanitized));
  },

  /**
   * Log d'erreur
   * @param message - Message à logger
   * @param meta - Métadonnées optionnelles (peut inclure error object)
   */
  error: (message: string, meta?: LogMeta) => {
    const sanitized = sanitizeMeta(meta);
    console.error(formatMessage('error', message, sanitized));
  },
};

/**
 * Helper pour logger les performances
 * @param label - Label de l'opération
 * @param fn - Fonction à mesurer
 * @returns Résultat de la fonction
 */
export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    logger.info(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    
    if (duration > 1000) {
      logger.warn(`Slow operation: ${label}`, { duration: `${duration.toFixed(2)}ms` });
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Failed: ${label}`, { 
      duration: `${duration.toFixed(2)}ms`,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Helper pour logger les requêtes API
 * @param method - Méthode HTTP
 * @param endpoint - Endpoint appelé
 * @param meta - Métadonnées optionnelles
 */
export function logApiRequest(
  method: string,
  endpoint: string,
  meta?: LogMeta
) {
  logger.info(`API Request: ${method} ${endpoint}`, meta);
}

/**
 * Helper pour logger les réponses API
 * @param method - Méthode HTTP
 * @param endpoint - Endpoint appelé
 * @param status - Status HTTP
 * @param meta - Métadonnées optionnelles
 */
export function logApiResponse(
  method: string,
  endpoint: string,
  status: number,
  meta?: LogMeta
) {
  const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
  logger[level](`API Response: ${method} ${endpoint} - ${status}`, meta);
}

// Export par défaut
export default logger;