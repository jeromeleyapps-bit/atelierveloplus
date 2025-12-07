/**
 * Tests pour useCachedData hook
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useCachedData } from '@/hooks/useCachedData';

describe('useCachedData', () => {
  beforeEach(() => {
    // Clear localStorage cache
    localStorage.clear();
  });

  it('should fetch data on mount', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({ result: 'test' });

    const { result } = renderHook(() =>
      useCachedData('test-key', mockFetcher, { ttl: 60000 })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ result: 'test' });
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should not fetch when disabled', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({ result: 'test' });

    const { result } = renderHook(() =>
      useCachedData('disabled-key', mockFetcher, { ttl: 60000, enabled: false })
    );

    // Wait a bit to ensure no fetch happens
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockFetcher).not.toHaveBeenCalled();
    // Data peut être null ou undefined selon l'implémentation
    expect(result.current.data == null).toBe(true);
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Fetch failed');
    const mockFetcher = jest.fn().mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useCachedData('error-key', mockFetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return cached data on subsequent calls', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({ cached: true });

    // First call
    const { result: result1 } = renderHook(() =>
      useCachedData('cache-key', mockFetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second call with same key
    const { result: result2 } = renderHook(() =>
      useCachedData('cache-key', mockFetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    // Fetcher should only be called once due to caching
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should provide refetch function', async () => {
    let callCount = 0;
    const mockFetcher = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ count: callCount });
    });

    const { result } = renderHook(() =>
      useCachedData('refetch-key', mockFetcher, { ttl: 60000 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ count: 1 });

    // Trigger refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual({ count: 2 });
    });
  });
});
