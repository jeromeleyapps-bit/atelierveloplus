import { logger } from '@/lib/logger';
/**
 * Instrumentation Next.js
 * Exécuté au démarrage de l'application (serveur Next.js)
 * Utilisé pour démarrer le scheduler de jobs automatiques
 */

export async function register() {
  // Ne démarrer le scheduler QUE côté serveur (pas côté Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logger.info('[INSTRUMENTATION] 🚀 Initialisation serveur Next.js...');
    
    // Dynamically import scheduler (avoid loading on Edge)
    const { startScheduler } = await import('./lib/scheduler');
    
    try {
      startScheduler();
      logger.info('[INSTRUMENTATION] ✅ Scheduler communications démarré');
    } catch (error) {
      logger.error('[INSTRUMENTATION] ❌ Erreur démarrage scheduler:', error);
    }
  }
}
