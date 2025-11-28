/**
 * Hook useAdminCatalogMutations - Admin catalog operations
 * 
 * Pattern: TanStack Mutations
 * - CRUD operations (create, update, delete)
 * - Maintenance operations (seed, purge, import)
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCatalogItem, updateCatalogItem, deleteCatalogItem, type CatalogItem } from '@/lib/api';
import { logger } from '@/lib/logger';

interface MutationCallbacks {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAdminCatalogMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create item
  const createMutation = useMutation({
    mutationFn: (data: Partial<CatalogItem> & { category: string; name: string; priceHT: number; priceTTC: number; vatRate: number }) => createCatalogItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCatalogItems'] });
      onSuccess?.();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Create item error', { error: errorMessage });
      onError?.(error as Error);
    },
  });

  // Mutation: Update item
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateCatalogItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCatalogItems'] });
      onSuccess?.();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Update item error', { error: errorMessage });
      onError?.(error as Error);
    },
  });

  // Mutation: Delete item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalogItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCatalogItems'] });
      onSuccess?.();
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Delete item error', { error: errorMessage });
      onError?.(error as Error);
    },
  });

  return {
    // CRUD
    create: (data: Partial<CatalogItem> & { category: string; name: string; priceHT: number; priceTTC: number; vatRate: number }) => createMutation.mutate(data),
    update: (id: string, data: unknown) => updateMutation.mutate({ id, data }),
    remove: (id: string) => deleteMutation.mutate(id),

    // Loading states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
