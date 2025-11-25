import { useMutation, useQueryClient } from '@tanstack/react-query';
import { startWorkOrder, markWorkOrderReady, deleteWorkOrder, setWorkOrderStatus } from '@/lib/api';
import { logger } from '@/lib/logger';

/**
 * Hook personnalisé pour les mutations sur les tickets
 * Pattern: TanStack Query mutations
 * 
 * Centralise toutes les actions:
 * - Démarrer un ticket
 * - Marquer prêt
 * - Supprimer
 * - Changer statut
 */
export function useTicketsMutations(options?: {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  onStartSuccess?: (ticketId: string) => void; // Callback pour démarrer le timer
}) {
  const queryClient = useQueryClient();
  
  // Mutation: Démarrer un ticket
  const startMutation = useMutation({
    mutationFn: startWorkOrder,
    onSuccess: (_, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.("Ticket démarré");
      options?.onStartSuccess?.(ticketId); // Démarrer le timer
    },
    onError: (error) => {
      logger.error('Start ticket failed:', error);
      options?.onError?.("Erreur: impossible de démarrer le ticket");
    },
  });
  
  // Mutation: Marquer prêt
  const readyMutation = useMutation({
    mutationFn: markWorkOrderReady,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.("Ticket marqué comme prêt (HubSpot synchronisé)");
    },
    onError: (error) => {
      logger.error('Mark ready failed:', error);
      options?.onError?.("Erreur: impossible de marquer comme prêt");
    },
  });
  
  // Mutation: Supprimer un ticket
  const deleteMutation = useMutation({
    mutationFn: deleteWorkOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.("Ticket supprimé");
    },
    onError: (error) => {
      logger.error('Delete ticket failed:', error);
      options?.onError?.("Erreur: impossible de supprimer le ticket");
    },
  });
  
  // Mutation: Changer le statut
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      setWorkOrderStatus(id, status as "delivered" | "in_progress" | "created" | "ready"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.("Statut mis à jour");
    },
    onError: (error) => {
      logger.error('Update status failed:', error);
      options?.onError?.("Erreur: impossible de mettre à jour le statut");
    },
  });
  
  // Mutation: Supprimer plusieurs tickets (bulk)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deleteWorkOrder(id);
      }
    },
    onSuccess: (_: unknown, ids: string[]) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.(`${ids.length} ticket(s) supprimé(s)`);
    },
    onError: (error) => {
      logger.error('Bulk delete failed:', error);
      options?.onError?.("Erreur lors de la suppression groupée");
    },
  });
  
  return {
    // Mutations
    startMutation,
    readyMutation,
    deleteMutation,
    updateStatusMutation,
    bulkDeleteMutation,
    
    // Helpers
    start: (id: string) => startMutation.mutate(id),
    markReady: (id: string) => readyMutation.mutate(id),
    remove: (id: string) => deleteMutation.mutate(id),
    updateStatus: (id: string, status: string) => updateStatusMutation.mutate({ id, status }),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutate(ids),
    
    // Loading states
    isStarting: startMutation.isPending,
    isMarkingReady: readyMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}
