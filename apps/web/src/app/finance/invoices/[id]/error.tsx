"use client";
import { useEffect } from "react";
import { Alert, Button, Stack, Typography } from "@mui/material";

export default function InvoiceRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => { console.error("[InvoiceRouteError]", error); }, [error]);
  return (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Alert severity="error">Une erreur est survenue lors de l’affichage de la facture.</Alert>
      <Typography variant="body2" color="text.secondary">{error?.message || "Erreur inconnue"}</Typography>
      <Button variant="contained" onClick={() => reset()}>Recharger</Button>
    </Stack>
  );
}