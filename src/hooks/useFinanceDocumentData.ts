/**
 * Hook useFinanceDocumentData - Finance document detail query
 * 
 * Pattern: Simple query for invoice/quote/credit detail
 * Reusable for all finance detail pages
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { getInvoice, type Invoice, type InvoiceLine } from '@/lib/api';

export function useFinanceDocumentData(id: string, type: 'invoice' | 'quote' | 'credit') {
  const {
    data: document,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['financeDocument', type, id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 min
    gcTime: 5 * 60 * 1000,
  });

  return {
    document: document as (Invoice & { lines: InvoiceLine[] }) | null | undefined,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
