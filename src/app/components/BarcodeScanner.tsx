"use client";

import React, { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloseIcon from '@mui/icons-material/Close';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { logger } from '@/lib/logger';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string, productData?: unknown) => void;
}

interface Html5QrcodeInstance {
  stop: () => Promise<void>;
  start: (cameraIdOrConfig: string | MediaStreamConstraints, config: unknown, qrCodeSuccessCallback: (decodedText: string) => void, qrCodeErrorCallback?: (errorMessage: string) => void) => Promise<void>;
}

export default function BarcodeScanner({ open, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const [_scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Start camera scanning with html5-qrcode
  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);
      setManualMode(false);

      // Dynamic import
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      
      const scanner = new Html5Qrcode("barcode-reader", {
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
      scannerRef.current = scanner as unknown as Html5QrcodeInstance;

      // Try to get camera permissions first
      try {
        const devices = await Html5Qrcode.getCameras();
        logger.info('Available cameras', { count: devices.length });
        
        if (devices.length === 0) {
          throw new Error('Aucune caméra détectée');
        }

        // Prefer back camera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        const cameraId = backCamera ? backCamera.id : devices[0].id;
        logger.info('Using camera', { cameraId });

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          async (decodedText: string) => {
            // Barcode detected
            logger.info('Barcode detected', { decodedText });
            
            // Stop scanning
            await scanner.stop();
            setScanning(false);
            
            // Lookup product data
            await handleBarcodeDetected(decodedText);
          },
          (_errorMessage: string) => {
            // Errors are ignored (too many logs)
          }
        );
      } catch (permErr) {
        logger.error('Permission error:', permErr);
        throw permErr;
      }
    } catch (err) {
      logger.error('Camera error:', err);
      
      let errorMessage = 'Erreur d\'accès à la caméra.';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('permission')) {
          errorMessage = 'Accès à la caméra refusé.\n\nVeuillez :\n1. Autoriser l\'accès dans les paramètres du navigateur\n2. Vérifier que vous êtes en HTTPS\n3. Réessayer';
        } else if (err.name === 'NotFoundError' || err.message?.includes('No camera')) {
          errorMessage = 'Aucune caméra trouvée sur cet appareil.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'La caméra est déjà utilisée par une autre application.';
        } else if (err.message) {
          errorMessage = `Erreur: ${err.message}`;
        }
      }
      
      setError(errorMessage + '\n\nUtilisez la saisie manuelle.');
      setScanning(false);
      setManualMode(true);
    }
  };

  // Stop camera scanning
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

  // Handle barcode detection
  const handleBarcodeDetected = async (barcode: string, searchRetailers: boolean = false) => {
    setLoading(true);
    try {
      // Lookup product data from API
      const url = `/api/catalog/barcode?barcode=${encodeURIComponent(barcode)}${searchRetailers ? '&searchRetailers=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.found) {
        // Product found in database
        onScan(barcode, data);
        onClose();
      } else if (res.ok && data.canSearchRetailers && !searchRetailers) {
        // Product not found in public APIs, ask if user wants to search retailers
        setLoading(false);
        const searchOnRetailers = window.confirm(
          'Produit non trouvé dans les bases publiques.\n\n' +
          'Voulez-vous chercher sur les sites spécialisés vélo ?\n' +
          '(Alltricks, Probikeshop, Bike24, Decathlon)\n\n' +
          'Cela prendra quelques secondes supplémentaires.'
        );
        
        if (searchOnRetailers) {
          // Retry with retailer search
          await handleBarcodeDetected(barcode, true);
        } else {
          // User declined, use barcode without product data
          onScan(barcode, null);
          onClose();
        }
      } else {
        // Product not found, but still use the barcode
        onScan(barcode, null);
        onClose();
      }
    } catch (err) {
      logger.error('Lookup error:', err);
      // Still use the barcode even if lookup fails
      onScan(barcode, null);
      onClose();
    } finally {
      if (!error) {
        setLoading(false);
      }
    }
  };

  // Handle manual barcode entry
  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      handleBarcodeDetected(manualBarcode.trim());
    }
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open && scannerRef.current) {
      stopScanning();
    }
  }, [open]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { minHeight: manualMode ? 'auto' : '500px' }
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={1}>
            <QrCodeScannerIcon />
            <Typography variant="h6">
              {manualMode ? 'Saisie manuelle' : 'Scanner un code-barres'}
            </Typography>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography>Recherche en cours...</Typography>
          </Box>
        )}

        {!loading && !manualMode && (
          <Stack spacing={2}>
            {error && (
              <Alert severity="warning" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Scanner container with camera permissions */}
            <Box
              id="barcode-reader"
              sx={{
                width: '100%',
                minHeight: '300px',
                '& video': {
                  width: '100%',
                  borderRadius: 1,
                },
                '& iframe': {
                  border: 'none',
                },
              }}
              // Force camera permissions
              component="div"
              data-allow="camera"
            />

            <Button
              variant="outlined"
              startIcon={<KeyboardIcon />}
              onClick={() => {
                stopScanning();
                setManualMode(true);
              }}
              fullWidth
            >
              Saisie manuelle
            </Button>
          </Stack>
        )}

        {!loading && manualMode && (
          <Stack spacing={2}>
            {error && (
              <Alert severity="info" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Code-barres"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualSubmit();
                }
              }}
              placeholder="Saisissez ou scannez le code-barres"
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
              onClick={startScanning}
              fullWidth
            >
              Utiliser la caméra
            </Button>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
      </DialogActions>
    </Dialog>
  );
}
