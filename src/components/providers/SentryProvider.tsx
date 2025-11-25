'use client';

/**
 * Monitoring Provider - Native (15/11/2025)
 * Sentry désactivé - Monitoring natif actif
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export function SentryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Log confirmation monitoring natif
    if (process.env.NODE_ENV === 'development') {
      logger.info('[MONITORING] Monitoring natif actif');
    }
  }, []);

  return <>{children}</>;
}
