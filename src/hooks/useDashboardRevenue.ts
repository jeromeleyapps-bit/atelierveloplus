/**
 * Hook useDashboardRevenue - Dashboard revenue and invoices count
 * 
 * Pattern: TanStack Query for dashboard-specific metrics
 * - Paid revenue this month
 * - Issued invoices count
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { listInvoices } from '@/lib/api';
import { logger } from '@/lib/logger';

async function fetchPaidRevenueMonth(): Promise<number> {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const invoices = await listInvoices({
      status: 'paid',
      from: start.toISOString(),
      to: end.toISOString(),
    });
    return invoices.reduce((acc, i) => acc + (i.totalTTC || 0), 0);
  } catch (e) {
    logger.warn('Failed to load paid invoices for dashboard', e);
    return 0;
  }
}

async function fetchIssuedInvoicesCount(): Promise<number> {
  try {
    const issued = await listInvoices({ status: 'issued' });
    return issued.length;
  } catch (e) {
    logger.warn('Failed to load issued invoices for dashboard', e);
    return 0;
  }
}

async function fetchIssuedInvoicesAmount(): Promise<number> {
  try {
    const issued = await listInvoices({ status: 'issued' });
    // ✅ FIX: Calculer le MONTANT total des factures émises (non payées)
    return issued.reduce((acc, i) => acc + (i.totalTTC || 0), 0);
  } catch (e) {
    logger.warn('Failed to load issued invoices amount for dashboard', e);
    return 0;
  }
}

export function useDashboardRevenue() {
  // Query: Paid revenue this month
  const {
    data: paidRevenueMonth = 0,
    isLoading: isLoadingRevenue,
  } = useQuery({
    queryKey: ['dashboardRevenue', 'paidMonth'],
    queryFn: fetchPaidRevenueMonth,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  // Query: Issued invoices count
  const {
    data: invoiceIssuedCount = 0,
    isLoading: isLoadingIssued,
  } = useQuery({
    queryKey: ['dashboardRevenue', 'issuedCount'],
    queryFn: fetchIssuedInvoicesCount,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  // Query: Issued invoices amount (en attente d'encaissement)
  const {
    data: invoiceIssuedAmount = 0,
    isLoading: isLoadingIssuedAmount,
  } = useQuery({
    queryKey: ['dashboardRevenue', 'issuedAmount'],
    queryFn: fetchIssuedInvoicesAmount,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  return {
    paidRevenueMonth,
    invoiceIssuedCount,
    invoiceIssuedAmount,
    isLoading: isLoadingRevenue || isLoadingIssued || isLoadingIssuedAmount,
  };
}
