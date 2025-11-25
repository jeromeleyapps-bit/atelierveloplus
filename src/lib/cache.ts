/**
 * Cache en mémoire pour settings et données fréquemment accédées
 * OPTIMISATION PERFORMANCE - 16 novembre 2025
 */

const cache = new Map<string, { data: unknown; expires: number }>();

/**
 * TTL par défaut: 5 minutes
 */
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * Récupérer une valeur du cache
 */
export function getCache<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  // Cache expiré ou inexistant
  if (cached) {
    cache.delete(key); // Nettoyer cache expiré
  }
  return null;
}

/**
 * Mettre une valeur en cache
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
}

/**
 * Invalider un cache spécifique
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalider tous les caches d'un pattern
 */
export function invalidateCachePattern(pattern: string): void {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Nettoyer les caches expirés (appelé périodiquement)
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (value.expires <= now) {
      cache.delete(key);
    }
  }
}

/**
 * Nettoyer tous les caches
 */
export function clearAllCache(): void {
  cache.clear();
}

// Nettoyer les caches expirés toutes les 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanExpiredCache, 10 * 60 * 1000);
}

/**
 * Wrapper pour utiliser une fonction avec cache
 * Compatible avec useCachedData hook
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number } = {}
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const data = await fetcher();
  setCache(key, data, options.ttl);
  return data;
}

/**
 * Alias pour invalidateCache (compatibilité)
 */
export function clearCache(key: string): void {
  invalidateCache(key);
}
