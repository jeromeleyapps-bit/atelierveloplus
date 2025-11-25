/**
 * Hook useCustomersUI - UI state management
 * 
 * Pattern: State Colocation (Kent C. Dodds)
 * - Toast notifications
 * - Future: dense mode, columns visibility
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

type ToastSeverity = 'success' | 'error' | 'info';

interface Toast {
  open: boolean;
  message: string;
  severity: ToastSeverity;
}

export function useCustomersUI() {
  const [toast, setToast] = useState<Toast>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = (message: string, severity: ToastSeverity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  return {
    toast,
    setToast,
    showToast,
    hideToast,
  };
}
