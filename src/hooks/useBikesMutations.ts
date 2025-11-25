/**
 * Hook useBikesMutations - Actions CRUD vélos
 * Pattern: React Query mutations avec invalidation cache
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Bike } from './useBikes';
import { logger } from '@/lib/logger';

export interface MutationCallbacks {
  onSuccess?: (message: string, severity?: 'success' | 'info') => void;
  onError?: (message: string) => void;
}

export interface CreateBikeData {
  type?: string;
  condition?: string;
  brand: string;
  model: string;
  year: number;
  size: string;
  color?: string;
  serialNumber?: string;
  frameSize?: string;
  frameMaterial?: string;
  wheelSize?: string;
  weight?: number;
  groupset?: string;
  brakeType?: string;
  drivetrain?: string;
  fork?: string;
  wheels?: string;
  isElectric?: boolean;
  motor?: string;
  battery?: number;
  range?: number;
  mileage?: number; // Kilométrage (pour vélos électriques)
  conditionNotes?: string;
  maintenanceHistory?: string;
  purchasePriceHT: number;
  sellingPriceHT: number;
  vatRate?: number;
  stock?: number;
  location?: string;
  photos?: string;
  internalNotes?: string;
  active?: boolean;
}

interface SellBikeData {
  customerId: string;
  type: 'INVOICE' | 'QUOTE';
  discount?: number;
  additionalLines?: Array<{
    description: string;
    quantity: number;
    unitPriceHT: number;
  }>;
}

async function createBike(data: CreateBikeData): Promise<Bike> {
  const response = await fetch('/api/bikes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'creation_failed');
  }
  
  return response.json();
}

async function updateBike(id: string, data: Partial<CreateBikeData>): Promise<Bike> {
  const response = await fetch(`/api/bikes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'update_failed');
  }
  
  return response.json();
}

async function deleteBike(id: string, hard: boolean = false): Promise<void> {
  const url = `/api/bikes/${id}${hard ? '?hard=true' : ''}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'delete_failed');
  }
}

async function sellBike(bikeId: string, data: SellBikeData): Promise<unknown> {
  const response = await fetch(`/api/bikes/${bikeId}/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || 'sale_failed');
  }
  
  return response.json();
}

export function useBikesMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Créer vélo
  const createMutation = useMutation({
    mutationFn: createBike,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bikes'] });
      onSuccess?.('Vélo ajouté avec succès', 'success');
    },
    onError: (error: Error) => {
      logger.error('[useBikesMutations] Create error:', error);
      onError?.(error.message || 'Erreur lors de la création');
    },
  });

  // Mutation: Modifier vélo
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBikeData> }) => 
      updateBike(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bikes'] });
      onSuccess?.('Vélo modifié avec succès', 'success');
    },
    onError: (error: Error) => {
      logger.error('[useBikesMutations] Update error:', error);
      onError?.(error.message || 'Erreur lors de la modification');
    },
  });

  // Mutation: Supprimer vélo
  const deleteMutation = useMutation({
    mutationFn: ({ id, hard }: { id: string; hard?: boolean }) => 
      deleteBike(id, hard),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bikes'] });
      const message = variables.hard 
        ? 'Vélo supprimé définitivement' 
        : 'Vélo désactivé';
      onSuccess?.(message, 'success');
    },
    onError: (error: Error) => {
      logger.error('[useBikesMutations] Delete error:', error);
      onError?.(error.message || 'Erreur lors de la suppression');
    },
  });

  // Mutation: Vendre vélo
  const sellMutation = useMutation({
    mutationFn: ({ bikeId, data }: { bikeId: string; data: SellBikeData }) => 
      sellBike(bikeId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bikes'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const message = (result && typeof result === 'object' && 'message' in result && typeof result.message === 'string') 
        ? result.message 
        : 'Vélo vendu avec succès';
      onSuccess?.(message, 'success');
    },
    onError: (error: Error) => {
      logger.error('[useBikesMutations] Sell error:', error);
      onError?.(error.message || 'Erreur lors de la vente');
    },
  });

  return {
    // Create
    create: (data: CreateBikeData) => createMutation.mutate(data),
    isCreating: createMutation.isPending,
    
    // Update
    update: (id: string, data: Partial<CreateBikeData>) => 
      updateMutation.mutate({ id, data }),
    isUpdating: updateMutation.isPending,
    
    // Delete
    delete: (id: string, hard?: boolean) => 
      deleteMutation.mutate({ id, hard }),
    isDeleting: deleteMutation.isPending,
    
    // Sell
    sell: (bikeId: string, data: SellBikeData) => 
      sellMutation.mutate({ bikeId, data }),
    isSelling: sellMutation.isPending,
    
    // Global pending
    isPending: 
      createMutation.isPending || 
      updateMutation.isPending || 
      deleteMutation.isPending ||
      sellMutation.isPending,
  };
}
