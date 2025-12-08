/**
 * Hook useAppointmentsData - Fetch appointment slots
 * 
 * Pattern: TanStack Query with custom refetch
 * - Manual query trigger (pas d'auto-fetch au mount pour page publique)
 * - Cache 2 min
 * - Range-based fetch
 * 
 * References:
 * - https://tanstack.com/query/latest/docs/react/guides/queries
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

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

export function useAppointmentsData() {
  const [rangeStart, setRangeStart] = useState<string>(() => isoLocal(new Date()));
  const [rangeEnd, setRangeEnd] = useState<string>(() => isoLocal(addDays(new Date(), 7)));

  // Query avec auto-fetch pour UX optimale page publique
  const {
    data: slots = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointmentSlots', rangeStart, rangeEnd],
    queryFn: () => fetchSlots(rangeStart, rangeEnd),
    staleTime: 2 * 60 * 1000, // 2 min (slots changent souvent)
    gcTime: 5 * 60 * 1000,
    enabled: true, // Auto-fetch au mount + re-fetch si range change
  });

  return {
    // Range
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,

    // Data
    slots,
    isLoading,
    error: error ? (error as Error).message : null,

    // Actions
    load: refetch,
  };
}
