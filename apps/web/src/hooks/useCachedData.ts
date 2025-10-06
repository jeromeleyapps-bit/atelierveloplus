import { useState, useEffect, useCallback } from "react";
import { withCache, clearCache } from "@/lib/cache";

type UseCachedDataResult<T> = {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

/**
 * Hook personnalisé pour gérer les données avec mise en cache
 * @param key Clé unique pour identifier les données en cache
 * @param fetcher Fonction asynchrone pour récupérer les données
 * @param options Options de configuration (ttl, enabled, onError)
 * @returns Les données, l'état de chargement, les erreurs et une fonction de rechargement
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {},
): UseCachedDataResult<T> {
  const { ttl, enabled = true, onError } = options;
  const [data, setData] = useState<T | null>(null);
  // Important: démarrer à true pour éviter un rendu SSR/CSR différent (hydration mismatch)
  // Le fetch est lancé en useEffect côté client et fera passer à false ensuite
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await withCache(key, fetcher, { ttl });
      setData(result);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("Une erreur inconnue est survenue");
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled, onError]);

  const refetch = useCallback(async (): Promise<void> => {
    // Supprimer les données en cache avant de recharger
    clearCache(key);
    await fetchData();
  }, [key, fetchData]);

  // Effet pour charger les données au montage et quand les dépendances changent
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
