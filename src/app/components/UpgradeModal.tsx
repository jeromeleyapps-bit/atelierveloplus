"use client";

/**
 * UpgradeModal - Modal d'upgrade vers version Pro - Phase 2.1
 * Affiché quand l'utilisateur Basique clique sur un toggle verrouillé
 * Pricing: Basic 199€, Pro 359€, Pro Lifetime 599€
 */

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: 'notifications' | 'emails' | 'logs' | 'automated';
}

const featureMessages = {
  notifications: {
    title: 'Notifications Push',
    description: 'Recevez des alertes en temps réel pour ne rien manquer',
    benefits: [
      'Alertes instantanées sur mobile et desktop',
      'Notifications de nouveaux tickets',
      'Rappels de tâches importantes',
    ],
  },
  emails: {
    title: 'Emails Automatiques',
    description: 'Envoyez des confirmations et rappels automatiques',
    benefits: [
      'Confirmations de réparation automatiques',
      'Rappels de rendez-vous',
      'Factures par email',
    ],
  },
  logs: {
    title: 'Logs d\'Activité',
    description: 'Tracez toutes les actions pour une meilleure sécurité',
    benefits: [
      'Historique complet des actions',
      'Détection d\'anomalies',
      'Conformité RGPD',
    ],
  },
  automated: {
    title: 'Communications Automatiques',
    description: 'Fidélisez vos clients avec des emails de satisfaction et maintenance',
    benefits: [
      'Emails de satisfaction J+2',
      'Rappels de maintenance 6 mois',
      'Campagnes marketing illimitées',
    ],
  },
};

export default function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const featureInfo = featureMessages[feature];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <LockIcon color="warning" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6">Fonctionnalité Pro Requise</Typography>
            <Typography variant="caption" color="text.secondary">
              {featureInfo.title}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3}>
          {/* Description */}
          <Typography variant="body1" color="text.secondary">
            {featureInfo.description}
          </Typography>

          {/* Benefits */}
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Avec la version Pro, débloquez :
            </Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
              {featureInfo.benefits.map((benefit, index) => (
                <Stack key={index} direction="row" spacing={1} alignItems="center">
                  <CheckCircleIcon color="success" sx={{ fontSize: 20 }} />
                  <Typography variant="body2">{benefit}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Pricing */}
          {/* Pricing Options */}
          <Stack spacing={2}>
            {/* Pro Annuel - RECOMMANDÉ */}
            <Box sx={{ bgcolor: '#E8F5E9', p: 2, borderRadius: 2, border: 2, borderColor: '#4caf50' }}>
              <Chip label="⭐ POPULAIRE" size="small" color="success" sx={{ mb: 1 }} />
              <Stack direction="row" alignItems="baseline" spacing={1} justifyContent="center">
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  359€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  /an TTC
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Soit 29,92€/mois
              </Typography>
            </Box>
            
            {/* Pro Lifetime - OFFRE LIMITÉE */}
            <Box sx={{ bgcolor: '#FFF3E0', p: 2, borderRadius: 2, border: 2, borderColor: '#ff9800' }}>
              <Chip label="🔥 OFFRE LIMITÉE" size="small" color="warning" sx={{ mb: 1 }} />
              <Stack direction="row" alignItems="baseline" spacing={1} justifyContent="center">
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                  599€
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  À VIE
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                Paiement unique + Maintenance 3 ans
              </Typography>
            </Box>
          </Stack>

          <Typography variant="body2" fontWeight="bold">
            Inclus dans les 2 formules:
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center" sx={{ flexWrap: 'wrap' }}>
            <Chip label="📧 Emails illimités" size="small" color="success" />
            <Chip label="⚙️ Tous toggles" size="small" color="success" />
            <Chip label="📊 Stats avancées" size="small" color="success" />
            <Chip label="📤 Envoi PDF direct" size="small" color="success" />
          </Stack>

          {/* CTA */}
          <Typography variant="caption" color="text.secondary" textAlign="center">
            🔒 Sécurisé · ⚡ Activation instantanée · 💳 Annuel ou Lifetime
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Plus tard
        </Button>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<StarIcon />}
          href="/admin/license/upgrade"
          sx={{ px: 4 }}
        >
          Passer en Pro
        </Button>
      </DialogActions>
    </Dialog>
  );
}
