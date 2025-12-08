"use client";
import { useEffect } from "react";
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { logger } from '@/lib/logger';

export default function InvoiceRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => { 
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[InvoiceRouteError]", { error: errorMessage, digest: error.digest }); 
  }, [error]);
  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Alert severity="error">Une erreur est survenue lors de l’affichage de la facture.</Alert>
      <Typography variant="body2" color="text.secondary">{error?.message || "Erreur inconnue"}</Typography>
      <Button variant="contained" onClick={() => reset()}>Recharger</Button>
    </Stack>
  );
}