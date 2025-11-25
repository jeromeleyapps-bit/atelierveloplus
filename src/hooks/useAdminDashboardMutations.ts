/**
 * Hook useAdminDashboardMutations - Admin dashboard operations
 * 
 * Pattern: Multiple mutations for admin actions
 * - Create user
 * - Toggle system settings
 * - Export/import backup
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCreateUser, adminExportBackup, adminImportBackup, adminUpdateSystemSettings } from '@/lib/api';
import { logger } from '@/lib/logger';

interface MutationCallbacks {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useAdminDashboardMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create user
  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; role: string }) => {
      return await adminCreateUser(data);
    },
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      onSuccess?.(`Utilisateur ${user.email} créé avec succès !`);
    },
    onError: (error) => {
      logger.error('Create user error:', error);
      onError?.((error as Error).message || 'Erreur lors de la création');
    },
  });

  // Mutation: Toggle setting
  const toggleSettingMutation = useMutation({
    mutationFn: async (data: { setting: string; value: boolean }) => {
      return await adminUpdateSystemSettings(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSystemSettings'] });
      onSuccess?.('Paramètre mis à jour');
    },
    onError: (error) => {
      logger.error('Toggle setting error:', error);
      onError?.('Erreur lors de la mise à jour');
    },
  });

  // Mutation: Export backup
  const exportBackupMutation = useMutation({
    mutationFn: async () => {
      const blob = await adminExportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-velo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return blob;
    },
    onSuccess: () => {
      onSuccess?.('Export réussi !');
    },
    onError: (error) => {
      logger.error('Export error:', error);
      onError?.("Erreur lors de l'export");
    },
  });

  // Mutation: Import backup (restore)
  const importBackupMutation = useMutation({
    mutationFn: async (data: { backup: Record<string, unknown>; wipeFirst: boolean }) => {
      return await adminImportBackup(data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      onSuccess?.(result.message || 'Restauration réussie !');
    },
    onError: (error) => {
      logger.error('Restore error:', error);
      onError?.(`Erreur: ${(error as Error).message}`);
    },
  });

  return {
    // Create user
    createUser: (data: { email: string; password: string; role: string }) => 
      createUserMutation.mutate(data),
    isCreatingUser: createUserMutation.isPending,

    // Toggle setting
    toggleSetting: (setting: string, value: boolean) => 
      toggleSettingMutation.mutate({ setting, value }),
    isTogglingS: toggleSettingMutation.isPending,

    // Export backup
    exportBackup: () => exportBackupMutation.mutate(),
    isExporting: exportBackupMutation.isPending,

    // Import backup
    importBackup: (backup: Record<string, unknown>, wipeFirst: boolean) => 
      importBackupMutation.mutate({ backup, wipeFirst }),
    isImporting: importBackupMutation.isPending,

    // Global
    isPending: 
      createUserMutation.isPending || 
      toggleSettingMutation.isPending || 
      exportBackupMutation.isPending || 
      importBackupMutation.isPending,
  };
}
