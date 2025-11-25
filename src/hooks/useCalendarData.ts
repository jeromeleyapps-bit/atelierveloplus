/**
 * Hook useCalendarData - Calendar events/blocks/bookings
 * 
 * Pattern: 3 parallel queries
 * Manual refetch on date range change
 */

import { useState } from 'react';
import { listCalendarEvents, listCalendarBlocks, listCalendarBookings } from '@/lib/api';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  blocksAvail?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarBlock {
  id: string;
  reason?: string | null;
  start: string;
  end: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarBooking {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  bike?: string | null;
  description?: string | null;
  start: string;
  end: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'done';
  createdAt?: string;
  updatedAt?: string;
}

export function useCalendarData() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadRange(start: Date, end: Date) {
    setLoading(true);
    setErr(null);
    try {
      const [ev, bl, bk] = await Promise.all([
        listCalendarEvents({ start: start.toISOString(), end: end.toISOString() }),
        listCalendarBlocks({ start: start.toISOString(), end: end.toISOString() }),
        listCalendarBookings({ start: start.toISOString(), end: end.toISOString() }),
      ]);
      setEvents(Array.isArray(ev) ? ev as CalendarEvent[] : []);
      setBlocks(Array.isArray(bl) ? bl as CalendarBlock[] : []);
      setBookings(Array.isArray(bk) ? bk as CalendarBooking[] : []);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Erreur de chargement';
      setErr(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 3600 * 1000);
    await loadRange(now, soon);
  }

  return {
    events,
    blocks,
    bookings,
    loading,
    err,
    loadRange,
    refresh,
  };
}
