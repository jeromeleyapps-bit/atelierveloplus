"use client";

/**
 * LicenseBanner - Banner promotion licences - Phase 2.1 Option C
 * 
 * AFFICHAGE:
 * - Trial actif: Banner bleu avec jours restants
 * - Grace period: Banner rouge avec urgence
 * - Basic/Pro < 30j expiration: Banner orange renouvellement
 * - Lifetime: Jamais affiché
 */

import { useState, useEffect, useCallback } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { logger } from '@/lib/logger';

interface LicenseInfo {
  tier: string;
  status: string;
  isTrial: boolean;
  isLifetime: boolean;
  trial?: {
    daysRemaining: number;
  };
  gracePeriod?: {
    daysRemaining: number;
  };
  daysUntilExpiry?: number;
}

// Fonction pure, sortie du composant : elle ne dépend d'aucun état et était
// appelée avant sa déclaration depuis le chargement du statut.
function determineShouldShow(info: LicenseInfo): boolean {
  // Jamais afficher pour Lifetime
  if (info.isLifetime) {
    return false;
  }

  // Afficher si Trial actif
  if (info.isTrial && info.status === 'active') {
    return true;
  }

  // Afficher si en Grace period
  if (info.status === 'grace') {
    return true;
  }

  // Afficher si Basic/Pro expirant dans 30 jours
  if (info.daysUntilExpiry !== undefined && info.daysUntilExpiry <= 30) {
    return true;
  }

  return false;
}

export default function LicenseBanner() {
  const [show, setShow] = useState(false);
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);


  const fetchLicenseStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/license/status');
      if (!response.ok) {
        setShow(false);
        return;
      }

      const data = await response.json();
      setLicense(data);

      // Déterminer si on affiche le banner
      const shouldShow = determineShouldShow(data);
      setShow(shouldShow);
    } catch (error) {
      logger.error('[LicenseBanner] Error fetching status:', error);
      setShow(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Déclaré après fetchLicenseStatus : l'effet la référençait auparavant avant
  // sa déclaration.
  useEffect(() => {
    fetchLicenseStatus();

    // Rafraîchir toutes les 2 minutes pour garder l'affichage à jour
    const interval = setInterval(fetchLicenseStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchLicenseStatus]);

  function getBannerConfig() {
    if (!license) return null;

    // GRACE PERIOD - Rouge urgent
    if (license.status === 'grace' && license.gracePeriod) {
      const days = license.gracePeriod.daysRemaining;
      return {
        severity: 'error' as const,
        icon: <WarningIcon />,
        title: `⚠️ Grace Period - ${days} jour${days > 1 ? 's' : ''} avant blocage`,
        message: `Votre essai gratuit est terminé. Choisissez une licence pour éviter le blocage de l'application.`,
        actionText: days === 1 ? '🔥 Dernière Chance!' : 'Choisir ma licence',
        actionLink: '/admin/license/upgrade',
        showProgress: true,
        progressValue: (days / 7) * 100, // 7 jours total
      };
    }

    // TRIAL ACTIF - Bleu info
    if (license.isTrial && license.trial) {
      const days = license.trial.daysRemaining;
      return {
        severity: 'info' as const,
        icon: <InfoIcon />,
        title: `🎉 Essai gratuit PRO - ${days} jour${days > 1 ? 's' : ''} restants`,
        message: `Profitez de toutes les fonctionnalités PRO gratuitement. Passez à une licence payante pour continuer après l'essai.`,
        actionText: 'Voir les offres',
        actionLink: '/admin/license/upgrade',
        showProgress: true,
        progressValue: (days / 14) * 100, // 14 jours total
      };
    }

    // EXPIRATION PROCHE - Orange warning
    if (license.daysUntilExpiry !== undefined) {
      const days = license.daysUntilExpiry;
      return {
        severity: 'warning' as const,
        icon: <WarningIcon />,
        title: `⏰ Votre licence expire dans ${days} jour${days > 1 ? 's' : ''}`,
        message: `Renouvelez maintenant pour éviter toute interruption de service.`,
        actionText: 'Renouveler',
        actionLink: '/admin/license/upgrade',
        showProgress: false,
      };
    }

    return null;
  }

  if (loading || !show || !license) {
    return null;
  }

  const config = getBannerConfig();
  if (!config) return null;

  return (
    <Alert
      severity={config.severity}
      icon={config.icon}
      sx={{ mb: 2 }}
      action={
        <Button
          color="inherit"
          size="small"
          href={config.actionLink}
          startIcon={<StarIcon />}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {config.actionText}
        </Button>
      }
    >
      <Stack spacing={1}>
        <Typography variant="body2" fontWeight="bold">
          {config.title}
        </Typography>
        <Typography variant="caption">
          {config.message}
        </Typography>

        {config.showProgress && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={config.progressValue}
              color={config.severity === 'error' ? 'error' : 'info'}
              sx={{ height: 6, borderRadius: 1 }}
            />
          </Box>
        )}
      </Stack>
    </Alert>
  );
}
