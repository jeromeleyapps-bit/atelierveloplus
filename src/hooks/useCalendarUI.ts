/**
 * Hook useCalendarUI - Calendar UI state
 * 
 * Pattern: State Colocation for dialogs and forms
 */

import { useState } from 'react';
import type { CalendarBooking } from './useCalendarData';

function isoLocal(d: Date) {
  const z = (n: number) => `${n}`.padStart(2, '0');
  const y = d.getFullYear();
  const m = z(d.getMonth() + 1);
  const day = z(d.getDate());
  const hh = z(d.getHours());
  const mm = z(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function useCalendarUI() {
  // Edit booking dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<CalendarBooking | null>(null);
  const [editStatus, setEditStatus] = useState<string>('pending');

  // Event form
  const [evTitle, setEvTitle] = useState('');
  const [evStart, setEvStart] = useState(isoLocal(new Date()));
  const [evEnd, setEvEnd] = useState(isoLocal(new Date(Date.now() + 60 * 60000)));

  // Block form
  const [blReason, setBlReason] = useState('');
  const [blStart, setBlStart] = useState(isoLocal(new Date()));
  const [blEnd, setBlEnd] = useState(isoLocal(new Date(Date.now() + 60 * 60000)));

  const openEditBooking = (booking: CalendarBooking) => {
    setEditingBooking(booking);
    setEditStatus(booking.status || 'pending');
    setEditOpen(true);
  };

  const closeEditBooking = () => {
    setEditOpen(false);
    setEditingBooking(null);
  };

  return {
    // Edit booking
    editOpen,
    setEditOpen,
    editingBooking,
    setEditingBooking,
    editStatus,
    setEditStatus,
    openEditBooking,
    closeEditBooking,

    // Event form
    evTitle,
    setEvTitle,
    evStart,
    setEvStart,
    evEnd,
    setEvEnd,

    // Block form
    blReason,
    setBlReason,
    blStart,
    setBlStart,
    blEnd,
    setBlEnd,
  };
}
