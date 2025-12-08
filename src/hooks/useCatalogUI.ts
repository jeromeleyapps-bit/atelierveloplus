/**
 * Hook useCatalogUI - Catalog UI state management
 * 
 * Pattern: State Colocation for complex UI
 * - Tab navigation
 * - Multiple dialogs (add, edit, create, b2b, stock)
 * - Toast notifications
 * - Form states
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';
import type { CatalogItem } from '@/lib/api';
import type { SupplierOffer } from '@/components/catalog/SuppliersTab';

interface Toast {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

export function useCatalogUI() {
  // Tab navigation
  const [tab, setTab] = useState(0);

  // Toast notifications
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Add to stock dialog
  const [addToStockDialog, setAddToStockDialog] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<SupplierOffer | null>(null);

  // Edit/Stock dialog
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [stockDialog, setStockDialog] = useState(false);

  // B2B Search dialog
  const [b2bSearchOpen, setB2bSearchOpen] = useState(false);

  // Create item dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [newItem, setNewItem] = useState<Partial<CatalogItem>>({
    category: 'PIECES',
    name: '',
    sku: '',
    priceHT: 0,
    priceTTC: 0,
    vatRate: 20,
    stockQty: 0,
    minStock: 5,
    active: true,
  });

  // Loading states (for actions)
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Helpers
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setToast({ open: true, message, severity });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const openAddToStock = (offer: SupplierOffer) => {
    setSelectedOffer(offer);
    setAddToStockDialog(true);
  };

  const closeAddToStock = () => {
    setAddToStockDialog(false);
    setSelectedOffer(null);
  };

  const openEditStock = (item: CatalogItem) => {
    setEditItem(item);
  };

  const openManageStock = (item: CatalogItem) => {
    setEditItem(item);
    setStockDialog(true);
  };

  const closeStockDialog = () => {
    setStockDialog(false);
    setEditItem(null);
  };

  const openCreateDialog = () => {
    setNewItem({
      category: 'PIECES',
      name: '',
      sku: '',
      priceHT: 0,
      priceTTC: 0,
      vatRate: 20,
      stockQty: 0,
      minStock: 5,
      active: true,
    });
    setCreateDialog(true);
  };

  const closeCreateDialog = () => {
    setCreateDialog(false);
  };

  return {
    // Tab
    tab,
    setTab,

    // Toast
    toast,
    setToast,
    showToast,
    hideToast,

    // Add to stock
    addToStockDialog,
    setAddToStockDialog,
    selectedOffer,
    setSelectedOffer,
    openAddToStock,
    closeAddToStock,

    // Edit/Stock
    editItem,
    setEditItem,
    stockDialog,
    setStockDialog,
    openEditStock,
    openManageStock,
    closeStockDialog,

    // B2B Search
    b2bSearchOpen,
    setB2bSearchOpen,

    // Create
    createDialog,
    setCreateDialog,
    newItem,
    setNewItem,
    openCreateDialog,
    closeCreateDialog,

    // Loading states
    saving,
    setSaving,
    importing,
    setImporting,
  };
}
