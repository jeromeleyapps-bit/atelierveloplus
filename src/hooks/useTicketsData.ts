import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchWorkOrders, listCustomers, listCustomerBikes, type WorkOrder } from '@/lib/api';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

// Plugin pour semaine ISO
dayjs.extend(isoWeek);

// Helpers pour remplacer date-fns
const isToday = (date: Date): boolean => dayjs(date).isSame(dayjs(), 'day');
const isThisWeek = (date: Date): boolean => dayjs(date).isoWeek() === dayjs().isoWeek() && dayjs(date).year() === dayjs().year();

/**
 * Hook personnalisé pour gérer les données des tickets
 * Pattern: Kent C. Dodds "State Colocation"
 * 
 * Centralise:
 * - Data fetching (tickets + customers)
 * - Filtres (status, query, dates)
 * - Cache automatique TanStack Query
 */
export function useTicketsData() {
  const _queryClient = useQueryClient();
  
  // États de filtres
  const [statusFilter, setStatusFilter] = useState<"" | "created" | "in_progress" | "ready" | "delivered">("");
  const [query, setQuery] = useState("");
  const [onlyReadyToday, setOnlyReadyToday] = useState(false);
  const [onlyReadyWeek, setOnlyReadyWeek] = useState(false);
  
  // Query principale: tickets avec filtres backend
  const { 
    data: rawItems = [], 
    isLoading,
    refetch 
  } = useQuery({
    queryKey: ['tickets', statusFilter, query],
    queryFn: () => searchWorkOrders({
      status: statusFilter || undefined,
      q: query,
    }),
    staleTime: 2 * 60 * 1000, // 2 min cache (data change fréquemment)
  });
  
  // Filtrage côté client pour ready today/week
  // TODO: Idéalement déplacer vers backend pour meilleures performances
  const items = rawItems.filter((item: WorkOrder) => {
    if (onlyReadyToday && item.readyAt) {
      return isToday(new Date(item.readyAt));
    }
    if (onlyReadyWeek && item.readyAt) {
      return isThisWeek(new Date(item.readyAt));
    }
    return true;
  });
  
  // Query customers (cache long - data stable)
  const { 
    data: customers = [],
    isLoading: isLoadingCustomers 
  } = useQuery({
    queryKey: ['customers'],
    queryFn: listCustomers,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
  
  return {
    // Data
    items: items as WorkOrder[],
    isLoading,
    customers,
    isLoadingCustomers,
    
    // Actions
    refetch,
    
    // Filtres
    statusFilter,
    setStatusFilter,
    query,
    setQuery,
    onlyReadyToday,
    setOnlyReadyToday,
    onlyReadyWeek,
    setOnlyReadyWeek,
  };
}

/**
 * Hook pour gérer les bikes d'un customer spécifique
 * Utilisé dans le formulaire de création de ticket
 */
export function useCustomerBikes(customerId: string) {
  const { data: bikes = [], isLoading } = useQuery({
    queryKey: ['customer-bikes', customerId],
    queryFn: () => listCustomerBikes(customerId),
    enabled: !!customerId, // Ne charge que si customerId présent
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
  
  return { bikes, isLoading };
}
