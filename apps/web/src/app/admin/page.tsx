"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  TextField,
} from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import Link from "next/link";

// Icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import StorageIcon from "@mui/icons-material/Storage";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import IntegrationInstructionsIcon from "@mui/icons-material/IntegrationInstructions";
import NotificationsIcon from "@mui/icons-material/Notifications";
import EmailIcon from "@mui/icons-material/Email";
import PaymentIcon from "@mui/icons-material/Payment";
import HistoryIcon from "@mui/icons-material/History";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import LinkIcon from "@mui/icons-material/Link";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 1,
    activeTickets: 0,
    pendingInvoices: 0,
    dbSize: "0 MB",
    lastBackup: "Jamais",
  });
  const [stravaConnected, setStravaConnected] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({ 
    open: false, 
    message: "", 
    severity: "success" 
  });
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [systemSettings, setSystemSettings] = useState({
    notificationsEnabled: true,
    emailNotificationsEnabled: true,
    activityLogsEnabled: true,
  });

  const handleStravaConnect = () => {
    // TODO: Implémenter OAuth Strava
    // Rediriger vers: https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=read,activity:read
    alert("Connexion Strava à implémenter avec OAuth 2.0");
  };

  const handleExportData = async () => {
    try {
      setToast({ open: true, message: "Export en cours...", severity: "info" });
      
      const response = await fetch('/api/admin/backup');
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atelier-velo-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setToast({ open: true, message: "Export réussi !", severity: "success" });
    } catch (error) {
      console.error('Export error:', error);
      setToast({ open: true, message: "Erreur lors de l'export", severity: "error" });
    }
  };

  const handleBackupNow = async () => {
    try {
      setToast({ open: true, message: "Sauvegarde en cours...", severity: "info" });
      
      // Même action que l'export pour l'instant
      await handleExportData();
      
      setToast({ open: true, message: "Sauvegarde effectuée !", severity: "success" });
    } catch (error) {
      console.error('Backup error:', error);
      setToast({ open: true, message: "Erreur lors de la sauvegarde", severity: "error" });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setRestoreFile(file);
    } else {
      setToast({ open: true, message: "Veuillez sélectionner un fichier JSON", severity: "error" });
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setToast({ open: true, message: "Aucun fichier sélectionné", severity: "error" });
      return;
    }

    try {
      setRestoring(true);
      setToast({ open: true, message: "Restauration en cours...", severity: "info" });

      // Lire le fichier
      const fileContent = await restoreFile.text();
      const backupData = JSON.parse(fileContent);

      // Envoyer à l'API
      const response = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: backupData.data,
          confirmRestore: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Restauration échouée');
      }

      const result = await response.json();
      setToast({ 
        open: true, 
        message: `Restauration réussie ! ${result.restored.customers} clients, ${result.restored.workOrders} tickets restaurés`, 
        severity: "success" 
      });
      
      // Fermer le dialog et rafraîchir les stats
      setRestoreDialogOpen(false);
      setRestoreFile(null);
      
      // Rafraîchir les stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      setToast({ open: true, message: `Erreur: ${error.message}`, severity: "error" });
    } finally {
      setRestoring(false);
    }
  };

  const handleCreateUser = async () => {
    // Validation
    if (!newUserEmail || !newUserPassword) {
      setToast({ open: true, message: "Email et mot de passe requis", severity: "error" });
      return;
    }

    if (newUserPassword.length < 8) {
      setToast({ open: true, message: "Le mot de passe doit contenir au moins 8 caractères", severity: "error" });
      return;
    }

    try {
      setCreatingUser(true);
      setToast({ open: true, message: "Création en cours...", severity: "info" });

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName || newUserEmail.split('@')[0],
          password: newUserPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Création échouée');
      }

      const user = await response.json();
      setToast({ 
        open: true, 
        message: `Utilisateur ${user.email} créé avec succès !`, 
        severity: "success" 
      });

      // Fermer le dialog et réinitialiser
      setCreateUserDialogOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");

      // Rafraîchir les stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      setToast({ open: true, message: `Erreur: ${error.message}`, severity: "error" });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleSetting = async (setting: string, value: boolean) => {
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...systemSettings,
          [setting]: value,
        }),
      });

      if (response.ok) {
        setSystemSettings(prev => ({ ...prev, [setting]: value }));
        setToast({ open: true, message: "Paramètre mis à jour", severity: "success" });
      } else {
        throw new Error('Mise à jour échouée');
      }
    } catch (error) {
      console.error('Toggle setting error:', error);
      setToast({ open: true, message: "Erreur lors de la mise à jour", severity: "error" });
    }
  };

  useEffect(() => {
    // Charger les vraies stats depuis l'API
    const loadStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback sur des données simulées
          setStats({
            totalUsers: 1,
            activeTickets: 0,
            pendingInvoices: 0,
            dbSize: "45.2 MB",
            lastBackup: new Date().toLocaleDateString("fr-FR"),
          });
        }
      } catch (error) {
        console.error("Erreur chargement stats:", error);
        // Fallback sur des données simulées
        setStats({
          totalUsers: 1,
          activeTickets: 0,
          pendingInvoices: 0,
          dbSize: "N/A",
          lastBackup: "Jamais",
        });
      } finally {
        setLoading(false);
      }
    };

    // Charger les paramètres système
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/admin/system-settings');
        if (response.ok) {
          const data = await response.json();
          setSystemSettings({
            notificationsEnabled: data.notificationsEnabled,
            emailNotificationsEnabled: data.emailNotificationsEnabled,
            activityLogsEnabled: data.activityLogsEnabled,
          });
        }
      } catch (error) {
        console.error("Erreur chargement settings:", error);
      }
    };

    loadStats();
    loadSettings();
  }, []);

  return (
    <RequireAuth>
      <PageShell title="Administration">
        <Stack spacing={3}>
          {/* Vue d'ensemble */}
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
              <DashboardIcon color="primary" />
              <Typography variant="h6">Vue d'ensemble</Typography>
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
              <Paper sx={{ p: 3, height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <StorageIcon color="primary" />
                  <Typography variant="h6">Sauvegarde & Données</Typography>
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
                      href="/settings"
                      fullWidth
                    >
                      Configurer les sauvegardes auto
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            </Grid>

            {/* Intégrations */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <IntegrationInstructionsIcon color="primary" />
                  <Typography variant="h6">Intégrations</Typography>
                </Stack>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <PaymentIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="SumUp"
                      secondary="Paiements par carte"
                    />
                    <Chip label="Actif" color="success" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PaymentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Stripe"
                      secondary="Paiements en ligne"
                    />
                    <Chip label="Configuré" color="info" size="small" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="HubSpot"
                      secondary="Emails & SMS"
                    />
                    <Chip label="À configurer" color="default" size="small" />
                  </ListItem>
                  <Divider sx={{ my: 1 }} />
                  <ListItem>
                    <ListItemIcon>
                      <DirectionsBikeIcon sx={{ color: "#FC4C02" }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Strava"
                      secondary="Activités cyclistes & communauté"
                    />
                    {stravaConnected ? (
                      <Chip label="Connecté" color="success" size="small" />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<LinkIcon />}
                        onClick={handleStravaConnect}
                        sx={{ 
                          borderColor: "#FC4C02", 
                          color: "#FC4C02",
                          "&:hover": { 
                            borderColor: "#FC4C02", 
                            bgcolor: "rgba(252, 76, 2, 0.04)" 
                          }
                        }}
                      >
                        Connecter
                      </Button>
                    )}
                  </ListItem>
                </List>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  startIcon={<SettingsIcon />}
                >
                  Gérer les intégrations
                </Button>
              </Paper>
            </Grid>

            {/* Paramètres Système */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <SettingsIcon color="primary" />
                  <Typography variant="h6">Paramètres Système</Typography>
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
                </List>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{ mt: 2 }}
                  component={Link}
                  href="/settings"
                >
                  Paramètres avancés
                </Button>
              </Paper>
            </Grid>

            {/* Activité Récente */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, height: "100%" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <HistoryIcon color="primary" />
                    <Typography variant="h6">Activité Récente</Typography>
                  </Stack>
                  <Tooltip title="Rafraîchir">
                    <IconButton size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack spacing={1.5}>
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    <Typography variant="body2">
                      <strong>Facture FAC-2025-042</strong> payée
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Il y a 2 heures
                    </Typography>
                  </Alert>
                  <Alert severity="info" icon={<CheckCircleIcon />}>
                    <Typography variant="body2">
                      <strong>Nouveau client</strong> ajouté
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Il y a 5 heures
                    </Typography>
                  </Alert>
                  <Alert severity="warning" icon={<WarningIcon />}>
                    <Typography variant="body2">
                      <strong>Stock faible</strong> : Chaîne KMC
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hier
                    </Typography>
                  </Alert>
                  <Alert severity="error" icon={<ErrorIcon />}>
                    <Typography variant="body2">
                      <strong>Échec paiement</strong> : Ticket #123
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Il y a 2 jours
                    </Typography>
                  </Alert>
                </Stack>
                <Button
                  variant="text"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Voir tous les logs
                </Button>
              </Paper>
            </Grid>
          </Grid>

          {/* Actions Rapides */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Actions Rapides
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  component={Link}
                  href="/settings"
                  startIcon={<SettingsIcon />}
                >
                  Paramètres
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  component={Link}
                  href="/customers"
                  startIcon={<PeopleIcon />}
                >
                  Clients
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  component={Link}
                  href="/catalog"
                  startIcon={<StorageIcon />}
                >
                  Catalogue
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  fullWidth
                  component={Link}
                  href="/stats"
                  startIcon={<TrendingUpIcon />}
                >
                  Statistiques
                </Button>
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
              onClick={() => {
                setCreateUserDialogOpen(false);
                setNewUserEmail("");
                setNewUserName("");
                setNewUserPassword("");
              }}
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
              onClick={() => {
                setRestoreDialogOpen(false);
                setRestoreFile(null);
              }}
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
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
