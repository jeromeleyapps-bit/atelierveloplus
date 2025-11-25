/**
 * Hook useAdminDashboardData - Admin dashboard data
 * 
 * Pattern: Multiple independent queries
 * - Stats (users, tickets, invoices, db)
 * - Recent emails
 * - System settings
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { adminGetStats, getRecentEmails, adminGetSystemSettings, type RecentEmail } from '@/lib/api';
import type { SystemSettings } from '@prisma/client';
import { logger } from '@/lib/logger';

interface AdminStats {
  totalUsers: number;
  activeTickets: number;
  pendingInvoices: number;
  dbSize: string;
  lastBackup: string;
}

async function fetchStats(): Promise<AdminStats> {
  try {
    return await adminGetStats();
  } catch (error) {
    logger.error("Error loading stats:", error);
    return {
      totalUsers: 1,
      activeTickets: 0,
      pendingInvoices: 0,
      dbSize: "N/A",
      lastBackup: "Jamais",
    };
  }
}

async function fetchRecentEmails(): Promise<RecentEmail[]> {
  try {
    const data = await getRecentEmails();
    return data.emails || [];
  } catch (error) {
    logger.error("Error loading emails:", error);
    return [];
  }
}

async function fetchSystemSettings(): Promise<SystemSettings | undefined> {
  try {
    const data = await adminGetSystemSettings();
    return data as SystemSettings;
  } catch (error) {
    logger.error("Error loading settings:", error);
    return undefined;
  }
}

export function useAdminDashboardData() {
  // Query: Admin stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['adminStats'],
    queryFn: fetchStats,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  // Query: Recent emails
  const {
    data: recentEmails = [],
    isLoading: isLoadingEmails,
    error: emailsError,
    refetch: refetchEmails,
  } = useQuery({
    queryKey: ['recentEmails'],
    queryFn: fetchRecentEmails,
    staleTime: 1 * 60 * 1000, // 1 min
    gcTime: 5 * 60 * 1000,
  });

  // Query: System settings
  const {
    data: systemSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['adminSystemSettings'],
    queryFn: fetchSystemSettings,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  return {
    // Stats
    stats: stats || {
      totalUsers: 1,
      activeTickets: 0,
      pendingInvoices: 0,
      dbSize: "0 MB",
      lastBackup: "Jamais",
    },
    isLoadingStats,
    statsError,
    refetchStats,

    // Emails
    recentEmails,
    isLoadingEmails,
    emailsError,
    refetchEmails,

    // Settings (avec valeurs par défaut pour éviter undefined errors)
    systemSettings: systemSettings || {
      notificationsEnabled: false,
      emailNotificationsEnabled: false,
      activityLogsEnabled: false,
      automatedEmailsEnabled: false,
      autoBackupEnabled: false,
      backupFrequency: 'weekly',
      emailProvider: 'none',
    },
    isLoadingSettings,
    settingsError,
    refetchSettings,

    // Global loading
    isLoading: isLoadingStats || isLoadingEmails || isLoadingSettings,
  };
}
