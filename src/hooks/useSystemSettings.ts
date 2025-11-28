/**
 * Hook useSystemSettings - System-wide settings management
 * 
 * Pattern: Single query for all settings
 * - Email, tunnel, backup, security settings
 * - Loaded once at mount
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { logger } from '@/lib/logger';

export interface SystemSettings {
  // Email (Legacy)
  emailProvider?: string;
  emailApiKey?: string;
  emailFromAddress?: string;
  emailFromName?: string;
  
  // Email SMTP (Prioritaire)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;

  // Tunnel
  tunnelConfigured?: boolean;
  tunnelHostname?: string;

  // Backup
  autoBackupEnabled?: boolean;
  backupFrequency?: string;

  // Security
  requireAdmin2FA?: boolean;
  maintenanceMode?: boolean;
  activityLogsEnabled?: boolean;
  securityAlertsEnabled?: boolean;

  // Hard delete
  hardDeleteEnabled?: boolean;
}

export interface TunnelStatus {
  running: boolean;
  hostname?: string;
  error?: string;
}

async function fetchSystemSettings(): Promise<SystemSettings> {
  const response = await fetch('/api/admin/system-settings');
  
  if (!response.ok) {
    // Essayer de parser l'erreur JSON, sinon utiliser texte
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    logger.error('API Error', { status: response.status, errorData });
    throw new Error(`Erreur ${response.status}: ${errorData.error || errorData.message || 'Erreur chargement paramètres'}`);
  }
  
  // Parser la réponse avec gestion d'erreur explicite
  try {
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('JSON parse error:', error);
    throw new Error('Erreur de parsing des paramètres (JSON invalide)');
  }
}

async function fetchTunnelStatus(): Promise<TunnelStatus | null> {
  try {
    const response = await fetch('/api/tunnel/status');
    if (!response.ok) return null;
    return await response.json();
  } catch (e) {
    logger.error('Tunnel status error:', e);
    return null;
  }
}

export function useSystemSettings() {
  // Query: System settings
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSystemSettings,
    staleTime: 10 * 60 * 1000, // 10 min (settings don't change often)
    gcTime: 30 * 60 * 1000,
  });

  // Query: Tunnel status (separate, may fail)
  const {
    data: tunnelStatus,
    isLoading: isTunnelLoading,
    refetch: refetchTunnel,
  } = useQuery({
    queryKey: ['tunnelStatus'],
    queryFn: fetchTunnelStatus,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Mémoriser objet vide pour éviter nouvelle référence à chaque render
  const emptySettings = useMemo<Partial<SystemSettings>>(() => ({}), []);
  const stableSettings = settings || emptySettings;

  return {
    // Settings data
    settings: stableSettings as SystemSettings | undefined,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,

    // Tunnel
    tunnelStatus: tunnelStatus as TunnelStatus | null | undefined,
    isTunnelLoading,
    refetchTunnel,
  };
}
