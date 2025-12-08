/**
 * Hook useAdminCatalogData - Admin catalog with pagination
 * 
 * Pattern: Query with filters and pagination
 * - Catalog items with search/category/pagination
 * - Auto-Entrepreneur settings for VAT calculations
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { listCatalogItems, getAppSettings } from '@/lib/api';
import type { CatalogCategory } from '@/lib/catalog';
import { logger } from '@/lib/logger';

interface CatalogFilters {
  q: string;
  category: CatalogCategory | '';
  page: number;
  rowsPerPage: number;
}

async function fetchCatalogItems(filters: CatalogFilters) {
  const data = await listCatalogItems({
    q: filters.q || undefined,
    category: filters.category || undefined,
    limit: filters.rowsPerPage,
    offset: filters.page * filters.rowsPerPage,
  });
  
  // Auto-seed on first run if empty
  if ((data.total || 0) === 0) {
    if (!(window as Window & { __catalogSeedAttempted__?: boolean }).__catalogSeedAttempted__) {
      (window as Window & { __catalogSeedAttempted__?: boolean }).__catalogSeedAttempted__ = true;
      try {
        const seedRes = await fetch('/api/catalog/seed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'fallback' }),
        });
        if (seedRes.ok) {
          // Reload after seed
          return await listCatalogItems({
            q: filters.q || undefined,
            category: filters.category || undefined,
            limit: filters.rowsPerPage,
            offset: filters.page * filters.rowsPerPage,
          });
        }
      } catch (e) {
        logger.error(e);
      }
    }
  }
  
  return data;
}

async function fetchAppSettings() {
  try {
    const settings = await getAppSettings();
    return {
      isAutoEntrepreneur: settings.isAutoEntrepreneur || false,
    };
  } catch (e) {
    logger.error('[ADMIN CATALOG] Failed to load settings', e);
    return { isAutoEntrepreneur: false };
  }
}

export function useAdminCatalogData(filters: CatalogFilters) {
  // Query: Catalog items with pagination
  const {
    data: catalogData,
    isLoading: isLoadingCatalog,
    error: catalogError,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['adminCatalogItems', filters.q, filters.category, filters.page, filters.rowsPerPage],
    queryFn: () => fetchCatalogItems(filters),
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  // Query: App settings (for Auto-Entrepreneur status)
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ['appSettings'],
    queryFn: fetchAppSettings,
    staleTime: 10 * 60 * 1000, // 10 min (rarely changes)
    gcTime: 30 * 60 * 1000,
  });

  return {
    // Catalog
    items: catalogData?.items || [],
    total: catalogData?.total || 0,
    isLoadingCatalog,
    catalogError,
    refetchCatalog,

    // Settings
    isAutoEntrepreneur: settingsData?.isAutoEntrepreneur || false,
    isLoadingSettings,
    settingsError,

    // Global loading
    isLoading: isLoadingCatalog || isLoadingSettings,
  };
}
