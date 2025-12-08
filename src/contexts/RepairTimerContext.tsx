"use client";

/**
 * RepairTimerContext - Global persistent repair timer
 * 
 * Best Practices:
 * - Context for global state (React docs)
 * - localStorage for persistence across reloads
 * - useInterval for accurate timing
 * - Color-coded feedback (0-59min: green, 1h-2h: orange, 2h+: red)
 * 
 * References:
 * - https://react.dev/reference/react/useContext
 * - https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface RepairTimer {
  ticketId: string;
  startTime: number; // timestamp
  pausedAt?: number; // timestamp when paused
  pausedDuration: number; // total paused time in ms
}

interface RepairTimerContextType {
  activeTimer: RepairTimer | null;
  elapsed: string; // HH:MM format
  elapsedMinutes: number;
  elapsedHours: number; // Total hours (decimal)
  color: 'success' | 'warning' | 'error';
  startRepair: (ticketId: string) => void;
  stopRepair: (onStop?: (ticketId: string, durationMinutes: number) => void | Promise<void>) => Promise<void>;
  pauseRepair: () => void;
  resumeRepair: () => void;
  isActive: boolean;
  isPaused: boolean;
}

const RepairTimerContext = createContext<RepairTimerContextType | undefined>(undefined);

const STORAGE_KEY = 'repairTimer';

export function RepairTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<RepairTimer | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure pausedDuration exists (backward compatibility)
        if (parsed.pausedDuration === undefined) {
          parsed.pausedDuration = 0;
        }
        setActiveTimer(parsed);
      }
    } catch (e) {
      logger.error('Error loading repair timer:', e);
    }
  }, []);

  // Update timer every second ONLY if active
  useEffect(() => {
    if (!activeTimer) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTimer]);

  // Calculate elapsed time
  const isPaused = activeTimer?.pausedAt != null;
  
  const elapsedMinutes = activeTimer ? (() => {
    const now = isPaused ? activeTimer.pausedAt! : currentTime;
    const elapsed = now - activeTimer.startTime - activeTimer.pausedDuration;
    return Math.floor(elapsed / 1000 / 60);
  })() : 0;

  const elapsedHours = elapsedMinutes / 60;

  const elapsed = activeTimer ? (() => {
    const now = isPaused ? activeTimer.pausedAt! : currentTime;
    const elapsedMs = now - activeTimer.startTime - activeTimer.pausedDuration;
    const totalMinutes = Math.floor(elapsedMs / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  })() : '00:00';

  // Determine color based on elapsed time
  const color: 'success' | 'warning' | 'error' = 
    elapsedMinutes < 60 ? 'success' :
    elapsedMinutes < 120 ? 'warning' :
    'error';

  // Start repair timer
  const startRepair = useCallback((ticketId: string) => {
    const timer: RepairTimer = {
      ticketId,
      startTime: Date.now(),
      pausedDuration: 0,
    };
    setActiveTimer(timer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  }, []);

  // Pause repair timer
  const pauseRepair = useCallback(() => {
    if (!activeTimer || activeTimer.pausedAt) return;
    const pausedTimer = { ...activeTimer, pausedAt: Date.now() };
    setActiveTimer(pausedTimer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pausedTimer));
  }, [activeTimer]);

  // Resume repair timer
  const resumeRepair = useCallback(() => {
    if (!activeTimer || !activeTimer.pausedAt) return;
    const pausedDuration = activeTimer.pausedDuration + (Date.now() - activeTimer.pausedAt);
    const resumedTimer = {
      ...activeTimer,
      pausedAt: undefined,
      pausedDuration,
    };
    setActiveTimer(resumedTimer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumedTimer));
  }, [activeTimer]);

  // Stop repair timer
  const stopRepair = useCallback(async (onStop?: (ticketId: string, durationMinutes: number) => void | Promise<void>) => {
    if (!activeTimer) return;
    
    // Calculer durée totale
    const now = isPaused ? activeTimer.pausedAt! : Date.now();
    const totalElapsedMs = now - activeTimer.startTime - activeTimer.pausedDuration;
    const totalMinutes = Math.floor(totalElapsedMs / 1000 / 60);
    
    // CRITIQUE: Stopper et nettoyer AVANT le callback
    // pour éviter race condition si callback recharge la page
    const ticketIdToStop = activeTimer.ticketId;
    setActiveTimer(null);
    localStorage.removeItem(STORAGE_KEY);
    logger.info('[RepairTimer] Timer arrêté et nettoyé du localStorage');
    
    // Appeler callback si fournie (APRÈS nettoyage)
    if (onStop) {
      try {
        await onStop(ticketIdToStop, totalMinutes);
      } catch (error) {
        logger.error('Error in onStop callback:', error);
      }
    }
  }, [activeTimer, isPaused]);

  return (
    <RepairTimerContext.Provider
      value={{
        activeTimer,
        elapsed,
        elapsedMinutes,
        elapsedHours,
        color,
        startRepair,
        stopRepair,
        pauseRepair,
        resumeRepair,
        isActive: !!activeTimer,
        isPaused,
      }}
    >
      {children}
    </RepairTimerContext.Provider>
  );
}

export function useRepairTimer() {
  const context = useContext(RepairTimerContext);
  if (!context) {
    throw new Error('useRepairTimer must be used within RepairTimerProvider');
  }
  return context;
}
