"use client";

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'atelier_advanced_mode';
const EVENT_NAME = 'atelier:advanced-mode-changed';

/**
 * Mode "Avancé" — préférence UI locale (par machine).
 *
 * OFF par défaut : l'atelier voit une interface épurée, sans jargon technique.
 * ON : révèle les options techniques (identifiants machine, 2FA, mode maintenance,
 * clés brutes, etc.) pour le SAV / utilisateurs avertis.
 *
 * Persisté en localStorage, synchronisé entre composants via un CustomEvent.
 */
export function useAdvancedMode(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      /* localStorage indisponible */
    }
    const handler = (e: Event) => {
      setEnabled((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const set = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
    setEnabled(value);
    window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: value }));
  }, []);

  return [enabled, set];
}
