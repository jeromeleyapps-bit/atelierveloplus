/**
 * Hook useCatalogMutations - Catalog CRUD operations
 * 
 * Pattern: TanStack Mutations
 * - Create, update, delete catalog items
 * - Purge operations
 * - Supplier offers management
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  type CatalogItem,
} from '@/lib/api';

interface MutationCallbacks {
  onSuccess?: (message: string, severity: 'success' | 'error') => void;
  onError?: (message: string, severity: 'success' | 'error') => void;
}

export function useCatalogMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create catalog item
  const createMutation = useMutation({
    mutationFn: (payload: Partial<CatalogItem> & { category: string; name: string; priceHT: number; priceTTC: number; vatRate: number }) => createCatalogItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogItems'] });
      onSuccess?.('Pièce créée avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Create catalog item error:', error);
      onError?.((error as Error).message || 'Erreur création pièce', 'error');
    },
  });

  // Mutation: Update catalog item
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CatalogItem> }) =>
      updateCatalogItem(id, payload as unknown),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogItems'] });
      onSuccess?.('Pièce mise à jour', 'success');
    },
    onError: (error) => {
      logger.error('Update catalog item error:', error);
      onError?.((error as Error).message || 'Erreur mise à jour', 'error');
    },
  });

  // Mutation: Delete catalog item
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCatalogItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogItems'] });
      onSuccess?.('Pièce supprimée', 'success');
    },
    onError: (error) => {
      logger.error('Delete catalog item error:', error);
      onError?.((error as Error).message || 'Suppression refusée (référencée)', 'error');
    },
  });

  // Mutation: Purge catalog (advanced operation)
  const purgeCatalogMutation = useMutation({
    mutationFn: async (scope: 'stock' | 'supplier') => {
      const res = await fetch(`/api/catalog/items?scope=${scope}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Erreur purge');
      return j;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['catalogItems'] });
      onSuccess?.(`Supprimés: ${data.deleted || 0} • Ignorés: ${data.skipped || 0}`, 'success');
    },
    onError: (error) => {
      logger.error('Purge catalog error:', error);
      onError?.((error as Error).message || 'Erreur purge', 'error');
    },
  });

  // Mutation: Delete supplier offer
  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/suppliers/offers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur suppression offre');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOffers'] });
      onSuccess?.('Offre supprimée', 'success');
    },
    onError: (error) => {
      logger.error('Delete offer error:', error);
      onError?.((error as Error).message || 'Erreur suppression offre', 'error');
    },
  });

  // Mutation: Purge offers
  const purgeOffersMutation = useMutation({
    mutationFn: async (supplierId?: string) => {
      const url = supplierId
        ? `/api/suppliers/offers?supplierId=${encodeURIComponent(supplierId)}`
        : `/api/suppliers/offers`;
      const res = await fetch(url, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Erreur purge offres');
      return j;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplierOffers'] });
      onSuccess?.(`Offres supprimées: ${data.deleted || 0}`, 'success');
    },
    onError: (error) => {
      logger.error('Purge offers error:', error);
      onError?.((error as Error).message || 'Erreur purge offres', 'error');
    },
  });

  return {
    // Catalog items
    create: (payload: Partial<CatalogItem> & { category: string; name: string; priceHT: number; priceTTC: number; vatRate: number }) => createMutation.mutate(payload),
    isCreating: createMutation.isPending,

    update: (id: string, payload: Partial<CatalogItem>) =>
      updateMutation.mutate({ id, payload }),
    isUpdating: updateMutation.isPending,

    remove: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,

    purgeCatalog: (scope: 'stock' | 'supplier') => purgeCatalogMutation.mutate(scope),
    isPurging: purgeCatalogMutation.isPending,

    // Supplier offers
    deleteOffer: (id: string) => deleteOfferMutation.mutate(id),
    isDeletingOffer: deleteOfferMutation.isPending,

    purgeOffers: (supplierId?: string) => purgeOffersMutation.mutate(supplierId),
    isPurgingOffers: purgeOffersMutation.isPending,
  };
}
