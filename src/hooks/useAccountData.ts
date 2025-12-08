/**
 * Hook useAccountData - Account settings with multiple queries
 * 
 * Pattern: Parallel queries for different settings
 * - Account settings (shop info)
 * - Pricing settings
 * - Stock settings
 * - Cloudflare RDV host
 */

import { useQuery } from '@tanstack/react-query';
import { getAccountSettings, getSetting } from '@/lib/api';

async function fetchAllSettings() {
  const [accountSettings, multiplier, vatRate, hourlyRate, minStock, reorderQty, rdvHost] = await Promise.all([
    getAccountSettings(),
    getSetting<number>('pricing.defaultMultiplier'),
    getSetting<number>('pricing.defaultVatRate'),
    getSetting<number>('pricing.hourlyRate'),
    getSetting<number>('stock.defaultMin'),
    getSetting<number>('stock.defaultReorderQty'),
    getSetting<string>('cloudflare.rdvHost'),
  ]);

  return {
    accountSettings: accountSettings || {},
    multiplier: multiplier?.value != null && !Number.isNaN(Number(multiplier.value)) ? Number(multiplier.value) : 1.5,
    vatPercent: vatRate?.value != null && !Number.isNaN(Number(vatRate.value)) ? Math.round(Number(vatRate.value) * 100) : 20,
    hourlyRate: hourlyRate?.value != null && !Number.isNaN(Number(hourlyRate.value)) ? Number(hourlyRate.value) : 60,
    defaultMinStock: minStock?.value != null && !Number.isNaN(Number(minStock.value)) ? Number(minStock.value) : 0,
    defaultReorderQty: reorderQty?.value != null && !Number.isNaN(Number(reorderQty.value)) ? Number(reorderQty.value) : 0,
    rdvHost: rdvHost?.value ? String(rdvHost.value) : '',
  };
}

export function useAccountData() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['accountSettings'],
    queryFn: fetchAllSettings,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });

  return {
    accountSettings: data?.accountSettings || {},
    multiplier: data?.multiplier || 1.5,
    vatPercent: data?.vatPercent || 20,
    hourlyRate: data?.hourlyRate || 60,
    defaultMinStock: data?.defaultMinStock || 0,
    defaultReorderQty: data?.defaultReorderQty || 0,
    rdvHost: data?.rdvHost || '',
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}
