/**
 * Hook useCatalogData - Catalog items and supplier offers
 * 
 * Pattern: Dual data sources with TanStack Query
 * - Catalog items (my stock)
 * - Supplier offers (B2B)
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { listCatalogItems, type CatalogItem } from '@/lib/api';
import type { SupplierOffer } from '@/components/catalog/SuppliersTab';
import { logger } from '@/lib/logger';

async function fetchCatalogItems(): Promise<CatalogItem[]> {
  const { items } = await listCatalogItems({ limit: 20000 }); // Support catalogues volumineux (P2R 17k produits)
  return items;
}

async function fetchSupplierOffers(): Promise<SupplierOffer[]> {
  try {
    const token = localStorage.getItem("jwt_token");
    const res = await fetch('/api/suppliers/offers', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Erreur chargement offres');
    return data.items || [];
  } catch (e: unknown) {
    logger.error('[B2B] fetchSupplierOffers error:', e);
    return [];
  }
}

export function useCatalogData() {
  // Query: Catalog items (my stock)
  const {
    data: catalogItems = [],
    isLoading: isLoadingCatalog,
    error: catalogError,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['catalogItems'],
    queryFn: fetchCatalogItems,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 10 * 60 * 1000,
  });

  // Query: Supplier offers
  const {
    data: supplierOffers = [],
    isLoading: isLoadingOffers,
    error: offersError,
    refetch: refetchOffers,
  } = useQuery({
    queryKey: ['supplierOffers'],
    queryFn: fetchSupplierOffers,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  return {
    // Catalog items
    catalogItems,
    isLoadingCatalog,
    catalogError,
    refetchCatalog,

    // Supplier offers
    supplierOffers,
    isLoadingOffers,
    offersError,
    refetchOffers,

    // Global loading
    isLoading: isLoadingCatalog || isLoadingOffers,
  };
}
