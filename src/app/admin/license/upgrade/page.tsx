"use client";

/**
 * Page: Upgrade Licence - Phase 2.1 Option C
 * /admin/license/upgrade
 * 
 * Comparatif complet des 3 tiers avec pricing, features, et FAQ
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import InfoIcon from '@mui/icons-material/Info';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import PageShell from '../../../components/PageShell';
import RequireAuth from '../../../components/RequireAuth';

export default function UpgradePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError('Veuillez saisir une clé de licence');
      return;
    }

    setActivating(true);
    setError('');
    setSuccess('');

    try {
      const token = window.localStorage.getItem('jwt_token');
      const res = await fetch('/api/admin/license/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ key: licenseKey.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(data.message);
        setLicenseKey('');
        // Rediriger vers la page principale de licence après activation
        setTimeout(() => {
          window.location.href = '/admin/license';
        }, 2000);
      } else {
        setError(data.message || 'Erreur lors de l\'activation');
      }
    } catch (_err) {
      setError('Erreur réseau lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const tiers = [
    {
      name: 'Basique',
      price: 199,
      period: '/an TTC',
      description: 'Parfait pour démarrer votre activité',
      badge: null,
      features: [
        '30 emails automatiques/mois',
        'Facturation illimitée',
        'Gestion clients complète',
        'Export PDF des factures',
        'Support email 48h',
      ],
      limitations: [
        'Pas de campagnes marketing',
        'Toggles système verrouillés',
        'Pas d\'envoi PDF direct',
      ],
      color: undefined, // Pas de couleur spécifique pour Basique
      buttonVariant: 'outlined' as const,
    },
    {
      name: 'Pro',
      price: 359,
      period: '/an TTC',
      description: 'Pour les ateliers établis',
      badge: '⭐ POPULAIRE',
      features: [
        '✉️ Emails illimités',
        '📧 Envoi PDF direct depuis l\'app',
        '📊 Stats avancées',
        '🎯 Campagnes marketing',
        '⚙️ Tous toggles déverrouillés',
        '⚡ Support prioritaire 12h',
      ],
      limitations: [],
      color: 'success',
      buttonVariant: 'contained' as const,
    },
    {
      name: 'Pro Lifetime',
      price: 599,
      period: 'à vie',
      description: 'Investissement unique',
      badge: '🔥 OFFRE LIMITÉE',
      features: [
        '✅ Toutes les fonctionnalités PRO',
        '♾️ Paiement unique - Aucun renouvellement',
        '🛠️ Maintenance 3 ans incluse',
        '💰 Économisez 1 196€ sur 5 ans vs PRO',
        '🎁 Mises à jour gratuites 3 ans',
        '⭐ Support prioritaire à vie',
      ],
      limitations: [],
      color: 'warning',
      buttonVariant: 'contained' as const,
    },
  ];

  return (
    <RequireAuth>
      <PageShell title="Choisissez votre licence">
        <Container maxWidth="lg">
          <Box sx={{ py: 4 }}>
            {/* Header */}
            <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
              Choisissez votre licence
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 1 }}>
              Débloquez tout le potentiel d&apos;Atelier Vélo+ pour votre activité
            </Typography>
            <Typography variant="caption" align="center" display="block" sx={{ mb: 4, color: 'success.main' }}>
              🎁 Offre spéciale -20% pendant votre essai ou grace period!
            </Typography>

            {/* Pricing Cards */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {tiers.map((tier) => (
                <Grid item xs={12} md={4} key={tier.name}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: tier.badge ? 2 : 1,
                      borderColor: (theme) => tier.badge && tier.color ? theme.palette[tier.color as 'success' | 'warning' | 'error' | 'info' | 'primary']?.main || 'divider' : 'divider',
                      position: 'relative',
                      transform: tier.badge === '⭐ POPULAIRE' ? 'scale(1.05)' : 'none',
                      zIndex: tier.badge === '⭐ POPULAIRE' ? 1 : 0,
                    }}
                  >
                    {tier.badge && (
                      <Chip
                        label={tier.badge}
                        color={tier.color && tier.color !== 'default' ? (tier.color as 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary') : 'default'}
                        size="small"
                        sx={{ position: 'absolute', top: 16, right: 16 }}
                      />
                    )}

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {tier.name}
                      </Typography>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {tier.description}
                      </Typography>

                      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                          {tier.price}€
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                          {tier.period}
                        </Typography>
                      </Stack>

                      {tier.name === 'Pro' && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                          Soit 29,92€/mois
                        </Typography>
                      )}

                      {tier.name === 'Pro Lifetime' && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                          Rentable dès 20 mois vs PRO
                        </Typography>
                      )}

                      <List dense>
                        {tier.features.map((feature, i) => (
                          <ListItem key={i} disableGutters>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={feature}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                        {tier.limitations.map((limitation, i) => (
                          <ListItem key={`limit-${i}`} disableGutters>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <CancelIcon color="disabled" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={limitation}
                              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Button
                        variant={tier.buttonVariant}
                        color={tier.color && tier.color !== 'default' ? (tier.color as 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary') : undefined}
                        fullWidth
                        size="large"
                        startIcon={tier.badge ? <StarIcon /> : null}
                        sx={{ mt: 2 }}
                        href="https://upgradedbikes.com/index.php/produit/logiciel-atelier-velo/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Choisir {tier.name}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ mb: 4 }} />

            {/* Comparatif Features */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3 }}>
                Comparatif des fonctionnalités
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">📧 Emails automatiques</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: 30/mois</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro/Lifetime: Illimité</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">📄 Export PDF</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: Création seulement</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro/Lifetime: Création + Envoi direct</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">⚙️ Toggles système</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: Verrouillés</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro/Lifetime: Tous déverrouillés</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">📊 Statistiques</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: Basiques</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro/Lifetime: Avancées</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">🎯 Marketing</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: Non inclus</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro/Lifetime: Campagnes complètes</Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" fontWeight="bold">🛟 Support</Typography>
                  <Typography variant="body2" color="text.secondary">Basique: Email 48h</Typography>
                  <Typography variant="body2" sx={{ color: 'success.main' }}>Pro: Email 12h / Lifetime: Prioritaire</Typography>
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* FAQ */}
            <Box>
              <Typography variant="h5" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3 }}>
                Questions fréquentes
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        💳 Quels moyens de paiement?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Carte bancaire (Visa, Mastercard), PayPal. Virement bancaire pour licences Lifetime.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        🔄 Puis-je changer de licence?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Oui, vous pouvez passer de Basique à Pro à tout moment. L&apos;upgrade est immédiat.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        📧 Si je dépasse 30 emails en Basique?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Les envois sont bloqués jusqu&apos;au mois suivant, ou passez en Pro immédiatement.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        ♾️ Lifetime expire vraiment jamais?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Non, à vie! Maintenance (mises à jour) incluse 3 ans, puis 99€/an optionnel.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        🎉 Grace period c&apos;est quoi?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Après votre essai gratuit, vous avez 7 jours pour choisir une licence avant blocage.
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <InfoIcon color="primary" fontSize="small" />
                    <Box>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                        📞 Besoin d&apos;aide pour choisir?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Contactez-nous: jeromeley.apps@gmail.com ou +33 7 68 18 45 77
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </Box>

            {/* ✅ FIX PC3: Champ d'activation ajouté sur la page upgrade */}
            <Divider sx={{ my: 4 }} />
            
            <Paper 
              sx={{ 
                p: 4, 
                bgcolor: '#fff3e0', 
                borderLeft: 4, 
                borderColor: '#ff9800',
                position: 'relative',
                zIndex: 1000,
                display: 'block',
                visibility: 'visible',
                opacity: 1
              }}
            >
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <VpnKeyIcon color="primary" sx={{ fontSize: 40 }} />
                  <Typography variant="h4" fontWeight="bold" sx={{ color: '#ff9800' }}>
                    🔑 Vous avez déjà une clé de licence?
                  </Typography>
                </Stack>

                <Typography variant="body1" color="text.secondary">
                  Si vous avez déjà acheté une licence, entrez votre clé ci-dessous pour l&apos;activer immédiatement.
                </Typography>

                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <TextField
                  label="Clé de licence"
                  placeholder="AVXX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  fullWidth
                  size="medium"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      fontSize: '1.2rem',
                      bgcolor: 'white',
                      fontWeight: 'bold'
                    } 
                  }}
                  helperText="Format: AVBS (Basique), AVPR (Pro), AVPL (Pro Lifetime)"
                />

                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleActivate}
                  disabled={activating || !licenseKey.trim()}
                  fullWidth
                  size="large"
                  sx={{ 
                    py: 2,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    textTransform: 'none'
                  }}
                >
                  {activating ? 'Activation en cours...' : '✅ Activer ma licence maintenant'}
                </Button>
              </Stack>
            </Paper>
          </Box>
        </Container>
      </PageShell>
    </RequireAuth>
  );
}
