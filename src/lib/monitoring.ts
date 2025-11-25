/**
 * Monitoring Frontend - Native (15/11/2025)
 * Sentry désactivé - Utiliser monitoring-native.ts côté serveur
 * Error tracking pour UI React (console uniquement)
 */

/**
 * Initialiser monitoring (stub pour compatibilité)
 */
export function initSentry() {
  logger.info('[MONITORING] Monitoring natif actif (Sentry désactivé)');
}

/**
 * Capturer erreur React
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  logger.error('[MONITORING] Erreur capturée:', error);
  if (context) {
    logger.error('[MONITORING] Contexte:', context);
  }
}

/**
 * Stub Sentry pour compatibilité ErrorBoundary
 */
export const Sentry = {
  isInitialized: () => false,
  captureException: (error: Error, options?: unknown) => {
    logger.error('[MONITORING] Exception:', error, options);
  },
};
