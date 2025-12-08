"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// ✅ Hook personnalisé
import { useScannerUI } from '@/hooks/useScannerUI';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import ResponsiveContainer from "@/components/ResponsiveContainer";
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { logger } from '@/lib/logger';

interface Html5QrcodeInstance {
  stop: () => Promise<void>;
  start: (cameraIdOrConfig: string | MediaStreamConstraints, config: unknown, qrCodeSuccessCallback: (decodedText: string) => void, qrCodeErrorCallback?: (errorMessage: string) => void) => Promise<void>;
}

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  
  // ✅ Hook personnalisé pour UI state
  const scannerUI = useScannerUI();
  
  // Alias locaux pour compatibilité
  const scanning = scannerUI.scanning;
  const setScanning = scannerUI.setScanning;
  const manualMode = scannerUI.manualMode;
  const setManualMode = scannerUI.setManualMode;
  const manualBarcode = scannerUI.manualBarcode;
  const setManualBarcode = scannerUI.setManualBarcode;
  const error = scannerUI.error;
  const setError = scannerUI.setError;
  const result = scannerUI.result;
  const setResult = scannerUI.setResult;

  // Start camera scanning
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);
      setManualMode(false);

      // Dynamic import with error handling
      let Html5Qrcode, Html5QrcodeSupportedFormats;
      try {
        const qrcodeModule = await import('html5-qrcode');
        Html5Qrcode = qrcodeModule.Html5Qrcode;
        Html5QrcodeSupportedFormats = qrcodeModule.Html5QrcodeSupportedFormats;
      } catch (importErr) {
        logger.error('Failed to import html5-qrcode:', importErr);
        throw new Error('Impossible de charger le scanner. Veuillez rafraîchir la page.');
      }
      
      const scanner = new Html5Qrcode("scanner-container", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      logger.info('Available cameras:', devices.length);
      
      if (devices.length === 0) {
        throw new Error('Aucune caméra détectée');
      }

      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const cameraId = backCamera ? backCamera.id : devices[0].id;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        async (decodedText: string) => {
          logger.info('Barcode detected', { decodedText });
          await scanner.stop();
          setScanning(false);
          setResult(decodedText);
          
          // Redirect back to catalog with barcode
          router.push(`/admin/catalog?barcode=${encodeURIComponent(decodedText)}`);
        },
        (_errorMessage: string) => {
          // Errors ignored
        }
      );
    } catch (err) {
      logger.error('Camera error:', err);
      
      let errorMessage = 'Erreur d\'accès à la caméra.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
          errorMessage = 'Accès à la caméra refusé. Autorisez l\'accès dans les paramètres.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra trouvée.';
        } else if (err.message) {
          errorMessage = `Erreur: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setScanning(false);
      setManualMode(true);
    }
  };

  // Stop scanning
  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        logger.error('Error stopping scanner:', err);
      }
    }
    setScanning(false);
  };

  // Handle manual entry
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      router.push(`/admin/catalog?barcode=${encodeURIComponent(manualBarcode.trim())}`);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <ResponsiveContainer maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.back()}
              variant="outlined"
              size="small"
            >
              Retour
            </Button>
            <Typography variant="h5" component="h1" flexGrow={1}>
              Scanner de code-barres
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {result && (
            <Alert severity="success">
              Code-barres scanné : {result}
            </Alert>
          )}

          {!scanning && !manualMode && (
            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CameraAltIcon />}
                onClick={startScanning}
                fullWidth
              >
                Démarrer le scan
              </Button>

              <Button
                variant="outlined"
                startIcon={<KeyboardIcon />}
                onClick={() => setManualMode(true)}
                fullWidth
              >
                Saisie manuelle
              </Button>
            </Stack>
          )}

          {scanning && (
            <Stack spacing={2}>
              <Box
                id="scanner-container"
                sx={{
                  width: '100%',
                  minHeight: '300px',
                  bgcolor: 'black',
                  borderRadius: 1,
                  '& video': {
                    width: '100%',
                    borderRadius: 1,
                  },
                }}
              />

              <Button
                variant="outlined"
                onClick={stopScanning}
                fullWidth
              >
                Arrêter
              </Button>
            </Stack>
          )}

          {manualMode && (
            <Stack spacing={2}>
              <TextField
                label="Code-barres"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualSubmit();
                  }
                }}
                placeholder="Saisissez le code-barres"
                fullWidth
                autoFocus
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
              />

              <Button
                variant="contained"
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
                fullWidth
              >
                Rechercher
              </Button>

              <Button
                variant="outlined"
                startIcon={<CameraAltIcon />}
                onClick={() => {
                  setManualMode(false);
                  startScanning();
                }}
                fullWidth
              >
                Utiliser la caméra
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </ResponsiveContainer>
  );
}
