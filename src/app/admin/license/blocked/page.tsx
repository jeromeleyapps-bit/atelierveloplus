"use client";

/**
 * Page: Application Bloquée - Phase 2.1 Option C
 * /admin/license/blocked
 * 
 * Affichée quand status license = 'expired' (grace period terminée)
 */

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export default function BlockedPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            border: 2,
            borderColor: '#d32f2f',
          }}
        >
          <LockIcon
            color="error"
            sx={{ fontSize: 80, mb: 2 }}
          />

          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main' }}>
            Application Bloquée
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Votre période d&apos;essai gratuit et la grace period de 7 jours sont terminées.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
              <ErrorOutlineIcon color="warning" fontSize="small" />
              <Typography variant="body2">
                Pour continuer à utiliser Atelier Vélo+, vous devez choisir une licence.
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary">
              Toutes vos données sont conservées et seront immédiatement accessibles dès l&apos;activation d&apos;une licence.
            </Typography>
          </Stack>

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            startIcon={<StarIcon />}
            href="/admin/license/upgrade"
            sx={{ mb: 2 }}
          >
            Choisir ma licence
          </Button>

          <Stack spacing={1} sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Tarifs:
            </Typography>
            <Typography variant="body2">
              🥉 <strong>Basique:</strong> 199€/an TTC (30 emails/mois)
            </Typography>
            <Typography variant="body2">
              🥈 <strong>Pro:</strong> 359€/an TTC (illimité) - ⭐ POPULAIRE
            </Typography>
            <Typography variant="body2">
              🥇 <strong>Pro Lifetime:</strong> 599€ à vie - 🔥 OFFRE LIMITÉE
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Typography variant="caption" color="text.secondary">
            Besoin d&apos;aide? Contactez-nous: contact@atelier-velo-plus.fr
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
