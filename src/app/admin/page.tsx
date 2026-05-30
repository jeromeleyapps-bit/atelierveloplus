"use client";

// ✅ Hooks personnalisés
import { useAdminDashboardData } from '@/hooks/useAdminDashboardData';
import { useAdminDashboardUI } from '@/hooks/useAdminDashboardUI';
import { useAdminDashboardMutations } from '@/hooks/useAdminDashboardMutations';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import Link from "next/link";
import OnboardingWizard from "../components/OnboardingWizard";
import UpgradeModal from "../components/UpgradeModal";
import { useState, useEffect } from "react";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import StorageIcon from "@mui/icons-material/Storage";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmailIcon from "@mui/icons-material/Email";
import PaymentIcon from "@mui/icons-material/Payment";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";

import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LinkIcon from "@mui/icons-material/Link";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ShieldIcon from "@mui/icons-material/Shield";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { logger } from '@/lib/logger';

export default function AdminPage() {
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsMessage, setDiagnosticsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // État wizard
  const [showWizard, setShowWizard] = useState(false);
  
  // ⭐ Phase 2: État licence et modal upgrade
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature: 'notifications' | 'emails' | 'logs' | 'automated' | null }>({ open: false, feature: null });
  const [licenseInfo, setLicenseInfo] = useState<{ tier: 'basique' | 'pro'; features: Record<string, boolean> } | null>(null);

  // ⭐ Phase 2: Charger info licence
  useEffect(() => {
    fetch('/api/admin/license/status')
      .then(res => res.json())
      .then(data => setLicenseInfo(data))
      .catch(err => logger.error('License fetch error:', err));
  }, []);
  
  // ✅ Hooks personnalisés
  const dashboardData = useAdminDashboardData();
  const dashboardUI = useAdminDashboardUI();
  const dashboardMutations = useAdminDashboardMutations({
    onSuccess: dashboardUI.showToast,
    onError: (msg) => dashboardUI.showToast(msg, 'error'),
  });

  // Alias locaux
  const _loading = dashboardData.isLoading;
  const stats = dashboardData.stats;
  const recentEmails = dashboardData.recentEmails;
  const loadingEmails = dashboardData.isLoadingEmails;
  const systemSettings = dashboardData.systemSettings;
  
  const toast = dashboardUI.toast;
  const createUserDialogOpen = dashboardUI.createUserDialogOpen;
  const setCreateUserDialogOpen = dashboardUI.setCreateUserDialogOpen;
  const newUserEmail = dashboardUI.newUserEmail;
  const setNewUserEmail = dashboardUI.setNewUserEmail;
  const newUserName = dashboardUI.newUserName;
  const setNewUserName = dashboardUI.setNewUserName;
  const newUserPassword = dashboardUI.newUserPassword;
  const setNewUserPassword = dashboardUI.setNewUserPassword;
  const restoreDialogOpen = dashboardUI.restoreDialogOpen;
  const setRestoreDialogOpen = dashboardUI.setRestoreDialogOpen;
  const restoreFile = dashboardUI.restoreFile;
  
  const creatingUser = dashboardMutations.isCreatingUser;
  const restoring = dashboardMutations.isImporting;

  const _handleStravaConnect = () => {
    // TODO: Implémenter OAuth Strava
    // Rediriger vers: https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=read,activity:read
    alert("Connexion Strava à implémenter avec OAuth 2.0");
  };

  const handleExportData = () => {
    dashboardUI.showToast('Export en cours...', 'info');
    dashboardMutations.exportBackup();
  };

  const handleBackupNow = () => {
    dashboardUI.showToast('Sauvegarde en cours...', 'info');
    dashboardMutations.exportBackup();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      dashboardUI.setRestoreFile(file);
    } else {
      dashboardUI.showToast('Veuillez sélectionner un fichier JSON', 'error');
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      dashboardUI.showToast('Aucun fichier sélectionné', 'error');
      return;
    }

    try {
      dashboardUI.showToast('Restauration en cours...', 'info');
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);
      dashboardMutations.importBackup(backupData.data, true);
      dashboardUI.closeRestoreDialog();
    } catch (error) {
      logger.error('Restore error:', error);
      const message = error instanceof Error ? error.message : 'Erreur de restauration';
      dashboardUI.showToast(`Erreur: ${message}`, 'error');
    }
  };

  const handleCreateUser = () => {
    // Validation
    if (!newUserEmail || !newUserPassword) {
      dashboardUI.showToast('Email et mot de passe requis', 'error');
      return;
    }

    if (newUserPassword.length < 8) {
      dashboardUI.showToast('Le mot de passe doit contenir au moins 8 caractères', 'error');
      return;
    }

    dashboardUI.showToast('Création en cours...', 'info');
    dashboardMutations.createUser({
      email: newUserEmail,
      password: newUserPassword,
      role: 'admin'
    });
    dashboardUI.closeCreateUserDialog();
  };

  const handleToggleSetting = (setting: string, value: boolean) => {
    // ⭐ Phase 2: Vérifier licence avant modification
    if (licenseInfo?.tier === 'basique' && value === true) {
      // En version Basique, bloquer l'activation avec modal upgrade
      const featureMap: Record<string, 'notifications' | 'emails' | 'logs' | 'automated'> = {
        notificationsEnabled: 'notifications',
        emailNotificationsEnabled: 'emails',
        activityLogsEnabled: 'logs',
        automatedEmailsEnabled: 'automated',
      };
      
      const feature = featureMap[setting];
      if (feature) {
        setUpgradeModal({ open: true, feature });
        return; // Bloquer l'activation
      }
    }
    
    // Version Pro OU désactivation (toujours autorisé) → continuer
    dashboardMutations.toggleSetting(setting, value);
  };

  return (
    <RequireAuth>
      <PageShell title="Administration" headerColor="#9c27b0">
        <Stack spacing={3}>
          {/* Bouton Mode d'Emploi */}
          <Paper sx={{ p: 2, bgcolor: "#e3f2fd", borderLeft: 4, borderColor: "#2196f3" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <MenuBookIcon color="info" sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Besoin d&apos;aide ?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Consultez le mode d&apos;emploi complet de l&apos;application
                  </Typography>
                </Box>
              </Stack>
              <Button
                component={Link}
                href="/admin/guide"
                variant="contained"
                color="info"
                startIcon={<MenuBookIcon />}
                size="large"
              >
                Mode d&apos;Emploi
              </Button>
            </Stack>
          </Paper>

          {/* Configuration - Style professionnel */}
          <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
            {/* Paramètres */}
            <Paper 
              elevation={1}
              sx={{ 
                flex: 1,
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderRadius: 2,
                '&:hover': {
                  boxShadow: 3,
                }
              }}
              component={Link}
              href="/admin/settings"
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <SettingsIcon sx={{ fontSize: 32, color: '#9C27B0' }} />
                <Box>
                  <Typography variant="h6" fontWeight="600">
                    Paramètres
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {"Configuration avancée du système"}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {"Gérez les intégrations, le tunnel Cloudflare, les sauvegardes automatiques et les paramètres de sécurité."}
              </Typography>
            </Paper>

            {/* Historique Communications */}
            <Paper 
              elevation={1}
              sx={{ 
                flex: 1,
                p: 3,
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderRadius: 2,
                '&:hover': {
                  boxShadow: 3,
                }
              }}
              component={Link}
              href="/communications"
            >
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <EmailIcon sx={{ fontSize: 32, color: '#FF9800' }} />
                <Box>
                  <Typography variant="h6" fontWeight="600">
                    {"Historique Communications"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {"Campagnes et emails clients"}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                {"Consultez l'historique complet des communications clients, campagnes marketing et rappels automatiques envoyés."}
              </Typography>
            </Paper>
          </Stack>

          {/* Vue d'ensemble */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              border: 3,
              borderColor: '#607D8B',
              bgcolor: '#ECEFF1'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <DashboardIcon color="primary" />
              <Typography variant="h6">Vue d&apos;ensemble</Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: "primary.light",
                      transform: "translateY(-2px)",
                      boxShadow: 2,
                    }
                  }}
                  onClick={() => setCreateUserDialogOpen(true)}
                >
                  <PeopleIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{stats.totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Utilisateur{stats.totalUsers > 1 ? "s" : ""}
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ mt: 1, display: "block" }}>
                    Cliquer pour ajouter
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{stats.activeTickets}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tickets actifs
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <PaymentIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{stats.pendingInvoices}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Factures en attente
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
                  <StorageIcon color="info" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4">{stats.dbSize}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taille base de données
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {/* Sauvegarde & Données */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={1}
                sx={{ 
                  p: 3, 
                  height: "100%",
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <StorageIcon sx={{ fontSize: 32, color: '#2196F3' }} />
                  <Typography variant="h6" fontWeight="600">Sauvegarde & Données</Typography>
                </Stack>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Dernière sauvegarde : {stats.lastBackup}
                    </Typography>
                    <LinearProgress variant="determinate" value={85} sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Espace utilisé : 85%
                    </Typography>
                  </Box>
                  <Divider />
                  <Stack spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<CloudDownloadIcon />}
                      fullWidth
                      onClick={handleExportData}
                    >
                      Exporter toutes les données
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      fullWidth
                      onClick={handleBackupNow}
                    >
                      Sauvegarder maintenant
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      onClick={() => setRestoreDialogOpen(true)}
                      color="warning"
                    >
                      Restaurer depuis un backup
                    </Button>
                    <Button
                      variant="text"
                      component={Link}
                      href="/admin/settings"
                      fullWidth
                    >
                      Configurer les sauvegardes auto
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      onClick={() => setShowWizard(true)}
                    >
                      Configurer l&apos;atelier
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Paramètres Système */}
            <Grid item xs={12} md={6}>
              <Paper 
                elevation={1}
                sx={{ 
                  p: 3, 
                  height: "100%",
                  borderRadius: 2,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <SettingsIcon sx={{ fontSize: 32, color: '#9C27B0' }} />
                  <Typography variant="h6" fontWeight="600">Paramètres Système</Typography>
                </Stack>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Notifications push"
                      secondary="Alertes en temps réel"
                    />
                    <Switch 
                      checked={systemSettings.notificationsEnabled}
                      onChange={(e) => handleToggleSetting('notificationsEnabled', e.target.checked)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Emails automatiques"
                      secondary="Confirmations et rappels"
                    />
                    <Switch 
                      checked={systemSettings.emailNotificationsEnabled}
                      onChange={(e) => handleToggleSetting('emailNotificationsEnabled', e.target.checked)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <HistoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Logs d'activité"
                      secondary="Traçabilité des actions"
                    />
                    <Switch 
                      checked={systemSettings.activityLogsEnabled}
                      onChange={(e) => handleToggleSetting('activityLogsEnabled', e.target.checked)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <SendIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Communications automatiques"
                      secondary="Satisfaction et maintenance"
                    />
                    <Switch 
                      checked={systemSettings.automatedEmailsEnabled}
                      onChange={(e) => handleToggleSetting('automatedEmailsEnabled', e.target.checked)}
                    />
                  </ListItem>
                </List>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  component={Link}
                  href="/admin/settings"
                >
                  Paramètres avancés
                </Button>
              </Paper>
            </Grid>

            {/* Activité Récente - Masqué jusqu'à implémentation réelle */}
            {/* TODO: Implémenter avec vraies données depuis ActivityLog */}
          </Grid>

          {/* Sécurité & Protection */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3,
              border: 3,
              borderColor: '#4CAF50',
              bgcolor: '#E8F5E9'
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <SecurityIcon color="success" />
              <Typography variant="h6">Sécurité & Protection</Typography>
              <Chip label="Niveau: Élevé" color="success" size="small" />
            </Stack>

            <Grid container spacing={2}>
              {/* Authentification */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Authentification JWT</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tokens sécurisés avec expiration automatique
                  </Typography>
                </Alert>
              </Grid>

              {/* Chiffrement */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<LockIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Mots de passe chiffrés</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    bcrypt avec salt rounds = 10
                  </Typography>
                </Alert>
              </Grid>

              {/* Protection CSRF */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<ShieldIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Protection CSRF</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Headers sécurisés et validation des requêtes
                  </Typography>
                </Alert>
              </Grid>

              {/* Validation des données */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Validation des données</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sanitization et validation côté serveur
                  </Typography>
                </Alert>
              </Grid>

              {/* Application locale */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Application locale (Electron)</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pas d&apos;exposition sur Internet, sécurité maximale
                  </Typography>
                </Alert>
              </Grid>

              {/* Base de données locale */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<StorageIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Base de données locale (SQLite)</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Données 100% locales, aucun accès réseau
                  </Typography>
                </Alert>
              </Grid>

              {/* Sauvegardes */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<CloudDownloadIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Sauvegardes disponibles</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Export/Import manuel - Dernière: {stats.lastBackup}
                  </Typography>
                </Alert>
              </Grid>

              {/* Confidentialité */}
              <Grid item xs={12} md={6}>
                <Alert severity="success" icon={<LockIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>✓ Confidentialité totale</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aucune donnée envoyée vers le cloud
                  </Typography>
                </Alert>
              </Grid>

              {/* Recommandations */}
              <Grid item xs={12}>
                <Alert severity="info" icon={<VpnKeyIcon />}>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>📋 Bonnes pratiques</strong>
                  </Typography>
                  <List dense sx={{ mt: 1 }}>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemText 
                        primary="• Effectuez des sauvegardes régulières de votre base de données"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemText 
                        primary="• Mettez à jour régulièrement l'application et ses dépendances"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemText 
                        primary="• Utilisez des mots de passe forts et uniques pour chaque utilisateur"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                    <ListItem sx={{ py: 0 }}>
                      <ListItemText 
                        primary="• Limitez l'accès physique à la machine hébergeant l'application"
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  </List>
                </Alert>
              </Grid>
            </Grid>
          </Paper>

        </Stack>

        {/* Dialog Création Utilisateur */}
        <Dialog
          open={createUserDialogOpen}
          onClose={() => !creatingUser && setCreateUserDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Créer un Nouvel Utilisateur</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                disabled={creatingUser}
                required
                autoFocus
              />
              <TextField
                label="Nom"
                fullWidth
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                disabled={creatingUser}
                helperText="Optionnel - Si vide, utilisera le début de l'email"
              />
              <TextField
                label="Mot de passe"
                type="password"
                fullWidth
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                disabled={creatingUser}
                required
                helperText="Minimum 8 caractères"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => dashboardUI.closeCreateUserDialog()}
              disabled={creatingUser}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateUser}
              variant="contained"
              disabled={creatingUser || !newUserEmail || !newUserPassword}
              startIcon={creatingUser ? <CircularProgress size={20} /> : <PeopleIcon />}
            >
              {creatingUser ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Restauration */}
        <Dialog
          open={restoreDialogOpen}
          onClose={() => !restoring && setRestoreDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Restaurer depuis un backup</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              ⚠️ <strong>Attention :</strong> Cette action va restaurer les données depuis un fichier de backup.
              Les données existantes seront fusionnées avec celles du backup.
            </DialogContentText>
            
            <Stack spacing={2}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
                disabled={restoring}
              >
                {restoreFile ? restoreFile.name : "Sélectionner un fichier JSON"}
                <input
                  type="file"
                  hidden
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                />
              </Button>

              {restoreFile && (
                <Alert severity="info">
                  Fichier sélectionné : <strong>{restoreFile.name}</strong>
                  <br />
                  Taille : {(restoreFile.size / 1024).toFixed(2)} KB
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => dashboardUI.closeRestoreDialog()}
              disabled={restoring}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRestore}
              variant="contained"
              color="warning"
              disabled={!restoreFile || restoring}
              startIcon={restoring ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              {restoring ? "Restauration..." : "Restaurer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar pour les notifications */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => dashboardUI.closeToast()}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => dashboardUI.closeToast()}
            severity={toast.severity}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>

        {/* Section Support & Diagnostics */}
        <Paper sx={{ p: 3, mb: 3, border: 2, borderColor: '#f59e0b', bgcolor: '#fef3c7' }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <EmailIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
            <Box>
              <Typography variant="h6" fontWeight="bold" color="#92400e">
                🛟 Support & Assistance
              </Typography>
              <Typography variant="body2" color="#92400e">
                Besoin d&apos;aide ? Envoyez-nous vos logs d&apos;erreur
              </Typography>
            </Box>
          </Stack>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            En cas de bug ou problème technique, envoyez automatiquement vos journaux au support.
            Un fichier ZIP sera créé et envoyé par email à notre équipe.
          </Alert>
          
          {diagnosticsMessage && (
            <Alert severity={diagnosticsMessage.type} sx={{ mb: 2 }} onClose={() => setDiagnosticsMessage(null)}>
              {diagnosticsMessage.text}
            </Alert>
          )}
          
          <Button
            variant="contained"
            color="warning"
            startIcon={diagnosticsLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SendIcon />}
            onClick={async () => {
              setDiagnosticsMessage(null);
              try {
                const win = window as { electron?: { invoke: (channel: string) => Promise<{ ok?: boolean; filePath?: string; canceled?: boolean; message?: string }> } };
                if (typeof window === 'undefined' || !win.electron) {
                  setDiagnosticsMessage({ text: 'Fonction disponible uniquement dans la version Electron.', type: 'error' });
                  return;
                }
                setDiagnosticsLoading(true);
                const result = await win.electron.invoke('diagnostics:export');
                if (result?.ok) {
                  const pathInfo = result.filePath ? ` (${result.filePath})` : '';
                  setDiagnosticsMessage({ text: 'Fichier de diagnostics créé avec succès.' + pathInfo, type: 'success' });
                } else if (!result?.canceled) {
                  setDiagnosticsMessage({ text: result?.message || 'Erreur lors de la création du fichier.', type: 'error' });
                }
              } catch (e) {
                const message = e instanceof Error ? e.message : 'Erreur export diagnostics.';
                setDiagnosticsMessage({ text: message, type: 'error' });
              } finally {
                setDiagnosticsLoading(false);
              }
            }}
            disabled={diagnosticsLoading}
            fullWidth
            sx={{ mb: 1 }}
          >
            {diagnosticsLoading ? 'Envoi en cours...' : "Envoyer les journaux d'erreurs au support"}
          </Button>
          
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            component={Link}
            href="/admin/settings"
            fullWidth
          >
            Voir tous les paramètres
          </Button>
          
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            Email support: atelier-velo-plus@upgradedbikes.com
          </Typography>
        </Paper>

        {/* Footer simplifié - Informations déjà dans PageShell */}
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Atelier Vélo+ v1.0.0 - © 2025 Jérôme Leyssard - Upgraded Bikes
          </Typography>
        </Box>
      </PageShell>

      {/* Wizard Configuration Atelier */}
      <OnboardingWizard
        open={showWizard}
        onComplete={() => {
          setShowWizard(false);
          dashboardUI.showToast('Configuration enregistree avec succes!', 'success');
          // Recharger les donnees
          dashboardData.refetchStats();
        }}
      />

      {/* ⭐ Phase 2: Modal Upgrade pour toggles verrouillés */}
      {upgradeModal.feature && (
        <UpgradeModal
          open={upgradeModal.open}
          onClose={() => setUpgradeModal({ open: false, feature: null })}
          feature={upgradeModal.feature}
        />
      )}
    </RequireAuth>
  );
}
