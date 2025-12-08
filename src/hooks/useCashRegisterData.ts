/**
 * Hook useCashRegisterData - Cash register entries query
 * 
 * Pattern: Simple query for cash entries
 * - List all cash register entries
 * - Computed values (balance, treasury)
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { listCashRegisterEntries } from '@/lib/api';
import { useMemo } from 'react';

interface _CashEntry {
  id: string;
  type: string;
  amount: number;
  description?: string;
  invoice?: { number: string };
  user?: { name?: string; email?: string };
  createdAt: string;
}

export function useCashRegisterData() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cashRegisterEntries'],
    queryFn: listCashRegisterEntries,
    staleTime: 1 * 60 * 1000, // 1 min (financial data)
    gcTime: 5 * 60 * 1000,
  });

  const entries = useMemo(() => (data || []) as _CashEntry[], [data]);

  // Computed: Total cash
  const totalCash = useMemo(() => {
    return entries.reduce((sum: number, e) => {
      if (e.type === 'expense_professional' || e.type === 'expense_personal') {
        return sum - e.amount;
      }
      return sum + e.amount;
    }, 0);
  }, [entries]);

  // Computed: Balance
  const balance = useMemo(() => {
    return entries.reduce((sum: number, e) => {
      const amount = parseFloat(String(e.amount)) || 0;
      return e.type === 'opening' || e.type === 'direct_sale' ? sum + amount : sum - amount;
    }, 0);
  }, [entries]);

  // Computed: Treasury evolution data for chart
  const treasuryData = useMemo(() => {
    const sorted = [...entries].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let runningBalance = 0;
    return sorted.map((entry) => {
      const amount = parseFloat(String(entry.amount)) || 0;
      runningBalance += entry.type === 'opening' || entry.type === 'direct_sale' ? amount : -amount;

      return {
        date: new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        balance: Math.round(runningBalance * 100) / 100,
      };
    });
  }, [entries]);

  return {
    entries,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    
    // Computed values
    totalCash,
    balance,
    treasuryData,
  };
}
