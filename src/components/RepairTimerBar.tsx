"use client";

/**
 * RepairTimerBar - Persistent floating timer bar
 * 
 * Best Practices:
 * - Fixed position for visibility across pages
 * - Color-coded for quick visual feedback
 * - Non-intrusive (top bar, collapsible)
 * - Click to stop with confirmation
 * 
 * UX Design:
 * - Green (0-59min): Normal pace
 * - Orange (1h-2h): Getting long
 * - Red (2h+): Very long, needs attention
 */

import Box from '@mui/material/Box';

import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import BuildIcon from '@mui/icons-material/Build';
import { useRepairTimer } from '@/contexts/RepairTimerContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function RepairTimerBar() {
  const { isActive, elapsed, color, isPaused, pauseRepair, resumeRepair, stopRepair, activeTimer: _activeTimer } = useRepairTimer();
  const router = useRouter();

  // Add padding to body when timer is active
  useEffect(() => {
    if (isActive) {
      document.body.style.paddingTop = '80px';
    } else {
      document.body.style.paddingTop = '0';
    }
    return () => {
      document.body.style.paddingTop = '0';
    };
  }, [isActive]);

  if (!isActive) return null;

  const handleStop = async () => {
    if (confirm('Arrêter le chronomètre et ajouter main d\'\u0153uvre au ticket ?')) {
      await stopRepair(async (ticketId, durationMinutes) => {
        // Mettre à jour estimatedMinutes du workOrder
        try {
          const token = localStorage.getItem('jwt_token');
          // Facturation par tranches de 30 min: 1-30min=0.5h, 31-60min=1h, etc.
          const durationHours = Math.ceil(durationMinutes / 30) * 0.5;
          
          // 1. Récupérer tarif horaire depuis GlobalSetting
          let hourlyRate = 60; // Défaut
          try {
            const settingsResponse = await fetch('/api/settings/pricing.hourlyRate', {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            });
            if (settingsResponse.ok) {
              const settingData = await settingsResponse.json();
              if (settingData?.value) {
                const parsedRate = parseFloat(settingData.value);
                if (!isNaN(parsedRate) && parsedRate > 0) {
                  hourlyRate = parsedRate;
                }
              }
            }
          } catch (err) {
            logger.warn('[RepairTimer] Erreur lecture tarif horaire, utilise défaut 60€/h:', err);
          }
          
          logger.info(`[RepairTimer] Tarif horaire: ${hourlyRate}€/h`);
          logger.info(`[RepairTimer] Durée: ${durationMinutes}min = ${durationHours}h facturables`);
          logger.info(`[RepairTimer] Montant HT: ${durationHours} × ${hourlyRate}€ = ${(durationHours * hourlyRate).toFixed(2)}€`);
          
          // 2. Mettre à jour estimatedMinutes pour le devis
          const estimateResponse = await fetch(`/api/workshop/workorders/${ticketId}/estimate`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              estimatedMinutes: durationMinutes,
              hourlyRate: hourlyRate, // Sauvegarder tarif utilisé
            }),
          });
          
          if (!estimateResponse.ok) {
            let errorData;
            try {
              errorData = await estimateResponse.json();
            } catch {
              errorData = { error: estimateResponse.statusText };
            }
            logger.error('[RepairTimer] Erreur PATCH /estimate:', errorData);
            throw new Error(`Erreur mise à jour estimatedMinutes: ${errorData.error || estimateResponse.statusText}`);
          }
          
          // NOTE: La ligne main d'œuvre sera créée automatiquement lors de la génération du devis
          // via /api/finance/quotes qui calcule laborCostHT depuis estimatedMinutes
          logger.info(`[RepairTimer] ✅ Temps enregistré: ${durationMinutes}min → ${durationHours}h × ${hourlyRate}€/h = ${(durationHours * hourlyRate).toFixed(2)}€`);
          logger.info('[RepairTimer] La ligne main d\'œuvre sera ajoutée lors de la génération du devis');
          
          // Naviguer vers la page du ticket pour afficher la nouvelle ligne
          logger.info('[RepairTimer] Navigation vers ticket...');
          
          // Rediriger vers la page du ticket
          router.push(`/tickets/${ticketId}`);
        } catch (error) {
          logger.error('Erreur ajout main d\'\u0153uvre:', error);
          alert('Erreur lors de l\'ajout de la main d\'\u0153uvre. Veuillez l\'ajouter manuellement.');
        }
      });
    }
  };

  const bgColor = 
    color === 'success' ? '#d1fae5' :
    color === 'warning' ? '#fed7aa' :
    '#fee2e2';

  const textColor =
    color === 'success' ? '#065f46' :
    color === 'warning' ? '#92400e' :
    '#991b1b';

  const borderColor =
    color === 'success' ? '#10b981' :
    color === 'warning' ? '#f59e0b' :
    '#ef4444';

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        bgcolor: bgColor,
        borderBottom: 3,
        borderColor: borderColor,
        py: 1.5,
        px: 2,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ maxWidth: 1200, mx: 'auto' }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <BuildIcon sx={{ fontSize: 28, color: textColor }} />
          <Box>
            <Typography
              variant="body2"
              sx={{ color: textColor, fontWeight: 600, lineHeight: 1.2 }}
            >
              Réparation démarrée depuis :
            </Typography>
            <Typography
              variant="h5"
              sx={{
                color: textColor,
                fontWeight: 700,
                fontFamily: 'monospace',
                letterSpacing: 1,
                mt: 0.5,
              }}
            >
              {elapsed}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          {isPaused ? (
            <Tooltip title="Redémarrer">
              <IconButton
                size="small"
                onClick={resumeRepair}
                sx={{
                  color: textColor,
                  bgcolor: 'rgba(0,0,0,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.2)',
                  },
                }}
              >
                <PlayArrowIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Mettre en pause">
              <IconButton
                size="small"
                onClick={pauseRepair}
                sx={{
                  color: textColor,
                  bgcolor: 'rgba(0,0,0,0.1)',
                  '&:hover': {
                    bgcolor: 'rgba(0,0,0,0.2)',
                  },
                }}
              >
                <PauseIcon />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Arrêter">
            <IconButton
              size="small"
              onClick={handleStop}
              sx={{
                color: textColor,
                bgcolor: 'rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.2)',
                },
              }}
            >
              <StopIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
