/**
 * Hook useCommunicationsData - Fetch communications with filters
 * 
 * Pattern: TanStack Query with dependent queries
 * - Query depends on filter values
 * - Automatic refetch on filter change
 * - Cache 2 min (logs change frequently)
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 * - https://tanstack.com/query/latest/docs/react/guides/dependent-queries
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { listCommunications } from '@/lib/api';

export function useCommunicationsData() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Query avec filtres dynamiques
  const {
    data: communications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['communications', typeFilter, statusFilter],
    queryFn: async () => {
      const filters: Record<string, string> = {};
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.status = statusFilter;
      
      return await listCommunications(filters);
    },
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  return {
    // Data
    communications,
    isLoading,
    error,

    // Filters
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,

    // Actions
    refetch,
  };
}
