/**
 * Hook useStatsUI - Statistics UI state
 * 
 * Pattern: State Colocation for date filters
 * - From date (default: start of month)
 * - To date (default: end of month)
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

export function useStatsUI() {
  // Date filters (default: current month)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });

  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  return {
    fromDate,
    setFromDate,
    toDate,
    setToDate,
  };
}
