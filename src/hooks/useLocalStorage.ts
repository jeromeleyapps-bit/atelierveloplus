import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook personnalisé pour gérer le localStorage avec React state
 * Pattern validé: usehooks.com + React Hook Form
 * 
 * @param key - Clé localStorage
 * @param initialValue - Valeur par défaut
 * @returns [valeur, setter] comme useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // État initialisé depuis localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.warn(`useLocalStorage: Error loading key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter qui persiste dans localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Supporter les fonctions comme useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Sauver state
        setStoredValue(valueToStore);
        
        // Sauver localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        logger.error(`useLocalStorage: Error saving key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue];
}
