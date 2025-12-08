import { renderHook, act } from '@testing-library/react';
import { useTableState } from '@/hooks/useTableState';

describe('useTableState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    expect(result.current.page).toBe(0);
    expect(result.current.rowsPerPage).toBe(10);
    expect(result.current.sortBy).toBe('name');
    // Note: useTableState initialise sortDir à 'desc' par défaut (voir useTableState.ts ligne 59)
    expect(result.current.sortDir).toBe('desc');
    expect(result.current.selected).toEqual([]);
  });

  it('should update page', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
  });

  it('should update rowsPerPage', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    act(() => {
      result.current.setRowsPerPage(25);
    });

    expect(result.current.rowsPerPage).toBe(25);
  });

  it('should toggle sort direction when same field', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    // Valeur par défaut est 'desc' (voir useTableState.ts ligne 59)
    expect(result.current.sortDir).toBe('desc');

    act(() => {
      result.current.toggleSort('name');
    });

    // Après toggle, devrait être 'asc' (inverse de 'desc')
    expect(result.current.sortDir).toBe('asc');

    act(() => {
      result.current.toggleSort('name');
    });

    // Après toggle, devrait être 'desc' (inverse de 'asc')
    expect(result.current.sortDir).toBe('desc');
  });

  it('should change sort field and reset to asc when different field', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    // Initialement sortDir est 'desc' (valeur par défaut)
    expect(result.current.sortDir).toBe('desc');

    act(() => {
      result.current.toggleSort('email'); // Change de colonne, devrait reset à 'asc'
    });

    expect(result.current.sortBy).toBe('email');
    expect(result.current.sortDir).toBe('asc'); // Reset à 'asc' quand on change de colonne
  });

  it('should handle selection', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    act(() => {
      result.current.toggleSelect('id1');
    });

    expect(result.current.selected).toContain('id1');
    expect(result.current.isSelected('id1')).toBe(true);

    act(() => {
      result.current.toggleSelect('id1');
    });

    expect(result.current.selected).not.toContain('id1');
    expect(result.current.isSelected('id1')).toBe(false);
  });

  it('should select all', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    act(() => {
      result.current.selectAll(['id1', 'id2', 'id3']);
    });

    expect(result.current.selected).toEqual(['id1', 'id2', 'id3']);
  });

  it('should clear selection', () => {
    const { result } = renderHook(() => useTableState('test-table', 'name'));

    act(() => {
      result.current.selectAll(['id1', 'id2']);
      result.current.clearSelection();
    });

    expect(result.current.selected).toEqual([]);
  });
});

