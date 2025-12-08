/**
 * Hook useBikesUI - Gestion état UI vélos
 * Pattern: État local pour dialogs, filtres, toast
 */

import { useState } from 'react';
import type { Bike, BikeFilters } from './useBikes';

export interface BikeToast {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export function useBikesUI() {
  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // État sélection
  const [selectedBike, setSelectedBike] = useState<Bike | null>(null);
  
  // Filtres
  const [filters, setFilters] = useState<BikeFilters>({
    active: true, // Afficher seulement actifs par défaut
  });
  
  // Toast notifications
  const [toast, setToast] = useState<BikeToast>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Helpers
  function showToast(message: string, severity: BikeToast['severity'] = 'info') {
    setToast({ open: true, message, severity });
  }

  function closeToast() {
    setToast(prev => ({ ...prev, open: false }));
  }

  function openAddDialog() {
    setAddDialogOpen(true);
  }

  function closeAddDialog() {
    setAddDialogOpen(false);
  }

  function openEditDialog(bike: Bike) {
    setSelectedBike(bike);
    setEditDialogOpen(true);
  }

  function closeEditDialog() {
    setEditDialogOpen(false);
    setSelectedBike(null);
  }

  function openSellDialog(bike: Bike) {
    setSelectedBike(bike);
    setSellDialogOpen(true);
  }

  function closeSellDialog() {
    setSellDialogOpen(false);
    setSelectedBike(null);
  }

  function openDetailsDialog(bike: Bike) {
    setSelectedBike(bike);
    setDetailsDialogOpen(true);
  }

  function closeDetailsDialog() {
    setDetailsDialogOpen(false);
    setSelectedBike(null);
  }

  function openDeleteDialog(bike: Bike) {
    setSelectedBike(bike);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    setDeleteDialogOpen(false);
    setSelectedBike(null);
  }

  function updateFilters(newFilters: Partial<BikeFilters>) {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }

  function resetFilters() {
    setFilters({ active: true });
  }

  return {
    // Dialogs state
    addDialogOpen,
    editDialogOpen,
    sellDialogOpen,
    detailsDialogOpen,
    deleteDialogOpen,
    
    // Selection
    selectedBike,
    setSelectedBike,
    
    // Filtres
    filters,
    updateFilters,
    resetFilters,
    
    // Toast
    toast,
    showToast,
    closeToast,
    setToast,
    
    // Dialog actions
    openAddDialog,
    closeAddDialog,
    openEditDialog,
    closeEditDialog,
    openSellDialog,
    closeSellDialog,
    openDetailsDialog,
    closeDetailsDialog,
    openDeleteDialog,
    closeDeleteDialog,
  };
}
