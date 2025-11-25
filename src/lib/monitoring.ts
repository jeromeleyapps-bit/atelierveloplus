/**
 * Monitoring Frontend - Native (15/11/2025)
 * Sentry désactivé - Utiliser monitoring-native.ts côté serveur
 * Error tracking pour UI React (console uniquement)
 */

/**
 * Initialiser monitoring (stub pour compatibilité)
 */
export function initSentry() {
  console.log('[MONITORING] Monitoring natif actif (Sentry désactivé)');
}

/**
 * Capturer erreur React
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  console.error('[MONITORING] Erreur capturée:', error);
  if (context) {
    console.error('[MONITORING] Contexte:', context);
  }
}

/**
 * Stub Sentry pour compatibilité ErrorBoundary
 */
export const Sentry = {
  isInitialized: () => false,
  captureException: (error: Error, options?: unknown) => {
    console.error('[MONITORING] Exception:', error, options);
  },
};
