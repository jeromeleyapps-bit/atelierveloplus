/**
 * Hook useCashRegisterMutations - Cash register CRUD operations
 * 
 * Pattern: TanStack Mutations
 * - Create, update, delete entries
 * - Automatic cache invalidation
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCashRegisterEntry, updateCashRegisterEntry, deleteCashRegisterEntry } from '@/lib/api';
import { logger } from '@/lib/logger';

interface MutationCallbacks {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useCashRegisterMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create entry
  const createMutation = useMutation({
    mutationFn: (data: { type: string; amount: number; note?: string; reference?: string }) => createCashRegisterEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegisterEntries'] });
      onSuccess?.('Entrée enregistrée');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Create entry error:', { error: errorMessage });
      onError?.("Erreur d'enregistrement");
    },
  });

  // Mutation: Update entry
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { type: string; amount: number; note?: string; reference?: string } }) => updateCashRegisterEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegisterEntries'] });
      onSuccess?.('Entrée modifiée');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Update entry error:', { error: errorMessage });
      onError?.("Erreur d'enregistrement");
    },
  });

  // Mutation: Delete entry
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCashRegisterEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashRegisterEntries'] });
      onSuccess?.('Entrée supprimée');
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Delete entry error:', { error: errorMessage });
      onError?.('Erreur de suppression');
    },
  });

  return {
    // Create
    create: (data: { type: string; amount: number; note?: string; reference?: string }) => createMutation.mutate(data),
    isCreating: createMutation.isPending,

    // Update
    update: (id: string, data: { type: string; amount: number; note?: string; reference?: string }) => updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,

    // Delete
    remove: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,

    // Global
    isPending: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
