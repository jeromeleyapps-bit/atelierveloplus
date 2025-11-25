"use client";

/**
 * LicenseStatusBadge - Badge de statut de licence dans la navbar
 * Affiche BASIQUE ou PRO + compteur emails si Basique
 */

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Button from '@mui/material/Button';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { logger } from '@/lib/logger';

interface LicenseInfo {
  tier: 'basique' | 'pro';
  status: string;
  limits: {
    emailsPerWeek: number;
    emailsRemaining: number;
  };
  daysUntilExpiry?: number;
}

export default function LicenseStatusBadge() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/license/status')
      .then(res => res.json())
      .then(data => {
        setLicense(data);
        setLoading(false);
      })
      .catch(err => {
        logger.error('License fetch error:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <Chip label="..." size="small" />;
  }

  if (!license) {
    return <Chip label="BASIQUE" size="small" color="default" />;
  }

  const isPro = license.tier === 'pro';
  const emailsPercent = license.limits.emailsPerWeek > 0
    ? (license.limits.emailsRemaining / license.limits.emailsPerWeek) * 100
    : 100;

  const isLowEmails = !isPro && emailsPercent < 20;
  const isExpiringLicense = license.daysUntilExpiry !== undefined && license.daysUntilExpiry < 15;

  // Tooltip content
  const tooltipContent = (
    <Stack spacing={1} sx={{ p: 1 }}>
      <Typography variant="body2" fontWeight="bold">
        {isPro ? '⭐ Version PRO' : '🆓 Version BASIQUE'}
      </Typography>
      
      {!isPro && (
        <>
          <Typography variant="caption">
            📧 Emails cette semaine: {license.limits.emailsPerWeek - license.limits.emailsRemaining}/{license.limits.emailsPerWeek}
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress 
              variant="determinate" 
              value={100 - emailsPercent} 
              color={isLowEmails ? 'warning' : 'primary'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
          {isLowEmails && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              ⚠️ Plus que {license.limits.emailsRemaining} emails
            </Typography>
          )}
          <Button
            size="small"
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<StarIcon />}
            href="/admin/license/upgrade"
            sx={{ mt: 1 }}
          >
            Passer en Pro
          </Button>
        </>
      )}

      {isPro && (
        <>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
            <Typography variant="caption">Emails illimités</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
            <Typography variant="caption">Tous les toggles déverrouillés</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
            <Typography variant="caption">Support prioritaire</Typography>
          </Stack>
        </>
      )}

      {isExpiringLicense && (
        <Typography variant="caption" sx={{ mt: 1, color: 'warning.main' }}>
          ⏰ Expire dans {license.daysUntilExpiry} jours
        </Typography>
      )}
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent} arrow>
      <Chip
        icon={isPro ? <StarIcon /> : isLowEmails ? <WarningIcon /> : undefined}
        label={isPro ? 'PRO' : 'BASIQUE'}
        size="small"
        color={isPro ? 'success' : isLowEmails ? 'warning' : 'default'}
        sx={{
          fontWeight: 'bold',
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
        component="a"
        href={isPro ? '/admin/license' : '/admin/license/upgrade'}
      />
    </Tooltip>
  );
}
