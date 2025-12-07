/**
 * Hook useDebounce - Debounce une valeur pour éviter les appels excessifs
 * 
 * Usage:
 * const debouncedSearch = useDebounce(searchQuery, 300);
 * 
 * Bénéfices:
 * - Réduit les requêtes API/filtrage
 * - Améliore les performances
 * - Meilleure UX (pas de lag)
 */

import { useState, useEffect } from 'react';

/**
 * Debounce une valeur avec un délai configurable
 * @param value - Valeur à debouncer
 * @param delay - Délai en ms (défaut: 300ms)
 * @returns Valeur debouncée
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: annuler le timer si la valeur change avant le délai
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour debouncer un callback
 * @param callback - Fonction à debouncer
 * @param delay - Délai en ms
 * @returns Fonction debouncée
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  }) as T;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return debouncedCallback;
}

export default useDebounce;
