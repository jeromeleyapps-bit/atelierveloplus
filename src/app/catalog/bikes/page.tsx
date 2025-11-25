"use client";

/**
 * Page Vélos en Vente - Catalogue
 * Règle #1 DRY : Réutilise BikesTab (composant existant)
 * Règle #4 Cohérence : Même thème que landing
 */

import { useRouter } from "next/navigation";
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import RequireAuth from "@/app/components/RequireAuth";
import BikesTab from "@/components/catalog/BikesTab";

// Règle #3 : Pas de valeurs hardcodées - Thème centralisé
const THEME = {
  bg: '#E3F2FD',
  border: '#1976D2',
  text: '#0D47A1',
  primary: '#1976D2',
  primaryDark: '#1565C0',
  primaryLight: '#E3F2FD',
};

export default function BikesPage() {
  const router = useRouter();

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Bannière */}
        <Box
          sx={{
            bgcolor: THEME.bg,
            borderBottom: 2,
            borderColor: THEME.border,
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PedalBikeIcon sx={{ fontSize: 40, color: THEME.primary }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: THEME.text }}>
                    🚲 Vélos en Vente
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion des vélos neufs et occasions
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/catalog')}
                sx={{
                  borderColor: THEME.border,
                  color: THEME.text,
                  '&:hover': {
                    borderColor: THEME.primaryDark,
                    bgcolor: THEME.primaryLight,
                  },
                }}
              >
                Retour au Catalogue
              </Button>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pb: 4 }}>
          <BikesTab theme={THEME} />
        </Container>
      </Box>
    </RequireAuth>
  );
}
