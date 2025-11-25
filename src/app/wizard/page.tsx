"use client";

import { useRouter } from "next/navigation";
import OnboardingWizard from "../components/OnboardingWizard";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { logger } from '@/lib/logger';

/**
 * Page Wizard Onboarding - Première Configuration
 * 
 * Affichée automatiquement si:
 * - User existe mais pas de settings (première utilisation)
 * 
 * Workflow:
 * 1. Bienvenue
 * 2. Identité (nom/prénom)
 * 3. Coordonnées (email/téléphone/adresse)
 * 4. Statut fiscal (SIRET, auto-entrepreneur)
 * 5. Confirmation
 * 
 * Après completion:
 * - Settings sauvegardés en DB
 * - Redirect vers /dashboard
 */
export default function WizardPage() {
  const router = useRouter();

  const handleComplete = () => {
    logger.info('[Wizard] Configuration terminée → Redirect /dashboard');
    router.push("/dashboard");
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Bienvenue dans Atelier Vélo+
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configurons ensemble votre atelier
        </Typography>
      </Box>

      {/* Wizard toujours ouvert en mode fullscreen sur cette page */}
      <OnboardingWizard
        open={true}
        onComplete={handleComplete}
      />
    </Box>
  );
}
