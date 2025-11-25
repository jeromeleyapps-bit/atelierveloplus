/**
 * Hook useAppointmentsUI - UI state for booking dialog and alerts
 * 
 * Pattern: State Colocation
 * - Dialog open/close
 * - Selected slot
 * - Form state
 * - Submit message
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

interface BookingForm {
  name: string;
  email: string;
  phone: string;
  bike: string;
  description: string;
}

interface SubmitMessage {
  ok: boolean;
  msg: string;
}

export function useAppointmentsUI() {
  // Dialog state
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Slot | null>(null);

  // Form state
  const [form, setForm] = useState<BookingForm>({
    name: '',
    email: '',
    phone: '',
    bike: '',
    description: '',
  });

  // Submit feedback
  const [submitMsg, setSubmitMsg] = useState<SubmitMessage | null>(null);

  // Helpers
  const openDialog = (slot: Slot) => {
    setSelected(slot);
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
  };

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
      bike: '',
      description: '',
    });
    setSelected(null);
  };

  return {
    // Dialog
    open,
    setOpen,
    openDialog,
    closeDialog,

    // Selection
    selected,
    setSelected,

    // Form
    form,
    setForm,
    resetForm,

    // Messages
    submitMsg,
    setSubmitMsg,
  };
}
