/**
 * Hook useCustomersData - Data fetching & filtering for customers
 * 
 * Pattern: TanStack Query best practices
 * - Automatic caching (5 min)
 * - Background refetch
 * - Error handling
 * - Loading states
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { listCustomers } from '@/lib/api';
import { useDebounce } from './useDebounce';

export function useCustomersData() {
  // État de recherche (local, pas dans cache)
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  // ✅ OPTIMISATION: Debounce la recherche (300ms)
  // Évite le filtrage à chaque frappe
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Query principale: liste des clients
  const {
    data: rawCustomers = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,   // 10 min (anciennement cacheTime)
  });

  // ✅ OPTIMISATION: Mémoïser le filtrage pour éviter recalculs inutiles
  const items = useMemo(() => {
    return rawCustomers.filter((customer) => {
      if (!debouncedSearch.trim()) return true;
      
      const q = debouncedSearch.toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const firstName = (customer.firstName || '').toLowerCase();
      const lastName = (customer.lastName || '').toLowerCase();
      const phone = (customer.phone || '').toLowerCase();
      
      return (
        email.includes(q) ||
        firstName.includes(q) ||
        lastName.includes(q) ||
        phone.includes(q)
      );
    });
  }, [rawCustomers, debouncedSearch]);

  return {
    // Data
    items,
    rawCustomers,
    isLoading,
    error,
    
    // Search
    searchQuery,
    setSearchQuery,
    
    // Selection
    selected,
    setSelected,
    
    // Actions
    refetch,
  };
}
