/**
 * Hook useScannerUI - Barcode scanner UI state
 * 
 * Pattern: State Colocation for hardware interface
 * - Scanner state (scanning, manual mode)
 * - Error and result display
 * - Manual barcode input
 * 
 * References:
 * - https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster
 */

import { useState } from 'react';

export function useScannerUI() {
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const showError = (message: string) => {
    setError(message);
    setScanning(false);
    setManualMode(true);
  };

  const clearError = () => {
    setError(null);
  };

  const startManualMode = () => {
    setManualMode(true);
    setScanning(false);
  };

  const exitManualMode = () => {
    setManualMode(false);
  };

  const resetScanner = () => {
    setScanning(false);
    setManualMode(false);
    setError(null);
    setResult(null);
    setManualBarcode('');
  };

  return {
    // State
    scanning,
    setScanning,
    manualMode,
    setManualMode,
    manualBarcode,
    setManualBarcode,
    error,
    setError,
    result,
    setResult,

    // Actions
    showError,
    clearError,
    startManualMode,
    exitManualMode,
    resetScanner,
  };
}
