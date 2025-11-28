"use client";

import React, { createContext, useContext, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Context pour gérer les mises à jour de stock en temps réel
 * Pattern: Event Bus avec Optimistic Updates
 */

interface StockUpdate {
  itemId: string;
  sku?: string;
  name?: string;
  quantityChange: number; // Négatif pour décrémentation
  timestamp: number;
}

interface StockUpdateContextType {
  notifyStockUpdate: (update: StockUpdate) => void;
  subscribeToStockUpdates: (callback: (update: StockUpdate) => void) => () => void;
}

const StockUpdateContext = createContext<StockUpdateContextType | null>(null);

/**
 * Provider pour les mises à jour de stock
 * Utilise un event bus simple avec callbacks
 */
export function StockUpdateProvider({ children }: { children: React.ReactNode }) {
  const listeners = React.useRef<Set<(update: StockUpdate) => void>>(new Set());

  const notifyStockUpdate = useCallback((update: StockUpdate) => {
    logger.info('[STOCK-EVENT] Broadcasting update', { update });
    listeners.current.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('[STOCK-EVENT] Listener error', { error: errorMessage });
      }
    });
  }, []);

  const subscribeToStockUpdates = useCallback((callback: (update: StockUpdate) => void) => {
    listeners.current.add(callback);
    logger.info('[STOCK-EVENT] Listener subscribed. Total', { total: listeners.current.size });
    
    // Retourner fonction de cleanup
    return () => {
      listeners.current.delete(callback);
      logger.info('[STOCK-EVENT] Listener unsubscribed. Total', { total: listeners.current.size });
    };
  }, []);

  return (
    <StockUpdateContext.Provider value={{ notifyStockUpdate, subscribeToStockUpdates }}>
      {children}
    </StockUpdateContext.Provider>
  );
}

/**
 * Hook pour notifier une mise à jour de stock
 */
export function useStockUpdateNotifier() {
  const context = useContext(StockUpdateContext);
  if (!context) {
    throw new Error('useStockUpdateNotifier must be used within StockUpdateProvider');
  }
  return context.notifyStockUpdate;
}

/**
 * Hook pour écouter les mises à jour de stock
 */
export function useStockUpdateListener(callback: (update: StockUpdate) => void) {
  const context = useContext(StockUpdateContext);
  if (!context) {
    throw new Error('useStockUpdateListener must be used within StockUpdateProvider');
  }

  React.useEffect(() => {
    return context.subscribeToStockUpdates(callback);
  }, [callback, context]);
}
