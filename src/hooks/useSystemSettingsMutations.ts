/**
 * Hook useSystemSettingsMutations - System settings updates
 * 
 * Pattern: Multiple mutations for different settings sections
 * - Email, backup, security, hard delete
 * - Each section can be saved independently
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

async function updateSettings(data: Record<string, unknown>) {
  const response = await fetch('/api/admin/system-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la mise à jour');
  }

  return response.json();
}

async function triggerBackup() {
  const response = await fetch('/api/admin/backup', { // Fixed path
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la sauvegarde');
  }

  return response.json();
}

// Purge function removed - feature not implemented

export function useSystemSettingsMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Update settings
  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      onSuccess?.('Paramètres mis à jour avec succès');
    },
    onError: (error) => {
      logger.error('Update settings error:', error);
      onError?.((error as Error).message || 'Erreur lors de la mise à jour');
    },
  });

  // Mutation: Trigger backup
  const backupMutation = useMutation({
    mutationFn: triggerBackup,
    onSuccess: () => {
      onSuccess?.('Sauvegarde créée avec succès');
    },
    onError: (error) => {
      logger.error('Backup error:', error);
      onError?.((error as Error).message || 'Erreur lors de la sauvegarde');
    },
  });

  // Purge mutation removed - feature not implemented

  return {
    update: (data: Record<string, unknown>) => updateMutation.mutate(data),
    isUpdating: updateMutation.isPending,

    backup: () => backupMutation.mutate(),
    isBackingUp: backupMutation.isPending,

    isPending: updateMutation.isPending || backupMutation.isPending,
  };
}
