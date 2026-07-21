"use client";

/**
 * Page Gestion Licence - Nouvelle version avec tuiles cliquables
 * Trial (non interactive) | Basique (cliquable) | Pro (cliquable) | Pro Lifetime (cliquable)
 */

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import PageShell from '../../components/PageShell';
import RequireAuth from '../../components/RequireAuth';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import RedeemPurchaseTokenCard from './components/RedeemPurchaseTokenCard';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { LicenseInfo } from '@/lib/license-manager';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { logger } from '@/lib/logger';

// Freemium : la route status enrichit LicenseInfo avec les jauges du tier gratuit
type LicensePageInfo = LicenseInfo & {
  freeUsage?: {
    isFree: boolean;
    customers?: { current: number; limit: number };
    ticketsThisMonth?: { current: number; limit: number };
  };
};

export default function LicensePage() {
  const [advancedMode] = useAdvancedMode();
  const [license, setLicense] = useState<LicensePageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [_verifying, setVerifying] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLicense = async () => {
    try {
      const token = window.localStorage.getItem('jwt_token');
      const res = await fetch('/api/admin/license/status', {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      
      // ✅ FIX PC3: Toujours définir loading à false, même si l'API échoue
      // Permet d'afficher la page avec le champ d'activation même si le statut ne charge pas
      if (res.ok) {
        const data = await res.json();
        setLicense(data);
      } else {
        // Si l'API échoue, définir un objet license par défaut pour permettre l'affichage
        logger.warn('[License] API error, using default license state');
        setLicense({
          tier: 'basique',
          status: 'active',
          isTrial: false,
          isLifetime: false,
          features: {
            unlimitedEmails: false,
            marketingCampaigns: false,
            bookingOnline: false,
            advancedStats: false,
            togglesUnlocked: false,
            pdfDirectSend: false,
          },
          limits: {
            emailsPerMonth: 30,
            emailsRemaining: 0,
            emailResetDate: new Date(),
          },
        });
      }
      setLoading(false);
    } catch (err) {
      logger.error('License fetch error:', err);
      // ✅ FIX PC3: Même en cas d'erreur, permettre l'affichage de la page
      setLicense({
        tier: 'basique',
        status: 'active',
        isTrial: false,
        isLifetime: false,
        features: {
          unlimitedEmails: false,
          marketingCampaigns: false,
          bookingOnline: false,
          advancedStats: false,
          togglesUnlocked: false,
          pdfDirectSend: false,
        },
        limits: {
          emailsPerMonth: 30,
          emailsRemaining: 0,
          emailResetDate: new Date(),
        },
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicense();
    
    // ✅ Rafraîchir toutes les minutes pour mettre à jour le compteur de jours restants
    const interval = setInterval(fetchLicense, 60 * 1000); // Toutes les minutes
    return () => clearInterval(interval);
  }, []);

  // ✅ FIX React #310: Log de débogage AVANT tout return conditionnel
  // Tous les hooks doivent être appelés avant tout return conditionnel
  useEffect(() => {
    logger.info('[LicensePage] Rendu', { loading, license });
  }, [loading, license]);

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
        setTimeout(() => fetchLicense(), 1000);
      } else {
        setError(data.message || 'Erreur lors de l\'activation');
      }
    } catch (_err) {
      setError('Erreur réseau lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const _handleVerify = async () => {
    setVerifying(true);
    try {
      const token = window.localStorage.getItem('jwt_token');
      const res = await fetch('/api/admin/license/verify', {
        method: 'POST',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      const data = await res.json();
      if (data.valid) {
        setSuccess('Licence vérifiée avec succès!');
        fetchLicense();
      } else {
        setError(data.message || 'Licence invalide');
      }
    } catch (_err) {
      setError('Erreur lors de la vérification');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <RequireAuth>
        <PageShell title="Licence" headerColor="#9c27b0">
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </PageShell>
      </RequireAuth>
    );
  }

  const currentTier = license?.tier || 'basique';
  const isTrial = license?.isTrial || false;

  // Lien d'achat : page tarifs (checkout Stripe automatique). Configurable via env,
  // fallback sur l'ancienne boutique si non défini.
  const PURCHASE_URL =
    process.env.NEXT_PUBLIC_PURCHASE_URL ||
    'https://upgradedbikes.com/index.php/produit/logiciel-atelier-velo/';

  const handleBuyLicense = () => {
    window.open(PURCHASE_URL, '_blank');
  };

  return (
    <RequireAuth>
      <PageShell title="Gestion de Licence" headerColor="#9c27b0">
        <Stack spacing={4}>
          {/* Sprint 2 : activation d'un code d'achat Stripe (flow Token → clé). */}
          <RedeemPurchaseTokenCard onActivated={() => fetchLicense()} />

          {/* Saisie manuelle d'une clé de licence — réservée au mode avancé / SAV.
              Le client normal utilise la carte "Activer un code d'achat" ci-dessus. */}
          {advancedMode && (
          <Paper
            sx={{
              p: 3,
              bgcolor: '#fff3e0',
              borderLeft: 4,
              borderColor: '#ff9800',
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <VpnKeyIcon color="primary" sx={{ fontSize: 32 }} />
                <Typography variant="h5" fontWeight="bold" sx={{ color: '#ff9800' }}>
                  🔑 Vous avez déjà une clé de licence?
                </Typography>
              </Stack>

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
                    fontSize: '1.1rem',
                    bgcolor: 'white'
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
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textTransform: 'none'
                }}
              >
                {activating ? 'Activation en cours...' : '✅ Activer ma licence'}
              </Button>
            </Stack>
          </Paper>
          )}

          {/* ✅ Rappel harmonieux jours restants (remplace l'ancienne section "Licence active") */}
          {license && (license.tier || license.isTrial) && (
            (() => {
              // Calculer les jours restants selon le type de licence
              let daysRemaining: number | null = null;
              let label = '';
              let severity: 'success' | 'warning' | 'error' | 'info' = 'info';
              let icon = <AccessTimeIcon />;
              let bgColor = '#e3f2fd';
              let borderColor = '#2196f3';

              // Version gratuite (freemium)
              if (license.tier === 'free') {
                const c = license.freeUsage?.customers;
                const t = license.freeUsage?.ticketsThisMonth;
                const parts = [
                  c ? `${c.current}/${c.limit} clients` : null,
                  t ? `${t.current}/${t.limit} tickets ce mois-ci` : null,
                ].filter(Boolean);
                const atLimit = (c && c.current >= c.limit) || (t && t.current >= t.limit);
                label = `Version gratuite active${parts.length ? ` — ${parts.join(', ')}` : ''}. Vos données sont conservées, sans expiration.`;
                if (atLimit) {
                  label += ' Limite atteinte : passez à Basique ou Pro pour continuer sans limite.';
                  severity = 'warning';
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                  icon = <WarningIcon />;
                } else {
                  severity = 'info';
                  bgColor = '#e3f2fd';
                  borderColor = '#2196f3';
                  icon = <CheckCircleOutlineIcon />;
                }
              }
              // Trial actif
              else if (license.isTrial && license.trial?.daysRemaining !== undefined) {
                daysRemaining = license.trial.daysRemaining;
                const days = daysRemaining;
                if (days > 7) {
                  label = `Essai gratuit PRO actif - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} avant la fin de l'essai`;
                  severity = 'info';
                  bgColor = '#e3f2fd';
                  borderColor = '#2196f3';
                  icon = <StarIcon />;
                } else if (days > 3) {
                  label = `Essai gratuit PRO - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} avant la fin de l'essai`;
                  severity = 'warning';
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                  icon = <WarningIcon />;
                } else {
                  label = `⚠️ Essai gratuit PRO - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} ! Renouvelez maintenant pour éviter le blocage`;
                  severity = 'error';
                  bgColor = '#ffebee';
                  borderColor = '#f44336';
                  icon = <WarningIcon />;
                }
              }
              // Grace period
              else if (license.status === 'grace' && license.gracePeriod?.daysRemaining !== undefined) {
                daysRemaining = license.gracePeriod.daysRemaining;
                const days = daysRemaining;
                const _tierName = license.tier === 'pro' ? 'Pro' : license.tier === 'basique' ? 'Basique' : 'Trial';
                if (days > 3) {
                  label = `Grace period active - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} avant le blocage de l'application`;
                  severity = 'warning';
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                  icon = <WarningIcon />;
                } else if (days > 1) {
                  label = `⚠️ Grace period - ${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''} ! Activez une licence maintenant pour éviter le blocage`;
                  severity = 'error';
                  bgColor = '#ffebee';
                  borderColor = '#f44336';
                  icon = <WarningIcon />;
                } else {
                  label = `🔥 Dernière chance ! ${days} jour restant avant le blocage. Activez une licence immédiatement !`;
                  severity = 'error';
                  bgColor = '#ffebee';
                  borderColor = '#f44336';
                  icon = <WarningIcon />;
                }
              }
              // Pro/Basique avec expiration (sauf si status='expired' - sera redirigé vers /blocked)
              else if ((license.tier === 'pro' || license.tier === 'basique') && license.status !== 'expired' && license.daysUntilExpiry !== undefined) {
                daysRemaining = license.daysUntilExpiry;
                const days = daysRemaining;
                const tierName = license.tier === 'pro' ? 'Pro' : 'Basique';
                
                // Convertir expiresAt en Date si c'est une string (JSON)
                let expiresAtDate: Date | null = null;
                if (license.expiresAt) {
                  expiresAtDate = typeof license.expiresAt === 'string' ? new Date(license.expiresAt) : license.expiresAt;
                }
                
                if (days > 30) {
                  label = `Licence ${tierName} valide jusqu'au ${expiresAtDate ? expiresAtDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'} (${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''})`;
                  severity = 'success';
                  bgColor = '#e8f5e9';
                  borderColor = '#4caf50';
                  icon = <CheckCircleOutlineIcon />;
                } else if (days > 7) {
                  label = `Licence ${tierName} expire dans ${days} jour${days > 1 ? 's' : ''} (le ${expiresAtDate ? expiresAtDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}). Renouvelez pour éviter l'interruption`;
                  severity = 'warning';
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                  icon = <WarningIcon />;
                } else if (days > 1) {
                  label = `⚠️ Licence ${tierName} expire dans ${days} jour${days > 1 ? 's' : ''} ! Renouvelez maintenant pour éviter le blocage`;
                  severity = 'error';
                  bgColor = '#ffebee';
                  borderColor = '#f44336';
                  icon = <WarningIcon />;
                } else {
                  label = `🔥 Licence ${tierName} expire demain ! Renouvelez immédiatement pour éviter le blocage`;
                  severity = 'error';
                  bgColor = '#ffebee';
                  borderColor = '#f44336';
                  icon = <WarningIcon />;
                }
              }
              // Lifetime avec maintenance
              else if ((license.tier === 'pro_lifetime' || license.isLifetime) && license.status !== 'expired') {
                if (license.maintenanceExpiresAt) {
                  // Convertir maintenanceExpiresAt en Date si c'est une string (JSON)
                  const maintenanceDate = typeof license.maintenanceExpiresAt === 'string' 
                    ? new Date(license.maintenanceExpiresAt) 
                    : new Date(license.maintenanceExpiresAt);
                  const now = new Date();
                  const diffMs = maintenanceDate.getTime() - now.getTime();
                  const daysUntilMaintenance = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                  
                  if (diffMs < 0) {
                    // Maintenance terminée
                    label = `✅ Licence Pro Lifetime active à vie. Support prioritaire terminé le ${maintenanceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. L'application continue de fonctionner normalement.`;
                    severity = 'success';
                    bgColor = '#e8f5e9';
                    borderColor = '#4caf50';
                    icon = <CheckCircleOutlineIcon />;
                  } else if (daysUntilMaintenance <= 30) {
                    // Maintenance bientôt terminée
                    label = `Support prioritaire Pro Lifetime se termine dans ${daysUntilMaintenance} jour${daysUntilMaintenance > 1 ? 's' : ''} (le ${maintenanceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}). L'application continue de fonctionner à vie.`;
                    severity = 'warning';
                    bgColor = '#fff3e0';
                    borderColor = '#ff9800';
                    icon = <WarningIcon />;
                  } else {
                    // Maintenance active
                    label = `✅ Licence Pro Lifetime active à vie. Support prioritaire jusqu'au ${maintenanceDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
                    severity = 'success';
                    bgColor = '#e8f5e9';
                    borderColor = '#4caf50';
                    icon = <CheckCircleOutlineIcon />;
                  }
                } else {
                  // Lifetime sans date de maintenance
                  label = `✅ Licence Pro Lifetime active à vie. Aucune expiration prévue.`;
                  severity = 'success';
                  bgColor = '#e8f5e9';
                  borderColor = '#4caf50';
                  icon = <CheckCircleOutlineIcon />;
                }
              }

              // Ne pas afficher si pas de jours restants calculés ou si Lifetime sans maintenance
              if (!label) {
                return null;
              }

              return (
                <Paper 
                  sx={{ 
                    p: 3, 
                    bgcolor: bgColor,
                    borderLeft: 4, 
                    borderColor: borderColor,
                    borderRadius: 2,
                    boxShadow: 2,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box sx={{ 
                      color: borderColor,
                      display: 'flex',
                      alignItems: 'center',
                      mt: 0.5
                    }}>
                      {icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="body1" 
                        fontWeight={daysRemaining !== null && daysRemaining <= 7 ? 'bold' : 'medium'}
                        sx={{ 
                          color: severity === 'error' ? '#d32f2f' : severity === 'warning' ? '#ed6c02' : severity === 'success' ? '#2e7d32' : '#1976d2',
                          lineHeight: 1.6
                        }}
                      >
                        {label}
                      </Typography>
                      {daysRemaining !== null && daysRemaining <= 7 && (license.status === 'grace' || license.tier === 'pro' || license.tier === 'basique') && (
                        <Button
                          variant="contained"
                          color={severity === 'error' ? 'error' : 'warning'}
                          size="small"
                          sx={{ mt: 2, textTransform: 'none' }}
                          onClick={() => window.open(PURCHASE_URL, '_blank')}
                        >
                          {license.status === 'grace' ? 'Activer une licence maintenant' : 'Renouveler ma licence'}
                        </Button>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              );
            })()
          )}

          {/* Tuiles des formules */}
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Choisissez votre formule
            </Typography>
            
            <Grid container spacing={3}>
              {/* TRIAL - Non cliquable */}
              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: 2,
                    borderColor: isTrial ? '#2196f3' : '#e0e0e0',
                    bgcolor: isTrial ? '#e3f2fd' : 'background.paper',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      {/* Header - Hauteur fixe */}
                      <Box sx={{ textAlign: 'center', minHeight: 140 }}>
                        <StarIcon sx={{ fontSize: 48, color: '#2196f3' }} />
                        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 0.5 }}>
                          Trial
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#2196f3', fontWeight: 'bold', mb: 0.5 }}>
                          GRATUIT 14j
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: 20 }}>
                          &nbsp;
                        </Typography>
                      </Box>

                      {/* Description - Hauteur fixe */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        textAlign="center"
                        sx={{ minHeight: 40, px: 1 }}
                      >
                        Testez toutes les fonctionnalités PRO pendant 14 jours
                      </Typography>

                      {/* Liste - Flex grow */}
                      <List dense sx={{ flexGrow: 1 }}>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Emails illimités"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Campagnes marketing"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Statistiques avancées"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Toutes les fonctionnalités"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
                    <Button
                      fullWidth
                      variant={isTrial ? 'contained' : 'outlined'}
                      color="info"
                      disabled
                      sx={{ textTransform: 'none' }}
                    >
                      {isTrial ? 'Actif' : 'Trial uniquement au démarrage'}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              {/* BASIQUE - Cliquable */}
              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: 2,
                    borderColor: currentTier === 'basique' && !isTrial ? '#4caf50' : '#e0e0e0',
                    bgcolor: currentTier === 'basique' && !isTrial ? '#e8f5e9' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s',
                    },
                  }}
                  onClick={handleBuyLicense}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      {/* Header - Hauteur fixe */}
                      <Box sx={{ textAlign: 'center', minHeight: 140 }}>
                        <VpnKeyIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 0.5 }}>
                          Basique
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5 }}>
                          199€/an TTC
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: 20 }}>
                          &nbsp;
                        </Typography>
                      </Box>

                      {/* Description - Hauteur fixe */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        textAlign="center"
                        sx={{ minHeight: 40, px: 1 }}
                      >
                        Pour les petits ateliers avec besoins modérés
                      </Typography>

                      {/* Liste - Flex grow */}
                      <List dense sx={{ flexGrow: 1 }}>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="30 emails/mois"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Création de PDF"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CancelIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Pas d'envoi PDF direct"
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CancelIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Pas de campagnes"
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                          />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      {currentTier === 'basique' && !isTrial ? (
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          sx={{ textTransform: 'none' }}
                          disabled
                        >
                          Actif
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyLicense();
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Acheter une licence
                        </Button>
                      )}
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>

              {/* PRO - Cliquable */}
              <Grid item xs={12} md={6} lg={3}>
                <Box sx={{ position: 'relative', height: '100%' }}>
                  {/* Badge RECOMMANDÉ - En dehors de la Card */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: 'primary.main',
                      color: 'white',
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      zIndex: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    RECOMMANDÉ
                  </Box>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: 2,
                      borderColor: currentTier === 'pro' ? '#4caf50' : '#1976d2',
                      bgcolor: currentTier === 'pro' ? '#e8f5e9' : 'background.paper',
                      cursor: 'pointer',
                      '&:hover': {
                        boxShadow: 6,
                        transform: 'translateY(-4px)',
                        transition: 'all 0.3s',
                      },
                    }}
                    onClick={handleBuyLicense}
                  >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      {/* Header - Hauteur fixe */}
                      <Box sx={{ textAlign: 'center', minHeight: 140 }}>
                        <StarIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 0.5 }}>
                          Pro
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, color: 'primary.main' }}>
                          359€/an TTC
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: 20 }}>
                          &nbsp;
                        </Typography>
                      </Box>

                      {/* Description - Hauteur fixe */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        textAlign="center"
                        sx={{ minHeight: 40, px: 1 }}
                      >
                        Pour les ateliers professionnels exigeants
                      </Typography>

                      {/* Liste - Flex grow */}
                      <List dense sx={{ flexGrow: 1 }}>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Emails ILLIMITÉS"
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Envoi PDF direct"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Campagnes marketing"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Stats avancées"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Tous toggles déverrouillés"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      {currentTier === 'pro' ? (
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          sx={{ textTransform: 'none' }}
                          disabled
                        >
                          Actif
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyLicense();
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Acheter une licence
                        </Button>
                      )}
                    </Stack>
                  </CardActions>
                </Card>
                </Box>
              </Grid>

              {/* PRO LIFETIME - Cliquable */}
              <Grid item xs={12} md={6} lg={3}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: 2,
                    borderColor: currentTier === 'pro_lifetime' ? '#4caf50' : '#ff9800',
                    bgcolor: currentTier === 'pro_lifetime' ? '#e8f5e9' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-4px)',
                      transition: 'all 0.3s',
                    },
                  }}
                  onClick={handleBuyLicense}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Stack spacing={2} sx={{ height: '100%' }}>
                      {/* Header - Hauteur fixe */}
                      <Box sx={{ textAlign: 'center', minHeight: 140 }}>
                        <WorkspacePremiumIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1, mb: 0.5 }}>
                          Pro Lifetime
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" sx={{ mb: 0.5, color: 'warning.main' }}>
                          599€ TTC
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: 20 }}>
                          Paiement unique
                        </Typography>
                      </Box>

                      {/* Description - Hauteur fixe */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        textAlign="center"
                        sx={{ minHeight: 40, px: 1 }}
                      >
                        Investissement long terme avec PRO à vie
                      </Typography>

                      {/* Liste - Flex grow */}
                      <List dense sx={{ flexGrow: 1 }}>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="PRO à VIE"
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Emails ILLIMITÉS"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Toutes fonctions PRO"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="3 ans de maintenance"
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                        <ListItem disablePadding>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircleIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary="Aucun abonnement"
                            primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold', sx: { color: 'warning.main' } }}
                          />
                        </ListItem>
                      </List>
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
                    <Stack spacing={1} sx={{ width: '100%' }}>
                      {currentTier === 'pro_lifetime' ? (
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          sx={{ textTransform: 'none' }}
                          disabled
                        >
                          Actif
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant="contained"
                          color="warning"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyLicense();
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Acheter une licence
                        </Button>
                      )}
                    </Stack>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Stack>
      </PageShell>
    </RequireAuth>
  );
}
