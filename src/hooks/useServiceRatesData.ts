/**
 * Hook useServiceRatesData - Service rates CRUD
 * 
 * Pattern: TanStack Query for admin service rates
 * - List service rates
 * - Last update timestamp
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';

export interface ServiceRate {
  id: string;
  name: string;
  description: string | null;
  priceHT: number;
  bikeType: string | null;
  category: string | null;
  duration: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceRatesResponse {
  serviceRates: ServiceRate[];
  lastUpdate: string | null;
}

async function fetchServiceRates(): Promise<ServiceRatesResponse> {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch('/api/service-rates', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to load service rates');
  return await response.json();
}

export function useServiceRatesData() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['serviceRates'],
    queryFn: fetchServiceRates,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  return {
    serviceRates: data?.serviceRates || [],
    lastUpdate: data?.lastUpdate || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
