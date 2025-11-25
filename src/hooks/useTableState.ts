import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook personnalisé pour gérer l'état d'un tableau (pagination, tri, sélection)
 * Pattern validé: Kent C. Dodds "Epic React" - Separation of Concerns
 * 
 * @param storageKey - Préfixe pour les clés localStorage
 * @param defaultSortBy - Colonne de tri par défaut
 * @returns Objet avec tous les états et helpers du tableau
 */
export interface TableState<T = string> {
  // Pagination
  page: number;
  setPage: (page: number) => void;
  rowsPerPage: number;
  setRowsPerPage: (rows: number) => void;
  
  // Tri
  sortBy: T;
  setSortBy: (field: T) => void;
  sortDir: 'asc' | 'desc';
  setSortDir: (dir: 'asc' | 'desc') => void;
  
  // Sélection
  selected: string[];
  setSelected: (ids: string[]) => void;
  
  // Helpers
  toggleSort: (field: T) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  toggleSelect: (id: string) => void;
}

export function useTableState<T = string>(
  storageKey: string,
  defaultSortBy: T,
  defaultRowsPerPage = 10
): TableState<T> {
  // Pagination - page non persisté (reset à chaque visite)
  const [page, setPage] = useState(0);
  
  // Rows per page - persisté
  const [rowsPerPage, setRowsPerPage] = useLocalStorage(
    `${storageKey}-rows`,
    defaultRowsPerPage
  );
  
  // Tri - persisté
  const [sortBy, setSortBy] = useLocalStorage<T>(
    `${storageKey}-sortBy`,
    defaultSortBy
  );
  
  const [sortDir, setSortDir] = useLocalStorage<'asc' | 'desc'>(
    `${storageKey}-sortDir`,
    'desc'
  );
  
  // Sélection - non persisté
  const [selected, setSelected] = useState<string[]>([]);

  // Toggle sort avec reset page
  const toggleSort = useCallback(
    (field: T) => {
      if (sortBy === field) {
        // Même colonne: inverser direction
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        // Nouvelle colonne: tri ascendant
        setSortBy(field);
        setSortDir('asc');
      }
      setPage(0); // Reset à première page
    },
    [sortBy, sortDir, setSortBy, setSortDir]
  );

  // Sélectionner tous les IDs
  const selectAll = useCallback((ids: string[]) => {
    setSelected(ids);
  }, []);

  // Effacer sélection
  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  // Check si ID est sélectionné
  const isSelected = useCallback(
    (id: string) => selected.includes(id),
    [selected]
  );

  // Toggle sélection d'un ID
  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) =>
        prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      );
    },
    []
  );

  return {
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    selected,
    setSelected,
    toggleSort,
    selectAll,
    clearSelection,
    isSelected,
    toggleSelect,
  };
}
