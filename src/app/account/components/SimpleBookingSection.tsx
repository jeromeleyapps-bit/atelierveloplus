"use client";

import { useState, useEffect } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import EventIcon from '@mui/icons-material/Event';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SectionCard from '@/app/components/SectionCard';
import { logger } from '@/lib/logger';

interface SimpleBookingSectionProps {
  rdvHost: string;
  onRdvHostChange: (host: string) => void;
  onShowToast: (message: string, severity: 'success' | 'error') => void;
}

export default function SimpleBookingSection({
  rdvHost: _rdvHost,
  onRdvHostChange: _onRdvHostChange,
  onShowToast,
}: SimpleBookingSectionProps) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<'checking' | 'active' | 'inactive' | 'error'>('checking');

  // Génération automatique du lien RDV
  const defaultDomain = 'rdv-atelier-velo.app'; // Domaine par défaut
  const bookingUrl = `https://${defaultDomain}`;

  useEffect(() => {
    // Vérifier le statut au chargement
    checkBookingStatus();
  }, []);

  async function checkBookingStatus() {
    setStatus('checking');
    try {
      // Vérifier si le tunnel est actif
      const api = (window as { electronAPI?: { cloudflaredStatus?: () => Promise<{ running: boolean }> } }).electronAPI;
      if (api?.cloudflaredStatus) {
        const cfStatus = await api.cloudflaredStatus();
        setStatus(cfStatus.running ? 'active' : 'inactive');
        setEnabled(cfStatus.running);
      } else {
        // Mode web: vérifier via API
        const response = await fetch('/api/tunnel/status');
        if (response.ok) {
          const data = await response.json();
          setStatus(data.active ? 'active' : 'inactive');
          setEnabled(data.active);
        } else {
          setStatus('inactive');
        }
      }
    } catch (error) {
      logger.error('[BOOKING] Erreur vérification status:', error);
      setStatus('error');
    }
  }

  async function handleToggle(checked: boolean) {
    if (checked) {
      // Activer les RDV
      await activateBooking();
    } else {
      // Désactiver les RDV
      await deactivateBooking();
    }
  }

  async function activateBooking() {
    try {
      setStatus('checking');
      
      const api = (window as { electronAPI?: { startCloudflared?: () => Promise<{ ok: boolean; message?: string }> } }).electronAPI;
      if (api?.startCloudflared) {
        // Mode Electron: démarrer le tunnel
        const res = await api.startCloudflared();
        if (res?.ok) {
          setEnabled(true);
          setStatus('active');
          onShowToast('✅ RDV en ligne activés!', 'success');
        } else {
          throw new Error(res?.message || 'Échec activation');
        }
      } else {
        // Mode web: activer via API
        const response = await fetch('/api/tunnel/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: defaultDomain }),
        });
        
        if (response.ok) {
          setEnabled(true);
          setStatus('active');
          onShowToast('✅ RDV en ligne activés!', 'success');
        } else {
          throw new Error('Échec activation');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[BOOKING] Erreur activation:', message);
      setEnabled(false);
      setStatus('error');
      onShowToast(`❌ Erreur: ${message}`, 'error');
    }
  }

  async function deactivateBooking() {
    try {
      setStatus('checking');
      
      const api = (window as { electronAPI?: { stopCloudflared?: () => Promise<{ ok: boolean; message?: string }> } }).electronAPI;
      if (api?.stopCloudflared) {
        // Mode Electron: arrêter le tunnel
        const res = await api.stopCloudflared();
        if (res?.ok) {
          setEnabled(false);
          setStatus('inactive');
          onShowToast('RDV en ligne désactivés', 'success');
        } else {
          throw new Error(res?.message || 'Échec désactivation');
        }
      } else {
        // Mode web: désactiver via API
        const response = await fetch('/api/tunnel/deactivate', {
          method: 'POST',
        });
        
        if (response.ok) {
          setEnabled(false);
          setStatus('inactive');
          onShowToast('RDV en ligne désactivés', 'success');
        } else {
          throw new Error('Échec désactivation');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[BOOKING] Erreur désactivation:', message);
      setStatus('error');
      onShowToast(`❌ Erreur: ${message}`, 'error');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    onShowToast('📋 Lien copié!', 'success');
  }

  function getStatusColor(): 'success' | 'error' | 'default' | 'warning' {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'error': return 'error';
      case 'checking': return 'warning';
      default: return 'default';
    }
  }

  function getStatusText(): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'error': return 'Erreur';
      case 'checking': return 'Vérification...';
      default: return 'Inconnu';
    }
  }

  return (
    <SectionCard title="RDV en Ligne" icon={<EventIcon color="primary" />}>
      <Stack spacing={3}>
        {/* Bannière explicative */}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Permettez à vos clients de prendre RDV en ligne 24/7</strong>
          </Typography>
          <Typography variant="caption">
            Activez cette fonctionnalité pour générer un lien de réservation que vous pourrez partager 
            par SMS, email ou sur votre site web. Vos clients verront vos disponibilités en temps réel 
            et pourront réserver un créneau en quelques clics.
          </Typography>
        </Alert>

        {/* Switch principal */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => handleToggle(e.target.checked)}
                  disabled={status === 'checking'}
                  color="success"
                  size="medium"
                />
              }
              label={
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {enabled ? 'Activé' : 'Désactivé'}
                </Typography>
              }
            />
            <Chip
              label={getStatusText()}
              color={getStatusColor()}
              size="small"
              icon={status === 'active' ? <CheckCircleIcon /> : status === 'error' ? <ErrorIcon /> : undefined}
            />
          </Stack>
          <Button
            size="small"
            onClick={checkBookingStatus}
            disabled={status === 'checking'}
          >
            Actualiser
          </Button>
        </Stack>

        {/* Lien de réservation (si activé) */}
        <Collapse in={enabled && status === 'active'}>
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              🎉 Votre lien de réservation est prêt!
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                bgcolor: 'rgba(255,255,255,0.9)',
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Link
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ flex: 1, wordBreak: 'break-all', fontSize: '0.9rem' }}
              >
                {bookingUrl}
              </Link>
              <IconButton
                size="small"
                onClick={() => copyToClipboard(bookingUrl)}
                sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              💡 Partagez ce lien à vos clients par SMS, email, ou ajoutez-le sur votre site web
            </Typography>
          </Alert>
        </Collapse>

        {/* Instructions si désactivé */}
        <Collapse in={!enabled && status === 'inactive'}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>RDV en ligne désactivés</strong>
            </Typography>
            <Typography variant="caption">
              Activez le switch ci-dessus pour permettre à vos clients de prendre RDV en ligne. 
              Un lien de réservation sera généré automatiquement.
            </Typography>
          </Alert>
        </Collapse>

        {/* Erreur */}
        <Collapse in={status === 'error'}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>⚠️ Erreur de configuration</strong>
            </Typography>
            <Typography variant="caption">
              Impossible d&apos;activer les RDV en ligne. Vérifiez que Cloudflare Tunnel est correctement 
              installé et configuré, ou contactez le support.
            </Typography>
          </Alert>
        </Collapse>
      </Stack>
    </SectionCard>
  );
}
