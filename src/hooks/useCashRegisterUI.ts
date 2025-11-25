/**
 * Hook useCashRegisterUI - Cash register UI state
 * 
 * Pattern: State Colocation
 * - Dialog state (create/edit)
 * - Form data
 * - Toast messages
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

interface CashEntry {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  invoiceId?: string | null;
  discount?: number | null;
  paymentMethod?: string | null;
  customerEmail?: string | null;
}

interface FormData {
  type: string;
  amount: string;
  description: string;
  invoiceId: string;
  discount: string;
  paymentMethod: string;
  customerEmail: string;
}

interface Toast {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export function useCashRegisterUI() {
  // Dialog
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [form, setForm] = useState<FormData>({
    type: 'direct_sale',
    amount: '',
    description: '',
    invoiceId: '',
    discount: '0',
    paymentMethod: 'cash',
    customerEmail: '',
  });

  // Toast
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Helpers
  const resetForm = () => {
    setForm({
      type: 'direct_sale',
      amount: '',
      description: '',
      invoiceId: '',
      discount: '0',
      paymentMethod: 'cash',
      customerEmail: '',
    });
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: CashEntry) => {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      amount: entry.amount.toString(),
      description: entry.description || '',
      invoiceId: entry.invoiceId || '',
      discount: entry.discount?.toString() || '0',
      paymentMethod: entry.paymentMethod || 'cash',
      customerEmail: entry.customerEmail || '',
    });
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    resetForm();
  };

  const showToast = (message: string, severity: Toast['severity'] = 'success') => {
    setToast({ open: true, message, severity });
  };

  const closeToast = () => {
    setToast({ ...toast, open: false });
  };

  return {
    // Dialog
    open,
    setOpen,
    openCreate,
    closeDialog,

    // Form
    form,
    setForm,
    editingId,
    setEditingId,
    openEdit,
    resetForm,

    // Toast
    toast,
    setToast,
    showToast,
    closeToast,
  };
}
