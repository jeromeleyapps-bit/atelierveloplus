import {
  getCache,
  setCache,
  invalidateCache,
  invalidateCachePattern,
  clearAllCache,
  clearCache,
  withCache,
  cleanExpiredCache,
} from '@/lib/cache';

describe('Cache Utilities', () => {
  beforeEach(() => {
    clearAllCache();
  });

  describe('setCache and getCache', () => {
    it('should set and get cache value', () => {
      setCache('test-key', 'test-value');
      const value = getCache<string>('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      const value = getCache('non-existent');
      expect(value).toBeNull();
    });

    it('should store different types', () => {
      setCache('string', 'value');
      setCache('number', 123);
      setCache('object', { key: 'value' });
      setCache('array', [1, 2, 3]);

      expect(getCache<string>('string')).toBe('value');
      expect(getCache<number>('number')).toBe(123);
      expect(getCache<{ key: string }>('object')).toEqual({ key: 'value' });
      expect(getCache<number[]>('array')).toEqual([1, 2, 3]);
    });

    it('should use custom TTL', (done) => {
      setCache('short-ttl', 'value', 100); // 100ms TTL
      expect(getCache('short-ttl')).toBe('value');

      setTimeout(() => {
        const value = getCache('short-ttl');
        expect(value).toBeNull(); // Should be expired
        done();
      }, 150);
    });
  });

  describe('invalidateCache', () => {
    it('should remove cache entry', () => {
      setCache('key1', 'value1');
      setCache('key2', 'value2');

      invalidateCache('key1');

      expect(getCache('key1')).toBeNull();
      expect(getCache('key2')).toBe('value2');
    });
  });

  describe('invalidateCachePattern', () => {
    it('should remove cache entries matching pattern', () => {
      setCache('user:1', 'value1');
      setCache('user:2', 'value2');
      setCache('admin:1', 'value3');

      invalidateCachePattern('user:.*');

      expect(getCache('user:1')).toBeNull();
      expect(getCache('user:2')).toBeNull();
      expect(getCache('admin:1')).toBe('value3');
    });
  });

  describe('clearAllCache', () => {
    it('should remove all cache entries', () => {
      setCache('key1', 'value1');
      setCache('key2', 'value2');
      setCache('key3', 'value3');

      clearAllCache();

      expect(getCache('key1')).toBeNull();
      expect(getCache('key2')).toBeNull();
      expect(getCache('key3')).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should be an alias for invalidateCache', () => {
      setCache('key1', 'value1');
      clearCache('key1');
      expect(getCache('key1')).toBeNull();
    });
  });

  describe('withCache', () => {
    it('should return cached value if available', async () => {
      setCache('cached-key', 'cached-value');

      const fetcher = jest.fn().mockResolvedValue('new-value');
      const result = await withCache('cached-key', fetcher);

      expect(result).toBe('cached-value');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher and cache result if not cached', async () => {
      const fetcher = jest.fn().mockResolvedValue('new-value');
      const result = await withCache('new-key', fetcher);

      expect(result).toBe('new-value');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(getCache('new-key')).toBe('new-value');
    });

    it('should use custom TTL', async () => {
      const fetcher = jest.fn().mockResolvedValue('value');
      await withCache('ttl-key', fetcher, { ttl: 1000 });

      // Value should be cached
      expect(getCache('ttl-key')).toBe('value');
    });
  });

  describe('cleanExpiredCache', () => {
    it('should remove expired cache entries', () => {
      // Set cache with very short TTL
      setCache('expired', 'value', 1);
      
      // Wait for expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          cleanExpiredCache();
          expect(getCache('expired')).toBeNull();
          resolve(undefined);
        }, 10);
      });
    });

    it('should not remove non-expired cache entries', () => {
      setCache('valid', 'value', 60000); // 1 minute
      cleanExpiredCache();
      expect(getCache('valid')).toBe('value');
    });
  });
});
