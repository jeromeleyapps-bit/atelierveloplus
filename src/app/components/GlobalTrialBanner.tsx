"use client";

/**
 * GlobalTrialBanner - Bannière trial persistante en haut de toutes les pages
 * 
 * AFFICHAGE:
 * - Trial actif: Bannière bleue persistante avec compteur jours
 * - Grace period: Bannière rouge urgente
 * - Position: Sticky top, non-intrusive mais toujours visible
 */

import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import Close from '@mui/icons-material/Close';
import Info from '@mui/icons-material/Info';
import Warning from '@mui/icons-material/Warning';
import Upgrade from '@mui/icons-material/Upgrade';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

interface LicenseInfo {
  tier: string;
  status: string;
  isTrial: boolean;
  isLifetime: boolean;
  trial?: {
    daysRemaining: number;
    endsAt: string;
  };
  gracePeriod?: {
    daysRemaining: number;
    endsAt: string;
  };
}

export default function GlobalTrialBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchLicenseStatus();
    
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchLicenseStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchLicenseStatus = async () => {
    try {
      const response = await fetch('/api/admin/license/status');
      if (response.ok) {
        const data = await response.json();
        setLicense(data);
        
        // Afficher uniquement si trial actif ou grace period
        const shouldShow = 
          (data.isTrial && data.status === 'active') || 
          data.status === 'grace';
        
        setShow(shouldShow);
      }
    } catch (error) {
      logger.error('[GlobalTrialBanner] Error:', error);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Réafficher après 30 minutes
    setTimeout(() => setDismissed(false), 30 * 60 * 1000);
  };

  const handleUpgrade = () => {
    router.push('/admin/license/upgrade');
  };

  if (!show || !license || dismissed) return null;

  const isGracePeriod = license.status === 'grace';
  const daysRemaining = isGracePeriod 
    ? license.gracePeriod?.daysRemaining || 0
    : license.trial?.daysRemaining || 0;
  
  const totalDays = isGracePeriod ? 7 : 14;
  const progress = ((totalDays - daysRemaining) / totalDays) * 100;
  const severity = isGracePeriod ? "error" : (daysRemaining <= 3 ? "warning" : "info");

  return (
    <Collapse in={!dismissed}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1300, // Au-dessus de la navigation
          width: '100%',
        }}
      >
        <Alert
          severity={severity}
          icon={isGracePeriod ? <Warning /> : <Info />}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                size="small"
                variant="contained"
                color={severity === "error" ? "error" : "primary"}
                startIcon={<Upgrade />}
                onClick={handleUpgrade}
                sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}
              >
                {isGracePeriod ? '🔥 Activer maintenant' : 'Voir les offres'}
              </Button>
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{ 
                  ml: 1,
                  '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' }
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          }
          sx={{
            borderRadius: 0,
            mb: 0,
            py: 1,
            "& .MuiAlert-message": {
              width: "100%",
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {isGracePeriod ? (
                  <>⚠️ Grace Period - Action requise</>
                ) : (
                  <>🎉 Essai PRO gratuit</>
                )}
              </Typography>
              
              <Typography variant="body2">
                {daysRemaining === 0 ? (
                  <strong style={{ color: severity === "error" ? "#d32f2f" : "#ed6c02" }}>
                    Dernier jour !
                  </strong>
                ) : daysRemaining === 1 ? (
                  <strong style={{ color: severity === "error" ? "#d32f2f" : "#ed6c02" }}>
                    1 jour restant
                  </strong>
                ) : (
                  <>
                    <strong>{daysRemaining} jours</strong> restants
                  </>
                )}
              </Typography>

              {license.trial?.endsAt && !isGracePeriod && (
                <Typography variant="caption" color="text.secondary">
                  Jusqu&apos;au {new Date(license.trial.endsAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long'
                  })}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 2,
                  },
                }}
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  minWidth: 35, 
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '0.7rem'
                }}
              >
                {Math.round(progress)}%
              </Typography>
            </Box>

            {isGracePeriod && (
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 0.5,
                  fontWeight: 600,
                  color: (theme) => severity === "error" ? theme.palette.error.main : theme.palette.warning.main
                }}
              >
                🚨 Choisissez une licence pour éviter le blocage de l&apos;application
              </Typography>
            )}

            {!isGracePeriod && daysRemaining <= 3 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  mt: 0.5,
                  fontWeight: 600,
                  color: (theme) => theme.palette.warning.main
                }}
              >
                ⏰ Votre essai se termine bientôt - Passez à une licence pour conserver vos fonctionnalités PRO
              </Typography>
            )}
          </Box>
        </Alert>
      </Box>
    </Collapse>
  );
}
