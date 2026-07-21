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
  // Freemium : jauges d'utilisation du tier gratuit
  freeUsage?: {
    isFree: boolean;
    customers?: { current: number; limit: number };
    ticketsThisMonth?: { current: number; limit: number };
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
        
        // Afficher si trial actif, grace period, ou version gratuite
        const shouldShow =
          (data.isTrial && data.status === 'active') ||
          data.status === 'grace' ||
          data.tier === 'free';

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

  // === Bannière VERSION GRATUITE (freemium) ===
  if (license.tier === 'free') {
    const gauges = [
      { label: 'Clients', usage: license.freeUsage?.customers },
      { label: 'Tickets ce mois-ci', usage: license.freeUsage?.ticketsThisMonth },
    ].filter((g) => g.usage);

    const anyFull = gauges.some((g) => g.usage && g.usage.current >= g.usage.limit);
    const anyNear = gauges.some((g) => g.usage && g.usage.current >= g.usage.limit * 0.8);

    return (
      <Collapse in={!dismissed}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1300, width: '100%' }}>
          <Alert
            severity={anyFull ? 'warning' : 'info'}
            icon={<Info />}
            action={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<Upgrade />}
                  onClick={handleUpgrade}
                  sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                >
                  Passer à la version supérieure
                </Button>
                <IconButton
                  size="small"
                  onClick={handleDismiss}
                  sx={{ ml: 1, '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' } }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{
              borderRadius: 0,
              mb: 0,
              py: 1,
              '& .MuiAlert-message': { width: '100%' },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Version gratuite
                </Typography>
                {anyFull ? (
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Limite atteinte — passez à Basique ou Pro pour continuer sans limite
                  </Typography>
                ) : anyNear ? (
                  <Typography variant="body2">Vous approchez des limites de la version gratuite</Typography>
                ) : null}
              </Box>

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 0.5 }}>
                {gauges.map(({ label, usage }) => {
                  const pct = usage ? Math.min(100, (usage.current / usage.limit) * 100) : 0;
                  const full = usage ? usage.current >= usage.limit : false;
                  return (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 220, flex: 1 }}>
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {label} : <strong>{usage?.current}/{usage?.limit}</strong>
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        color={full ? 'error' : pct >= 80 ? 'warning' : 'primary'}
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          '& .MuiLinearProgress-bar': { borderRadius: 2 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Alert>
        </Box>
      </Collapse>
    );
  }

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
