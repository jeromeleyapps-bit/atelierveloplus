import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook personnalisé pour gérer l'état UI des tickets
 * Pattern: Kent C. Dodds "State Colocation"
 * 
 * Centralise:
 * - Dense mode (localStorage)
 * - Colonnes visibles (localStorage)
 * - Menu colonnes anchor
 * - Toast notifications
 */
export function useTicketsUI() {
  // Dense mode avec persistence
  const [dense, setDense] = useLocalStorage('tickets-dense', false);
  
  // Colonnes visibles avec persistence
  const [columns, setColumns] = useLocalStorage('tickets-columns', {
    id: true,                 // N° Ticket (TKT-2025-0001)
    customerId: false,        // ❌ Masqué par défaut (doublon avec "name")
    name: true,               // ✅ Nom du client
    email: false,             // ❌ Masqué par défaut (peu prioritaire)
    CustomerBike: true,       // ✅ Vélo (marque + modèle)
    type: true,               // ✅ Type de réparation (révision, réparation, etc.)
    status: true,             // ✅ Statut (créé, en cours, prêt, livré)
    hubspot: false,           // ❌ Masqué par défaut (technique)
    actions: true,            // ✅ Actions (démarrer, prêt, clôturer, etc.)
  });
  
  // Menu colonnes (non persisté)
  const [colAnchor, setColAnchor] = useState<HTMLElement | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  
  // Helpers
  const showToast = (message: string, severity: "success" | "error" = "success") => {
    setToast({ open: true, message, severity });
  };
  
  const hideToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };
  
  const toggleColumn = (column: keyof typeof columns) => {
    setColumns(prev => ({
      ...prev,
      [column]: !prev[column],
    }));
  };
  
  return {
    // Dense mode
    dense,
    setDense,
    
    // Colonnes
    columns,
    setColumns,
    toggleColumn,
    
    // Menu colonnes
    colAnchor,
    setColAnchor,
    openColumnsMenu: (event: React.MouseEvent<HTMLElement>) => setColAnchor(event.currentTarget),
    closeColumnsMenu: () => setColAnchor(null),
    
    // Toast
    toast,
    setToast,
    showToast,
    hideToast,
  };
}
