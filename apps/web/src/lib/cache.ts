type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry<unknown>>();

export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number } = {},
): Promise<T> {
  const now = Date.now();
  const cacheKey = `cache:${key}`;
  const ttl = options.ttl || CACHE_DURATION;

  // Vérifier si la donnée est en cache et toujours valide
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < ttl) {
    return cached.data as T;
  }

  // Sinon, récupérer les données et les mettre en cache
  try {
    const data = await fetcher();
    cache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    // En cas d'erreur, retourner les données en cache si disponibles
    if (cached) {
      console.warn(`Using cached data after error for key: ${key}`, error);
      return cached.data as T;
    }
    throw error;
  }
}

// Nettoyer le cache périodiquement
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, CACHE_DURATION);

export function clearCache(key?: string) {
  if (key) {
    cache.delete(`cache:${key}`);
  } else {
    cache.clear();
  }
}
