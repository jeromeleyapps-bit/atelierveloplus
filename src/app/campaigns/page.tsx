"use client";

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

// Icons
import CampaignIcon from '@mui/icons-material/Campaign';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SchoolIcon from '@mui/icons-material/School';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';
import BuildIcon from '@mui/icons-material/Build';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import EmailIcon from '@mui/icons-material/Email';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

import PageShell from "../components/PageShell";
import RequireAuth from "../components/RequireAuth";
import UpgradeModal from "../components/UpgradeModal";
import { logger } from '@/lib/logger';

interface Campaign {
  id: string;
  name: string;
  type: 'seasonal' | 'reminder' | 'custom';
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  schedule?: string;
  targetAudience: string;
  lastSent?: string;
  nextScheduled?: string;
}

export default function CampaignsPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [licenseInfo, setLicenseInfo] = useState<{ tier: 'basique' | 'pro' | 'pro_lifetime'; features: Record<string, boolean> } | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: 'campaigns' | null }>({ open: false, feature: null });

  // Charger info licence
  useEffect(() => {
    fetch('/api/admin/license/status')
      .then(res => res.json())
      .then(data => setLicenseInfo(data))
      .catch(err => logger.error('License fetch error:', err));
  }, []);

  const isPro = licenseInfo?.tier === 'pro' || licenseInfo?.tier === 'pro_lifetime';

  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 'spring-maintenance',
      name: 'Révision de Printemps',
      type: 'seasonal',
      icon: <LocalFloristIcon />,
      description: "C'est le printemps ! Faites réviser votre vélo pour profiter des beaux jours.",
      enabled: false,
      schedule: 'Mars - Avril',
      targetAudience: 'Tous les clients',
      nextScheduled: '1er Mars 2025'
    },
    {
      id: 'back-to-school',
      name: 'Rentrée Scolaire',
      type: 'seasonal',
      icon: <SchoolIcon />,
      description: 'Préparez la rentrée ! Vérification gratuite des vélos pour les étudiants.',
      enabled: false,
      schedule: 'Août - Septembre',
      targetAudience: 'Clients avec vélos ville/VTC',
      nextScheduled: '20 Août 2025'
    },
    {
      id: 'winter-prep',
      name: 'Préparation Hiver',
      type: 'seasonal',
      icon: <AcUnitIcon />,
      description: 'Protégez votre vélo des intempéries ! Offre spéciale hivernage.',
      enabled: false,
      schedule: 'Octobre - Novembre',
      targetAudience: 'Tous les clients',
      nextScheduled: '15 Octobre 2025'
    },
    {
      id: 'summer-check',
      name: 'Check-up Été',
      type: 'seasonal',
      icon: <WbSunnyIcon />,
      description: 'Vacances à vélo ? Faites vérifier votre monture avant le départ !',
      enabled: false,
      schedule: 'Juin - Juillet',
      targetAudience: 'Clients actifs',
      nextScheduled: '1er Juin 2025'
    },
    {
      id: 'annual-reminder',
      name: 'Rappel Révision Annuelle',
      type: 'reminder',
      icon: <EventRepeatIcon />,
      description: 'Bientôt 1 an depuis votre dernière révision ? Pensez à prendre RDV !',
      enabled: false,
      schedule: 'Automatique (11 mois après dernière visite)',
      targetAudience: 'Clients sans visite depuis 11 mois',
      lastSent: '15 Janvier 2025'
    },
    {
      id: 'inactive-reactivation',
      name: 'Déjà 18 mois sans se voir',
      type: 'reminder',
      icon: <NotificationsActiveIcon />,
      description: 'Ça fait longtemps ! Revenez nous voir avec 10% de réduction.',
      enabled: false,
      schedule: 'Automatique (18 mois sans visite)',
      targetAudience: 'Clients inactifs 18+ mois',
      lastSent: '10 Décembre 2024'
    },
    {
      id: 'maintenance-reminder',
      name: 'Rappel Entretien Préventif',
      type: 'reminder',
      icon: <BuildIcon />,
      description: 'Votre vélo mérite un peu d\'attention ! Entretien préventif recommandé.',
      enabled: false,
      schedule: 'Automatique (6 mois après achat/révision)',
      targetAudience: 'Clients avec vélos 6+ mois',
      lastSent: '5 Janvier 2025'
    },
    {
      id: 'post-repair-feedback',
      name: 'Satisfaction & Avis Client',
      type: 'reminder',
      icon: <TrendingUpIcon />,
      description: 'Comment va votre vélo ? Nous espérons que tout roule parfaitement !',
      enabled: false,
      schedule: 'Automatique (2-3 semaines après réparation)',
      targetAudience: 'Clients avec réparation récente',
      lastSent: '18 Janvier 2025'
    }
  ]);

  const handleToggleCampaign = (campaignId: string) => {
    // Vérifier licence Pro
    if (!isPro) {
      setUpgradeModal({ open: true, feature: 'campaigns' });
      return;
    }

    setCampaigns(campaigns.map(c => 
      c.id === campaignId ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const handlePreview = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setPreviewOpen(true);
  };

  const seasonalCampaigns = campaigns.filter(c => c.type === 'seasonal');
  const reminderCampaigns = campaigns.filter(c => c.type === 'reminder');

  return (
    <RequireAuth>
      <PageShell title="Campagnes & Automatisations" headerColor="#ff6f00">
        <Stack spacing={3}>
          {/* En-tête avec statistiques */}
          <Paper sx={{ p: 3, bgcolor: '#fff3e0', borderLeft: 4, borderColor: '#ff6f00' }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <CampaignIcon sx={{ fontSize: 40, color: '#ff6f00' }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Communication Automatisée
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gérez vos campagnes saisonnières et rappels automatiques
                </Typography>
              </Box>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <EmailIcon color="primary" />
                  <Box>
                    <Typography variant="h6">
                      {campaigns.filter(c => c.enabled).length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Campagnes actives
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PeopleIcon color="primary" />
                  <Box>
                    <Typography variant="h6">--</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Clients ciblés
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon color="primary" />
                  <Box>
                    <Typography variant="h6">--</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Taux d{"'"}ouverture
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Fonctionnalité Pro :</strong> Les campagnes automatisées nécessitent une licence Pro. 
              Les emails seront envoyés automatiquement selon les planifications définies.
            </Typography>
          </Alert>

          {/* Campagnes Saisonnières */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <WbSunnyIcon color="warning" sx={{ fontSize: 32 }} />
              <Typography variant="h6" fontWeight="bold">
                Campagnes Saisonnières
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {seasonalCampaigns.map((campaign) => (
                <Grid item xs={12} md={6} key={campaign.id}>
                  <Card>
                    <CardHeader
                      avatar={campaign.icon}
                      title={campaign.name}
                      subheader={campaign.schedule}
                      action={
                        <FormControlLabel
                          control={
                            <Switch
                              checked={campaign.enabled}
                              onChange={() => handleToggleCampaign(campaign.id)}
                              color="success"
                              disabled={!isPro}
                            />
                          }
                          label=""
                        />
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {campaign.description}
                      </Typography>
                      
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PeopleIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            Cible : {campaign.targetAudience}
                          </Typography>
                        </Stack>
                        {campaign.nextScheduled && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              Prochain envoi : {campaign.nextScheduled}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      {campaign.enabled && (
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small" 
                          sx={{ mt: 2 }} 
                        />
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handlePreview(campaign)}>
                        Aperçu Email
                      </Button>
                      <Button 
                        size="small" 
                        color="primary"
                        disabled={!isPro}
                        onClick={() => !isPro && setUpgradeModal({ open: true, feature: 'campaigns' })}
                      >
                        Personnaliser
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          {/* Rappels Automatiques */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <NotificationsActiveIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography variant="h6" fontWeight="bold">
                Rappels Automatiques
              </Typography>
            </Stack>

            <Grid container spacing={2}>
              {reminderCampaigns.map((campaign) => (
                <Grid item xs={12} md={6} key={campaign.id}>
                  <Card>
                    <CardHeader
                      avatar={campaign.icon}
                      title={campaign.name}
                      subheader={campaign.schedule}
                      action={
                        <FormControlLabel
                          control={
                            <Switch
                              checked={campaign.enabled}
                              onChange={() => handleToggleCampaign(campaign.id)}
                              color="success"
                            />
                          }
                          label=""
                        />
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {campaign.description}
                      </Typography>
                      
                      <Stack spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PeopleIcon fontSize="small" color="action" />
                          <Typography variant="caption">
                            Cible : {campaign.targetAudience}
                          </Typography>
                        </Stack>
                        {campaign.lastSent && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="caption">
                              Dernier envoi : {campaign.lastSent}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>

                      {campaign.enabled && (
                        <Chip 
                          label="Active" 
                          color="success" 
                          size="small" 
                          sx={{ mt: 2 }} 
                        />
                      )}
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handlePreview(campaign)}>
                        Aperçu Email
                      </Button>
                      <Button size="small" color="primary">
                        Personnaliser
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Bouton Créer Campagne Personnalisée */}
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Besoin d{"'"}une campagne sur mesure ?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Créez votre propre campagne avec vos critères et votre message
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<CampaignIcon />}
              size="large"
              disabled={!isPro}
              onClick={() => !isPro && setUpgradeModal({ open: true, feature: 'campaigns' })}
            >
              Créer une Campagne Personnalisée
            </Button>
          </Paper>
        </Stack>

        {/* Dialog Aperçu Email */}
        <Dialog 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Aperçu de la Campagne : {selectedCampaign?.name}
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Ceci est un aperçu. L{"'"}email final sera personnalisé avec le nom du client.
            </Alert>

            <Paper sx={{ p: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="h6" gutterBottom>
                Objet : {selectedCampaign?.name}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body1" paragraph>
                Bonjour [Prénom Client],
              </Typography>
              
              <Typography variant="body1" paragraph>
                {selectedCampaign?.description}
              </Typography>

              {selectedCampaign?.id === 'post-repair-feedback' ? (
                <>
                  <Typography variant="body1" paragraph>
                    Si vous êtes satisfait de notre service, nous serions ravis que vous partagiez votre expérience :
                  </Typography>

                  <Stack spacing={2} sx={{ my: 3 }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<TrendingUpIcon />}
                      fullWidth
                    >
                      ⭐ Laisser un avis sur Google
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      startIcon={<TrendingUpIcon />}
                      fullWidth
                    >
                      ⭐ Laisser un avis sur Trustpilot
                    </Button>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Votre avis nous aide à nous améliorer et aide d{"'"}autres cyclistes à nous trouver. Merci ! 🙏
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body1" paragraph>
                    Notre équipe vous attend pour un service de qualité. Prenez rendez-vous dès maintenant !
                  </Typography>

                  <Button variant="contained" sx={{ mt: 2 }}>
                    Prendre Rendez-vous
                  </Button>
                </>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                Cordialement,<br />
                L{"'"}équipe Atelier Vélo+
              </Typography>
            </Paper>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Personnalisation disponible :
              </Typography>
              <TextField
                fullWidth
                label="Objet de l'email"
                defaultValue={selectedCampaign?.name}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message personnalisé"
                defaultValue={selectedCampaign?.description}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button variant="contained" color="primary">
              Sauvegarder les Modifications
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal Upgrade */}
        <UpgradeModal
          open={upgradeModal.open}
          onClose={() => setUpgradeModal({ open: false, feature: null })}
          feature="automated"
        />
      </PageShell>
    </RequireAuth>
  );
}
