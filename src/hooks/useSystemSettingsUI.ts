/**
 * Hook useSystemSettingsUI - Settings UI state
 * 
 * Pattern: State Colocation for complex settings page
 * - Multiple section states (email, tunnel, backup, security)
 * - Dialog controls
 * - Toast messages
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState, useCallback } from 'react';
import { SystemSettings } from './useSystemSettings';

export function useSystemSettingsUI() {
  // Tunnel Dialog
  const [tunnelConfigOpen, setTunnelConfigOpen] = useState(false);

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    provider: 'resend',
    apiKey: '',
    fromEmail: '',
    fromName: '',
  });

  // Hard Delete
  const [hardDeleteEnabled, setHardDeleteEnabled] = useState(false);
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('');

  // Backup
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  // Security
  const [requireAdmin2FA, setRequireAdmin2FA] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activityLogsEnabled, setActivityLogsEnabled] = useState(true);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);

  // Loading states per section
  const [emailLoading, setEmailLoading] = useState(false);
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  // Messages
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Helpers
  const showSuccess = (message: string) => {
    setSuccess(message);
    setError('');
    setTimeout(() => setSuccess(''), 5000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess('');
  };

  const clearMessages = () => {
    setSuccess('');
    setError('');
  };

  // Load settings data into UI state
  const loadSettingsData = useCallback((data: SystemSettings) => {
    setAutoBackupEnabled(data.autoBackupEnabled || false);
    setBackupFrequency(data.backupFrequency || 'daily');
    
    setEmailSettings({
      provider: data.emailProvider || 'resend',
      apiKey: data.emailApiKey || '',
      fromEmail: data.emailFromAddress || '',
      fromName: data.emailFromName || '',
    });
    
    setRequireAdmin2FA(data.requireAdmin2FA || false);
    setMaintenanceMode(data.maintenanceMode || false);
    setActivityLogsEnabled(data.activityLogsEnabled !== false);
    setSecurityAlertsEnabled(data.securityAlertsEnabled !== false);
    setHardDeleteEnabled(data.hardDeleteEnabled || false);
  }, []); // Dépendances vides car toutes les fonctions setState sont stables

  return {
    // Tunnel
    tunnelConfigOpen,
    setTunnelConfigOpen,
    tunnelLoading,
    setTunnelLoading,

    // Email
    emailSettings,
    setEmailSettings,
    emailLoading,
    setEmailLoading,

    // Hard Delete
    hardDeleteEnabled,
    setHardDeleteEnabled,
    hardDeleteConfirmation,
    setHardDeleteConfirmation,
    hardDeleteLoading,
    setHardDeleteLoading,

    // Backup
    autoBackupEnabled,
    setAutoBackupEnabled,
    backupFrequency,
    setBackupFrequency,
    backupLoading,
    setBackupLoading,

    // Security
    requireAdmin2FA,
    setRequireAdmin2FA,
    maintenanceMode,
    setMaintenanceMode,
    activityLogsEnabled,
    setActivityLogsEnabled,
    securityAlertsEnabled,
    setSecurityAlertsEnabled,

    // Messages
    success,
    setSuccess,
    error,
    setError,
    showSuccess,
    showError,
    clearMessages,

    // Helpers
    loadSettingsData,
  };
}
