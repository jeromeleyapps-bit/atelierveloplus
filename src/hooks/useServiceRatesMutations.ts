/**
 * Hook useServiceRatesMutations - Service rates CRUD operations
 * 
 * Pattern: TanStack Mutations
 * - Create, update, delete service rates
 * - Automatic cache invalidation
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface MutationCallbacks {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

async function createServiceRate(data: Record<string, unknown>) {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch('/api/admin/service-rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la création');
  }
  return response.json();
}

async function updateServiceRate(id: string, data: unknown) {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch(`/api/admin/service-rates/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la mise à jour');
  }
  return response.json();
}

async function deleteServiceRate(id: string) {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch(`/api/admin/service-rates/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erreur lors de la suppression');
  }
  return response.json();
}

export function useServiceRatesMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create
  const createMutation = useMutation({
    mutationFn: createServiceRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRates'] });
      onSuccess?.('Prestation créée avec succès');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Create service rate error:', { error: errorMessage });
      onError?.((error as Error).message || 'Erreur lors de la création');
    },
  });

  // Mutation: Update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => updateServiceRate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRates'] });
      onSuccess?.('Prestation mise à jour avec succès');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Update service rate error:', { error: errorMessage });
      onError?.((error as Error).message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation: Delete
  const deleteMutation = useMutation({
    mutationFn: deleteServiceRate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceRates'] });
      onSuccess?.('Prestation supprimée avec succès');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Delete service rate error:', { error: errorMessage });
      onError?.((error as Error).message || 'Erreur lors de la suppression');
    },
  });

  return {
    create: (data: Record<string, unknown>) => createMutation.mutate(data),
    isCreating: createMutation.isPending,

    update: (id: string, data: unknown) => updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,

    remove: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,

    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
