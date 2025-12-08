/**
 * Hook useCatalogStats - Statistiques agrégées catalogue
 * 
 * Pattern: React Query pour cache
 * Usage: Landing page 3 tuiles
 */

import { useQuery } from '@tanstack/react-query';

export interface CatalogStats {
  // Pièces & Accessoires
  piecesCount: number;
  piecesValueHT: number;
  piecesSupplierCount: number;
  piecesLowStock: number;
  b2bOffersCount: number;
  
  // Vélos en Vente
  bikesCount: number;
  bikesNew: number;
  bikesUsed: number;
  bikesElectric: number;
  bikesValueHT: number;
  bikesInStock: number;
  
  // Prestations & Services
  servicesCount: number;
  servicesActive: number;
  servicesCategories: number;
  servicesLastUpdate: string | null;
}

async function fetchCatalogStats(): Promise<CatalogStats> {
  const response = await fetch('/api/catalog/stats');
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'fetch_stats_failed');
  }
  
  return response.json();
}

export function useCatalogStats() {
  return useQuery({
    queryKey: ['catalogStats'],
    queryFn: fetchCatalogStats,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}
