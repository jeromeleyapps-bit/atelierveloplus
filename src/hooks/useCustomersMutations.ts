/**
 * Hook useCustomersMutations - CRUD operations for customers
 * 
 * Pattern: TanStack Mutations with optimistic updates
 * - Automatic cache invalidation
 * - Loading states per operation
 * - Error handling
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 * - https://tanstack.com/query/latest/docs/react/guides/invalidations-from-mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  saveCustomerBike,
  deleteCustomerBike,
  type Customer,
} from '@/lib/api';

interface MutationCallbacks {
  onSuccess?: (message: string, severity: 'success' | 'error' | 'info') => void;
  onError?: (message: string, severity: 'success' | 'error' | 'info') => void;
}

export function useCustomersMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create customer
  const createMutation = useMutation({
    mutationFn: (payload: Partial<Customer>) => createCustomer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.('Client créé avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Create customer error:', error);
      onError?.('Erreur lors de la création du client', 'error');
    },
  });

  // Mutation: Update customer
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Customer> }) =>
      updateCustomer(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.('Client modifié avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Update customer error:', error);
      onError?.('Erreur lors de la modification du client', 'error');
    },
  });

  // Mutation: Delete customer
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.('Client supprimé avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Delete customer error:', error);
      onError?.('Erreur lors de la suppression du client', 'error');
    },
  });

  // Mutation: Bulk delete customers
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteCustomer(id);
      }
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.(`${count} client(s) supprimé(s)`, 'success');
    },
    onError: (error) => {
      logger.error('Bulk delete customers error:', error);
      onError?.('Erreur lors de la suppression groupée', 'error');
    },
  });

  // Mutation: Save customer bike
  const saveBikeMutation = useMutation({
    mutationFn: ({
      customerId,
      index,
      payload,
    }: {
      customerId: string;
      index: 1 | 2 | 3 | 4 | 5;
      payload: unknown;
    }) => saveCustomerBike(customerId, index, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerBikes'] });
      onSuccess?.('Vélo enregistré avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Save bike error:', error);
      onError?.('Erreur lors de l\'enregistrement du vélo', 'error');
    },
  });

  // Mutation: Delete customer bike
  const deleteBikeMutation = useMutation({
    mutationFn: ({ customerId, index }: { customerId: string; index: 1 | 2 | 3 | 4 | 5 }) =>
      deleteCustomerBike(customerId, index),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customerBikes'] });
      onSuccess?.('Vélo supprimé avec succès', 'success');
    },
    onError: (error) => {
      logger.error('Delete bike error:', error);
      onError?.('Erreur lors de la suppression du vélo', 'error');
    },
  });

  return {
    // Create
    create: (payload: Partial<Customer>) => createMutation.mutate(payload),
    isCreating: createMutation.isPending,

    // Update
    update: (id: string, payload: Partial<Customer>) =>
      updateMutation.mutate({ id, payload }),
    isUpdating: updateMutation.isPending,

    // Delete
    remove: (id: string) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,

    // Bulk delete
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutate(ids),
    isBulkDeleting: bulkDeleteMutation.isPending,

    // Bikes
    saveBike: (customerId: string, index: 1 | 2 | 3 | 4 | 5, payload: unknown) =>
      saveBikeMutation.mutate({ customerId, index, payload }),
    isSavingBike: saveBikeMutation.isPending,

    deleteBike: (customerId: string, index: 1 | 2 | 3 | 4 | 5) =>
      deleteBikeMutation.mutate({ customerId, index }),
    isDeletingBike: deleteBikeMutation.isPending,
  };
}
