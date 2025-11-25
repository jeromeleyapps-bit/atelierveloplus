/**
 * Hook useServiceRatesUI - Service rates UI state
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
import type { ServiceRate } from './useServiceRatesData';

interface FormData {
  name: string;
  description: string;
  priceHT: string;
  bikeType: string;
  category: string;
  duration: string;
  active: boolean;
}

export function useServiceRatesUI() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ServiceRate | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    priceHT: '',
    bikeType: '',
    category: '',
    duration: '',
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priceHT: '',
      bikeType: '',
      category: '',
      duration: '',
      active: true,
    });
  };

  const openDialog = (rate?: ServiceRate) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        name: rate.name,
        description: rate.description || '',
        priceHT: rate.priceHT.toString(),
        bikeType: rate.bikeType || '',
        category: rate.category || '',
        duration: rate.duration?.toString() || '',
        active: rate.active,
      });
    } else {
      setEditingRate(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRate(null);
    resetForm();
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const showError = (message: string) => {
    setError(message);
    setSuccess(null);
  };

  return {
    // Dialog
    dialogOpen,
    setDialogOpen,
    openDialog,
    closeDialog,

    // Form
    editingRate,
    setEditingRate,
    formData,
    setFormData,
    resetForm,

    // Messages
    error,
    setError,
    success,
    setSuccess,
    showSuccess,
    showError,
  };
}
