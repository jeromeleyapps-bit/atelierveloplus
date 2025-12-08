/**
 * Hook useBikes - Chargement données vélos
 * Pattern: React Query pour cache et synchronisation
 */

import { useQuery } from '@tanstack/react-query';

export interface Bike {
  id: string;
  createdAt: string;
  updatedAt: string;
  type: string;
  condition: string;
  brand: string;
  model: string;
  year: number;
  size: string;
  color?: string | null;
  serialNumber?: string | null;
  frameSize?: string | null;
  frameMaterial?: string | null;
  wheelSize?: string | null;
  weight?: number | null;
  groupset?: string | null;
  brakeType?: string | null;
  drivetrain?: string | null;
  fork?: string | null;
  wheels?: string | null;
  isElectric: boolean;
  motor?: string | null;
  battery?: number | null;
  range?: number | null;
  conditionNotes?: string | null;
  maintenanceHistory?: string | null;
  purchasePriceHT: number;
  sellingPriceHT: number;
  vatRate: number;
  stock: number;
  location?: string | null;
  photos?: string | null; // Séparé par virgules
  internalNotes?: string | null;
  active: boolean;
  userId: string;
}

export interface BikeFilters {
  type?: string;
  condition?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  active?: boolean;
}

async function fetchBikes(filters?: BikeFilters): Promise<Bike[]> {
  const params = new URLSearchParams();
  
  if (filters?.type) params.append('type', filters.type);
  if (filters?.condition) params.append('condition', filters.condition);
  if (filters?.brand) params.append('brand', filters.brand);
  if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.active !== undefined) params.append('active', filters.active.toString());

  const url = `/api/bikes${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'fetch_failed');
  }
  
  return response.json();
}

export function useBikes(filters?: BikeFilters) {
  return useQuery({
    queryKey: ['bikes', filters],
    queryFn: () => fetchBikes(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
