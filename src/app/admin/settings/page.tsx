'use client';

// ✅ Hooks personnalisés
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSystemSettingsUI } from '@/hooks/useSystemSettingsUI';
import { useSystemSettingsMutations } from '@/hooks/useSystemSettingsMutations';
import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BackupIcon from '@mui/icons-material/Backup';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import EmailIcon from '@mui/icons-material/Email';
import TunnelConfigDialog from './TunnelConfigDialog';
import SmtpConfigCard from './SmtpConfigCard';
import Link from 'next/link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function AdminSettingsPage() {
  // ✅ Hooks personnalisés
  const settingsData = useSystemSettings();
  const settingsUI = useSystemSettingsUI();
  const settingsMutations = useSystemSettingsMutations({
    onSuccess: settingsUI.showSuccess,
    onError: settingsUI.showError,
  });

  // Ref pour tracker le chargement initial (évite boucle infinie)
  const initialLoadDone = useRef(false);

  // Charger les données dans l'UI UNE SEULE FOIS au montage
  useEffect(() => {
    if (settingsData.settings && !initialLoadDone.current) {
      settingsUI.loadSettingsData(settingsData.settings);
      initialLoadDone.current = true;
    }
  }, [settingsData.settings, settingsUI, settingsUI.loadSettingsData]);

  // Alias locaux
  const loading = settingsData.isLoading;
  const tunnelStatus = settingsData.tunnelStatus;
  const tunnelConfigured = settingsData.settings?.tunnelConfigured || false;
  const tunnelHostname = settingsData.settings?.tunnelHostname || '';
  
  const tunnelConfigOpen = settingsUI.tunnelConfigOpen;
  const setTunnelConfigOpen = settingsUI.setTunnelConfigOpen;
  const tunnelLoading = settingsUI.tunnelLoading;
  const setTunnelLoading = settingsUI.setTunnelLoading;
  
  const emailSettings = settingsUI.emailSettings;
  const _setEmailSettings = settingsUI.setEmailSettings;
  const _emailLoading = settingsUI.emailLoading;
  
  const hardDeleteEnabled = settingsUI.hardDeleteEnabled;
  const hardDeleteConfirmation = settingsUI.hardDeleteConfirmation;
  const setHardDeleteConfirmation = settingsUI.setHardDeleteConfirmation;
  const hardDeleteLoading = settingsUI.hardDeleteLoading;
  
  const autoBackupEnabled = settingsUI.autoBackupEnabled;
  const setAutoBackupEnabled = settingsUI.setAutoBackupEnabled;
  const backupFrequency = settingsUI.backupFrequency;
  const setBackupFrequency = settingsUI.setBackupFrequency;
  const backupLoading = settingsUI.backupLoading;
  
  const requireAdmin2FA = settingsUI.requireAdmin2FA;
  const setRequireAdmin2FA = settingsUI.setRequireAdmin2FA;
  const maintenanceMode = settingsUI.maintenanceMode;
  const setMaintenanceMode = settingsUI.setMaintenanceMode;
  const activityLogsEnabled = settingsUI.activityLogsEnabled;
  const setActivityLogsEnabled = settingsUI.setActivityLogsEnabled;
  const securityAlertsEnabled = settingsUI.securityAlertsEnabled;
  const setSecurityAlertsEnabled = settingsUI.setSecurityAlertsEnabled;
  
  const success = settingsUI.success;
  const error = settingsUI.error;


  // Tunnel: Démarrer
  const handleStartTunnel = async () => {
    setTunnelLoading(true);
    settingsUI.clearMessages();
    
    try {
      const win = window as { electron?: { invoke: (channel: string, args?: unknown) => Promise<{ ok: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const result = await win.electron.invoke('cloudflared:start');
        
        if (result.ok) {
          settingsUI.showSuccess('Tunnel démarré avec succès');
          settingsData.refetchTunnel();
        } else {
          settingsUI.showError(result.message || 'Erreur démarrage tunnel');
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur démarrage tunnel';
      settingsUI.showError(message);
    } finally {
      setTunnelLoading(false);
    }
  };

  // Tunnel: Arrêter
  const handleStopTunnel = async () => {
    setTunnelLoading(true);
    settingsUI.clearMessages();
    
    try {
      const win = window as { electron?: { invoke: (channel: string, args?: unknown) => Promise<{ ok: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const result = await win.electron.invoke('cloudflared:stop');
        
        if (result.ok) {
          settingsUI.showSuccess('Tunnel arrêté');
          settingsData.refetchTunnel();
        } else {
          settingsUI.showError(result.message || 'Erreur arrêt tunnel');
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur arrêt tunnel';
      settingsUI.showError(message);
    } finally {
      setTunnelLoading(false);
    }
  };

  // Email: Sauvegarder
  // Note: Fonction disponible mais non utilisée - les paramètres email sont sauvegardés
  // automatiquement via le formulaire principal ou peuvent être ajoutés à l'UI si nécessaire
  const _handleSaveEmailSettings = () => {
    settingsMutations.update({
      emailProvider: emailSettings.provider,
      emailApiKey: emailSettings.apiKey,
      emailFromAddress: emailSettings.fromEmail,
      emailFromName: emailSettings.fromName,
    });
  };

  // Hard Delete: Toggle
  const handleToggleHardDelete = () => {
    if (!hardDeleteEnabled && hardDeleteConfirmation !== 'CONFIRMER') {
      settingsUI.showError('Tapez "CONFIRMER" pour activer la suppression définitive');
      return;
    }
    settingsMutations.update({ hardDeleteEnabled: !hardDeleteEnabled });
    setHardDeleteConfirmation('');
  };

  // Backup: Sauvegarder
  const handleSaveBackupSettings = () => {
    settingsMutations.update({
      autoBackupEnabled,
      backupFrequency,
    });
  };

  // Sécurité: Toggle setting
  const handleToggleSecuritySetting = (setting: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    settingsMutations.update({ [setting]: value });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {"Paramètres Administrateur"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {"Configuration avancée du système et des intégrations"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => settingsUI.setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => settingsUI.setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Section 1: Intégrations & Communication */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
            {"Intégrations & Communication"}
          </Typography>
        </Grid>

        {/* Tunnel Cloudflare */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<CloudUploadIcon color="primary" />}
              title="Tunnel Cloudflare"
              subheader={"Accès RDV en ligne depuis n'importe où"}
              action={
                <IconButton onClick={() => settingsData.refetchTunnel()}>
                  <RefreshIcon />
                </IconButton>
              }
            />
            <CardContent>
              {tunnelConfigured ? (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {tunnelStatus?.running ? (
                      <Chip icon={<CheckCircleIcon />} label="Actif" color="success" size="small" />
                    ) : (
                      <Chip icon={<ErrorIcon />} label="Arrêté" color="default" size="small" />
                    )}
                    {tunnelHostname && (
                      <Typography variant="caption" sx={{ ml: 2 }}>
                        {tunnelHostname}
                      </Typography>
                    )}
                  </Box>

                  {tunnelStatus?.running ? (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleStopTunnel}
                      disabled={tunnelLoading}
                      fullWidth
                    >
                      {tunnelLoading ? <CircularProgress size={24} /> : 'Arrêter le tunnel'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleStartTunnel}
                      disabled={tunnelLoading}
                      fullWidth
                    >
                      {tunnelLoading ? <CircularProgress size={24} /> : 'Démarrer le tunnel'}
                    </Button>
                  )}

                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setTunnelConfigOpen(true)}
                    sx={{ mt: 1 }}
                    fullWidth
                  >
                    Reconfigurer
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {"Le tunnel n'est pas encore configuré. Configurez votre tunnel Cloudflare pour accéder à vos RDV depuis n'importe où."}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setTunnelConfigOpen(true)}
                    fullWidth
                  >
                    Configurer le tunnel
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Communication Automatisée */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<EmailIcon color="primary" />}
              title="Communication Automatisée"
              subheader="Campagnes marketing et rappels clients"
            />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Gérez vos campagnes saisonnières et rappels automatiques : révision printemps, rappels annuels, réactivation clients, etc.
              </Typography>
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  component={Link}
                  href="/campaigns"
                  fullWidth
                >
                  Campagnes & Automatisations
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  component={Link}
                  href="/communications"
                  fullWidth
                >
                  Historique Communications
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration RDV Clients */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<CalendarTodayIcon color="primary" />}
              title="Configuration RDV Clients"
              subheader="Jours d'ouverture et horaires"
            />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Configurez les jours d'ouverture, les horaires et l'option PRO "un jour sur rendez-vous uniquement".
              </Typography>
              <Button
                variant="contained"
                startIcon={<CalendarTodayIcon />}
                component={Link}
                href="/admin/appointment-config"
                fullWidth
              >
                Configurer les RDV
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration SMTP Pédagogique */}
        <Grid item xs={12}>
          <SmtpConfigCard
            initialConfig={{
              host: settingsData.settings?.smtpHost || '',
              port: settingsData.settings?.smtpPort?.toString() || '587',
              secure: settingsData.settings?.smtpSecure || false,
              user: settingsData.settings?.smtpUser || '',
              pass: settingsData.settings?.smtpPass || '',
              from: settingsData.settings?.emailFromAddress || '',
            }}
            onSave={async (config) => {
              settingsMutations.update({
                smtpHost: config.host,
                smtpPort: parseInt(config.port),
                smtpSecure: config.secure,
                smtpUser: config.user,
                smtpPass: config.pass,
                emailFromAddress: config.from,
              });
            }}
          />
        </Grid>

        {/* Section 2: Sécurité & Maintenance */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2, mt: 2, fontWeight: 'bold', color: 'primary.main' }}>
            {"Sécurité & Maintenance"}
          </Typography>
        </Grid>

        {/* Maintenance & Sauvegardes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<BackupIcon color="primary" />}
              title="Maintenance & Sauvegardes"
              subheader="Gestion des backups et maintenance"
            />
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Sauvegardes Automatiques
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoBackupEnabled}
                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                  />
                }
                label="Activer les sauvegardes automatiques"
              />

              {autoBackupEnabled && (
                <Box sx={{ mt: 2, mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Fréquence"
                    select
                    value={backupFrequency}
                    onChange={(e) => setBackupFrequency(e.target.value)}
                    SelectProps={{ native: true }}
                    sx={{ mb: 2 }}
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                  </TextField>

                  <Button
                    variant="contained"
                    startIcon={backupLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                    onClick={handleSaveBackupSettings}
                    disabled={backupLoading}
                    fullWidth
                  >
                    Sauvegarder
                  </Button>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Suppression Définitive
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Attention :</strong> Supprime définitivement sans récupération possible.
                </Typography>
              </Alert>

              <FormControlLabel
                control={
                  <Switch
                    checked={hardDeleteEnabled}
                    color="error"
                  />
                }
                label={`Suppression définitive ${hardDeleteEnabled ? 'activée' : 'désactivée'}`}
                disabled
              />

              {!hardDeleteEnabled && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label='Tapez "CONFIRMER" pour activer'
                    value={hardDeleteConfirmation}
                    onChange={(e) => setHardDeleteConfirmation(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={hardDeleteLoading ? <CircularProgress size={20} /> : null}
                    onClick={handleToggleHardDelete}
                    disabled={hardDeleteConfirmation !== 'CONFIRMER' || hardDeleteLoading}
                    fullWidth
                  >
                    Activer la suppression définitive
                  </Button>
                </Box>
              )}

              {hardDeleteEnabled && (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={hardDeleteLoading ? <CircularProgress size={20} /> : null}
                  onClick={handleToggleHardDelete}
                  disabled={hardDeleteLoading}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  Désactiver
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres de Sécurité */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              avatar={<SecurityIcon color="primary" />}
              title="Paramètres de Sécurité"
              subheader="Options de sécurité avancées"
            />
            <CardContent>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={requireAdmin2FA}
                      onChange={(e) => handleToggleSecuritySetting('requireAdmin2FA', e.target.checked, setRequireAdmin2FA)}
                    />
                  }
                  label="Exiger authentification 2FA pour admin"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={activityLogsEnabled}
                      onChange={(e) => handleToggleSecuritySetting('activityLogsEnabled', e.target.checked, setActivityLogsEnabled)}
                    />
                  }
                  label={"Logs d'activité détaillés"}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={maintenanceMode}
                      onChange={(e) => handleToggleSecuritySetting('maintenanceMode', e.target.checked, setMaintenanceMode)}
                    />
                  }
                  label="Mode maintenance"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={securityAlertsEnabled}
                      onChange={(e) => handleToggleSecuritySetting('securityAlertsEnabled', e.target.checked, setSecurityAlertsEnabled)}
                    />
                  }
                  label="Notifications email pour activité suspecte"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de configuration tunnel */}
      <TunnelConfigDialog
        open={tunnelConfigOpen}
        onClose={() => setTunnelConfigOpen(false)}
        onConfigured={() => {
          settingsMutations.update({
            tunnelConfigured: true,
            tunnelHostname: tunnelHostname,
          });
          settingsData.refetchTunnel();
          settingsUI.showSuccess('Tunnel configuré avec succès !');
        }}
      />
    </Box>
  );
}
