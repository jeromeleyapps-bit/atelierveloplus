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
import { useState } from 'react';
import { listCustomers } from '@/lib/api';

export function useCustomersData() {
  // État de recherche (local, pas dans cache)
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

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

  // Filtrage côté client (simple search)
  const items = rawCustomers.filter((customer) => {
    if (!searchQuery.trim()) return true;
    
    const q = searchQuery.toLowerCase();
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
