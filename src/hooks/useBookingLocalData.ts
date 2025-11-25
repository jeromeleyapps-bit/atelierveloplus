/**
 * Hook useBookingLocalData - Admin booking with customers
 * 
 * Pattern: Extends appointment slots with customers list
 * - Same as useAppointmentsData but adds customers query
 * - For admin/internal booking interface
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { logger } from '@/lib/logger';

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

function isoLocal(d: Date) {
  const z = (n: number) => `${n}`.padStart(2, '0');
  const y = d.getFullYear();
  const m = z(d.getMonth() + 1);
  const day = z(d.getDate());
  const hh = z(d.getHours());
  const mm = z(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}

async function fetchSlots(rangeStart: string, rangeEnd: string): Promise<Slot[]> {
  const rs = new Date(rangeStart).toISOString();
  const re = new Date(rangeEnd).toISOString();
  const r = await fetch(
    `/api/calendar/availability?start=${encodeURIComponent(rs)}&end=${encodeURIComponent(re)}`
  );
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || 'Erreur de chargement');
  return j.slots || [];
}

async function fetchCustomers(): Promise<unknown[]> {
  try {
    const res = await fetch('/api/customers');
    if (res.ok) {
      return await res.json();
    }
    return [];
  } catch (e) {
    logger.error('Failed to load customers', e);
    return [];
  }
}

export function useBookingLocalData() {
  const [rangeStart, setRangeStart] = useState<string>(() => isoLocal(new Date()));
  const [rangeEnd, setRangeEnd] = useState<string>(() => isoLocal(addDays(new Date(), 7)));

  // Query: Appointment slots (enabled=false pour contrôle manuel)
  const {
    data: slots = [],
    isLoading: isLoadingSlots,
    error: slotsError,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['appointmentSlots', rangeStart, rangeEnd],
    queryFn: () => fetchSlots(rangeStart, rangeEnd),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: false,
  });

  // Query: Customers for autocomplete
  const {
    data: customers = [],
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    // Range
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,

    // Slots
    slots,
    isLoadingSlots,
    slotsError: slotsError ? (slotsError as Error).message : null,
    loadSlots: refetchSlots,

    // Customers
    customers,
    isLoadingCustomers,
    customersError,

    // Global loading
    isLoading: isLoadingSlots,
  };
}
