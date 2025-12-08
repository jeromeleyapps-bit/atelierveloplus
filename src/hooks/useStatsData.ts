/**
 * Hook useStatsData - Statistics data with multiple queries
 * 
 * Pattern: Multiple independent queries for different stats
 * - Summary stats (period-based)
 * - Cash total
 * - Yearly revenue
 * - Monthly data (12 months)
 * - Tickets by status
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { getStatsSummary, listCashRegisterEntries, listInvoices, searchWorkOrders } from '@/lib/api';
import { useMemo } from 'react';

interface StatsFilters {
  fromDate: string;
  toDate: string;
}

interface CashRegisterEntry {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
}

interface WorkOrder {
  id: string;
  status: string;
}

interface StatsSummary {
  invoices?: {
    totalCount?: number;
    issuedCount?: number;
    paidCount?: number;
    totalAmount?: number;
    range?: {
      from?: string | null;
      to?: string | null;
      count?: number;
      totalAmount?: number;
      paidAmount?: number;
    };
  };
  workOrders?: {
    deliveredInRange?: number;
  };
}

async function fetchStatsSummary(fromDate: string, toDate: string) {
  const fromIso = fromDate ? new Date(fromDate).toISOString() : undefined;
  const toIso = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString() : undefined;

  return await getStatsSummary({
    from: fromIso,
    to: toIso,
  });
}

async function fetchCashTotal() {
  const data = await listCashRegisterEntries() as CashRegisterEntry[];
  const total = data.reduce((sum: number, entry) => {
    const amt = Number(entry.amount) || 0;
    if (entry.type === 'direct_sale' || entry.type === 'invoice_payment') return sum + amt;
    if (entry.type === 'expense_professional' || entry.type === 'expense_personal') return sum - Math.abs(amt);
    return sum;
  }, 0);
  return total;
}

async function fetchYearlyRevenue() {
  const year = new Date().getFullYear();
  const fromIso = new Date(year, 0, 1).toISOString();
  const toIso = new Date(year, 11, 31, 23, 59, 59).toISOString();

  const data = await getStatsSummary({
    from: fromIso,
    to: toIso,
  }) as StatsSummary;
  return data.invoices?.range?.paidAmount ?? 0;
}

async function fetchMonthlyData() {
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const data = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const invoices = await listInvoices({
      status: 'paid',
      from: month.toISOString(),
      to: monthEnd.toISOString(),
    });

    const revenue = invoices.reduce((sum, inv) => sum + (inv.totalTTC || 0), 0);

    data.push({
      month: monthNames[month.getMonth()],
      revenue: Math.round(revenue),
    });
  }

  return data;
}

async function fetchTicketsByStatus() {
  const tickets = await searchWorkOrders({}) as WorkOrder[];

  const statusCounts: Record<string, number> = {};
  tickets.forEach((ticket) => {
    statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
  });

  const statusColors: Record<string, string> = {
    created: '#42A5F5',
    in_progress: '#FFA726',
    ready: '#66BB6A',
    delivered: '#BDBDBD',
  };

  const statusLabels: Record<string, string> = {
    created: 'Créés',
    in_progress: 'En cours',
    ready: 'Prêts',
    delivered: 'Livrés',
  };

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    color: statusColors[status] || '#999',
  }));

  return data;
}

export function useStatsData(filters: StatsFilters) {
  // Query: Summary stats (period-based)
  const {
    data: summary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery<StatsSummary>({
    queryKey: ['statsSummary', filters.fromDate, filters.toDate],
    queryFn: () => fetchStatsSummary(filters.fromDate, filters.toDate),
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  // Query: Cash total
  const {
    data: cashTotal = 0,
    isLoading: isLoadingCash,
    error: cashError,
  } = useQuery({
    queryKey: ['cashTotal'],
    queryFn: fetchCashTotal,
    staleTime: 1 * 60 * 1000, // 1 min
    gcTime: 5 * 60 * 1000,
  });

  // Query: Yearly revenue
  const {
    data: yearlyRevenue = 0,
    isLoading: isLoadingYearly,
    error: yearlyError,
  } = useQuery({
    queryKey: ['yearlyRevenue', new Date().getFullYear()],
    queryFn: fetchYearlyRevenue,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  // Query: Monthly data (12 months)
  const {
    data: monthlyData = [],
    isLoading: isLoadingMonthly,
    error: monthlyError,
  } = useQuery({
    queryKey: ['monthlyData'],
    queryFn: fetchMonthlyData,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  // Query: Tickets by status
  const {
    data: ticketsByStatus = [],
    isLoading: isLoadingTickets,
    error: ticketsError,
  } = useQuery({
    queryKey: ['ticketsByStatus'],
    queryFn: fetchTicketsByStatus,
    staleTime: 2 * 60 * 1000, // 2 min
    gcTime: 5 * 60 * 1000,
  });

  // Computed KPIs
  const kpis = useMemo(
    () => ({
      monthlyRevenue: summary?.invoices?.range?.paidAmount ?? null,
      ticketsDelivered: summary?.workOrders?.deliveredInRange ?? null,
      paidAmount: summary?.invoices?.range?.paidAmount ?? null,
    }),
    [summary]
  );

  return {
    // Summary
    summary,
    isLoadingSummary,
    summaryError,
    refetchSummary,

    // Cash
    cashTotal,
    isLoadingCash,
    cashError,

    // Yearly
    yearlyRevenue,
    isLoadingYearly,
    yearlyError,

    // Monthly
    monthlyData,
    isLoadingMonthly,
    monthlyError,

    // Tickets
    ticketsByStatus,
    isLoadingTickets,
    ticketsError,

    // KPIs
    kpis,

    // Global loading
    isLoading:
      isLoadingSummary ||
      isLoadingCash ||
      isLoadingYearly ||
      isLoadingMonthly ||
      isLoadingTickets,
  };
}
