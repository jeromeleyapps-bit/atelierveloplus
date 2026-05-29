/**
 * Sentry — capture des erreurs en production, opt-in via env.
 *
 * Activation : renseigner `SENTRY_DSN` (côté serveur Next) et `NEXT_PUBLIC_SENTRY_DSN`
 * (côté renderer) dans `.env.production`. Sans DSN, ce module est un no-op total.
 *
 * RGPD : Sentry capture les exceptions + breadcrumbs. Pas de PII tant qu'on ne l'envoie
 * pas explicitement. Voir `sendDefaultPii: false` ci-dessous.
 */
import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

let initialized = false;

export function initSentry(side: 'server' | 'client'): void {
  if (initialized) return;
  const dsn = side === 'server'
    ? process.env.SENTRY_DSN
    : process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // Pas de DSN → désactivé silencieusement.
    return;
  }
  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE === '1',
    });
    initialized = true;
    logger.info('[sentry] initialized', { side });
  } catch (e) {
    logger.error('[sentry] init failed', { error: String(e) });
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
