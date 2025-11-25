/**
 * Hook useAdminCatalogUI - Admin catalog UI state
 * 
 * Pattern: State Colocation
 * - Filters (search, category)
 * - Pagination
 * - Edit dialog
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';
import type { CatalogItem } from '@/lib/api';
import type { CatalogCategory } from '@/lib/catalog';

interface ProductData {
  category?: string;
  name?: string;
  brand?: string;
}

export function useAdminCatalogUI(isAutoEntrepreneur: boolean = false) {
  // Filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CatalogCategory | ''>('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Dialog
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<CatalogItem> | null>(null);

  // Helpers
  const openCreate = () => {
    const vatRate = isAutoEntrepreneur ? 0 : 20;
    console.log('[ADMIN CATALOG] openCreate - isAE:', isAutoEntrepreneur, '=> TVA:', vatRate + '%');
    setCurrent({
      sku: '',
      category: 'piece',
      name: '',
      priceHT: 0,
      priceTTC: 0,
      vatRate: vatRate,
      active: true,
      purchasePriceHT: 0,
      purchasePriceTTC: 0,
      supplierVatEnabled: false,
      marginCoeff: 1,
    });
    setEditOpen(true);
  };

  const openEdit = (row: CatalogItem) => {
    setCurrent({ ...row });
    setEditOpen(true);
  };

  const closeDialog = () => {
    setEditOpen(false);
    setCurrent(null);
  };

  const handleBarcodeScan = (barcode: string, productData?: ProductData) => {
    const newItem: Partial<CatalogItem> = {
      sku: barcode,
      category: productData?.category || 'piece',
      name: productData?.name || '',
      priceHT: 0,
      priceTTC: 0,
      vatRate: isAutoEntrepreneur ? 0 : 20,
      active: true,
      purchasePriceHT: 0,
      purchasePriceTTC: 0,
      supplierVatEnabled: false,
      marginCoeff: 1,
    };

    // If we have brand info, prepend it to the name
    if (productData?.brand && productData?.name) {
      newItem.name = `${productData.brand} - ${productData.name}`;
    }

    setCurrent(newItem);
    setEditOpen(true);
  };

  return {
    // Filters
    q,
    setQ,
    category,
    setCategory,

    // Pagination
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,

    // Dialog
    editOpen,
    setEditOpen,
    current,
    setCurrent,
    openCreate,
    openEdit,
    closeDialog,
    handleBarcodeScan,
  };
}
