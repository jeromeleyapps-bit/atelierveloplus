/**
 * Hook useAppointmentsMutations - Create booking mutation
 * 
 * Pattern: TanStack Mutation
 * - Create booking
 * - Invalidate slots query
 * - Loading state
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface BookingPayload {
  start: string;
  name: string;
  email?: string;
  phone?: string;
  bike?: string;
  description?: string;
}

interface MutationCallbacks {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

async function createBooking(payload: BookingPayload): Promise<unknown> {
  const res = await fetch(`/api/calendar/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.error || 'Réservation impossible');
  return j;
}

export function useAppointmentsMutations(callbacks?: MutationCallbacks) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = callbacks || {};

  // Mutation: Create booking
  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // Invalider tous les slots queries (toutes les ranges)
      queryClient.invalidateQueries({ queryKey: ['appointmentSlots'] });
      onSuccess?.('Réservation enregistrée. Vous recevrez une confirmation.');
    },
    onError: (error) => {
      logger.error('Create booking error:', error);
      onError?.((error as Error).message || 'Erreur lors de la réservation');
    },
  });

  return {
    // Create booking
    create: (payload: BookingPayload) => createMutation.mutate(payload),
    isCreating: createMutation.isPending,
  };
}
