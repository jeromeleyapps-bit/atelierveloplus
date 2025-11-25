"use client";

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CartIcon from '@mui/icons-material/ShoppingCart';

interface OrdersTabProps {
  onToast: (message: string, severity?: "success" | "error" | "info") => void;
}

export default function OrdersTab({ onToast }: OrdersTabProps) {
  return (
    <Box>
      <Paper elevation={2} sx={{ p: 6, textAlign: "center" }}>
        <CartIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          Gestion des Commandes
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Créez et suivez vos commandes fournisseurs
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            size="large"
            onClick={() => onToast("Fonctionnalité en cours de développement", "info")}
          >
            Nouvelle Commande
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => onToast("Historique des commandes", "info")}
          >
            Voir l&apos;Historique
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
