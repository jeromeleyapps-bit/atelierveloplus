/**
 * Tests pour useDebounce hook
 */
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/hooks/useDebounce';

// Mock timers
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    expect(result.current).toBe('first');

    // Change value
    rerender({ value: 'second', delay: 300 });
    
    // Value should not change immediately
    expect(result.current).toBe('first');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Now value should be updated
    expect(result.current).toBe('second');
  });

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Rapid changes
    rerender({ value: 'b' });
    act(() => { jest.advanceTimersByTime(100); });
    
    rerender({ value: 'c' });
    act(() => { jest.advanceTimersByTime(100); });
    
    rerender({ value: 'd' });
    act(() => { jest.advanceTimersByTime(100); });

    // Still should be 'a' (not enough time passed)
    expect(result.current).toBe('a');

    // Complete the debounce
    act(() => { jest.advanceTimersByTime(300); });

    // Should be final value
    expect(result.current).toBe('d');
  });

  it('should work with different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'test', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    // Not enough time
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current).toBe('test');

    // Now enough time
    act(() => { jest.advanceTimersByTime(100); });
    expect(result.current).toBe('updated');
  });

  it('should work with objects', () => {
    const obj1 = { name: 'test' };
    const obj2 = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: obj1 } }
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2 });
    act(() => { jest.advanceTimersByTime(300); });

    expect(result.current).toBe(obj2);
  });

  it('should use default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    // At 299ms, should still be initial
    act(() => { jest.advanceTimersByTime(299); });
    expect(result.current).toBe('initial');

    // At 300ms, should update
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe('changed');
  });
});
