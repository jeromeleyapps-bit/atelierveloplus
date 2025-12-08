/**
 * Hook useBikeHistoryData - Bike history detail query
 * 
 * Pattern: Query for specific bike history
 * Loads when bikeId is provided
 */

import { useQuery } from '@tanstack/react-query';

async function fetchBikeHistory(bikeId: string) {
  const res = await fetch(`/api/bikes/${bikeId}/history`);
  if (!res.ok) throw new Error('Failed to load bike history');
  return await res.json();
}

export function useBikeHistoryData(bikeId: string | null) {
  const {
    data: bikeHistory,
    isLoading: loadingHistory,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bikeHistory', bikeId],
    queryFn: () => fetchBikeHistory(bikeId!),
    enabled: !!bikeId,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  return {
    bikeHistory: bikeHistory || null,
    loadingHistory,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
