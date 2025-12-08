'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';

import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EmailIcon from '@mui/icons-material/Email';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BackupIcon from '@mui/icons-material/Backup';
import SecurityIcon from '@mui/icons-material/Security';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import TunnelConfigDialog from './TunnelConfigDialog';
import { logger } from '@/lib/logger';

export default function AdminSettingsPage() {
  // États Tunnel Cloudflare
  const [tunnelConfigOpen, setTunnelConfigOpen] = useState(false);
  const [tunnelConfigured, setTunnelConfigured] = useState(false);
  const [tunnelHostname, setTunnelHostname] = useState('');
  const [tunnelStatus, setTunnelStatus] = useState<{ ok: boolean; running?: boolean; message?: string } | null>(null);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  // États Email
  const [emailSettings, setEmailSettings] = useState({
    provider: 'resend',
    apiKey: '',
    fromEmail: '',
    fromName: '',
  });
  const [emailLoading, setEmailLoading] = useState(false);

  // États Hard Delete
  const [hardDeleteEnabled, setHardDeleteEnabled] = useState(false);
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('');
  const [hardDeleteLoading, setHardDeleteLoading] = useState(false);

  // États Sauvegardes
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupLoading, setBackupLoading] = useState(false);

  // États Sécurité
  const [requireAdmin2FA, setRequireAdmin2FA] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [activityLogsEnabled, setActivityLogsEnabled] = useState(true);
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(true);

  // États généraux
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);

  // Charger les paramètres au montage
  useEffect(() => {
    loadSettings();
    loadTunnelStatus();
  }, []);

  // FONCTION: Charger tous les paramètres
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/system-settings');
      
      if (!response.ok) {
        throw new Error('Erreur chargement paramètres');
      }
      
      const data = await response.json();
      
      // Charger tous les états
      setAutoBackupEnabled(data.autoBackupEnabled || false);
      setBackupFrequency(data.backupFrequency || 'daily');
      
      setEmailSettings({
        provider: data.emailProvider || 'resend',
        apiKey: data.emailApiKey || '',
        fromEmail: data.emailFromAddress || '',
        fromName: data.emailFromName || '',
      });
      
      setHardDeleteEnabled(data.hardDeleteEnabled || false);
      setRequireAdmin2FA(data.requireAdmin2FA || false);
      setMaintenanceMode(data.maintenanceMode || false);
      setActivityLogsEnabled(data.activityLogsEnabled !== false);
      setSecurityAlertsEnabled(data.securityAlertsEnabled !== false);
      setTunnelConfigured(data.tunnelConfigured || false);
      setTunnelHostname(data.tunnelHostname || '');
      
    } catch (e) {
      logger.error('Erreur chargement paramètres:', e);
      const message = e instanceof Error ? e.message : 'Erreur chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // FONCTION: Charger status tunnel
  const loadTunnelStatus = async () => {
    try {
      const win = window as { electron?: { invoke: (channel: string, args?: unknown) => Promise<{ ok: boolean; running?: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const status = await win.electron.invoke('cloudflared:status');
        setTunnelStatus(status);
      }
    } catch (e) {
      logger.error('Erreur status tunnel:', e);
    }
  };

  // FONCTION: Démarrer tunnel
  const handleStartTunnel = async () => {
    setTunnelLoading(true);
    setError('');
    
    try {
      const win = window as { electron?: { invoke: (channel: string, args?: unknown) => Promise<{ ok: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const result = await win.electron.invoke('cloudflared:start');
        
        if (result.ok) {
          setSuccess('Tunnel démarré avec succès');
          await loadTunnelStatus();
        } else {
          setError(result.message || 'Erreur démarrage tunnel');
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur démarrage tunnel';
      setError(message);
    } finally {
      setTunnelLoading(false);
    }
  };

  // FONCTION: Arrêter tunnel
  const handleStopTunnel = async () => {
    setTunnelLoading(true);
    setError('');
    
    try {
      const win = window as { electron?: { invoke: (channel: string, args?: unknown) => Promise<{ ok: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const result = await win.electron.invoke('cloudflared:stop');
        
        if (result.ok) {
          setSuccess('Tunnel arrêté');
          await loadTunnelStatus();
        } else {
          setError(result.message || 'Erreur arrêt tunnel');
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur arrêt tunnel';
      setError(message);
    } finally {
      setTunnelLoading(false);
    }
  };

  // FONCTION: Sauvegarder paramètres email
  const handleSaveEmailSettings = async () => {
    setEmailLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailProvider: emailSettings.provider,
          emailApiKey: emailSettings.apiKey,
          emailFromAddress: emailSettings.fromEmail,
          emailFromName: emailSettings.fromName,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde');
      }

      setSuccess('Paramètres email sauvegardés avec succès');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur sauvegarde';
      setError(message);
    } finally {
      setEmailLoading(false);
    }
  };

  // FONCTION: Toggle hard delete
  const handleToggleHardDelete = async () => {
    if (!hardDeleteEnabled && hardDeleteConfirmation !== 'CONFIRMER') {
      setError('Tapez "CONFIRMER" pour activer la suppression définitive');
      return;
    }

    setHardDeleteLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hardDeleteEnabled: !hardDeleteEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur mise à jour');
      }

      setHardDeleteEnabled(!hardDeleteEnabled);
      setSuccess(`Suppression définitive ${!hardDeleteEnabled ? 'activée' : 'désactivée'}`);
      setHardDeleteConfirmation('');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur';
      setError(message);
    } finally {
      setHardDeleteLoading(false);
    }
  };

  // FONCTION: Sauvegarder paramètres backup
  const handleSaveBackupSettings = async () => {
    setBackupLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoBackupEnabled,
          backupFrequency,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur sauvegarde');
      }

      setSuccess('Paramètres de sauvegarde mis à jour');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur';
      setError(message);
    } finally {
      setBackupLoading(false);
    }
  };

  // FONCTION: Toggle paramètre sécurité
  const handleToggleSecuritySetting = async (setting: string, value: boolean, setter: (val: boolean) => void) => {
    try {
      const response = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [setting]: value,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur mise à jour');
      }

      setter(value);
      setSuccess('Paramètre de sécurité mis à jour');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur';
      setError(message);
      // Rollback
      setter(!value);
    }
  };

  // FONCTION: Exporter les diagnostics (logs)
  const handleExportDiagnostics = async () => {
    setError('');
    setSuccess('');

    try {
      const win = window as { electron?: { invoke: (channel: string) => Promise<{ ok?: boolean; filePath?: string; canceled?: boolean; message?: string }> } };
      if (typeof window === 'undefined' || !win.electron) {
        setError('Fonction disponible uniquement dans la version Electron.');
        return;
      }

      setDiagnosticsLoading(true);
      const result = await win.electron.invoke('diagnostics:export');

      if (result?.ok) {
        const pathInfo = result.filePath ? `\n\nChemin du fichier: ${result.filePath}` : '';
        setSuccess('Fichier de diagnostics créé avec succès.' + pathInfo);
      } else if (!result?.canceled) {
        setError(result?.message || 'Erreur lors de la création du fichier de diagnostics.');
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur export diagnostics.';
      setError(message);
    } finally {
      setDiagnosticsLoading(false);
    }
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
        Paramètres Administrateur
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configuration avancée du système et des intégrations
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Tunnel Cloudflare */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<CloudUploadIcon color="primary" />}
              title="Tunnel Cloudflare"
              subheader="Accès RDV en ligne depuis n'importe où"
              action={
                <IconButton onClick={loadTunnelStatus}>
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
                    Le tunnel n&apos;est pas encore configuré. Configurez votre tunnel Cloudflare pour accéder à vos RDV depuis n&apos;importe où.
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

        {/* Diagnostics et envoi des logs au support */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<BackupIcon color="primary" />}
              title="Diagnostics et assistance"
              subheader="Envoyer automatiquement les journaux au support"
            />
            <CardContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                En cas de bug, envoyez automatiquement un fichier ZIP contenant les journaux techniques au support Atelier Vélo+.
              </Typography>
              <Button
                variant="contained"
                startIcon={diagnosticsLoading ? <CircularProgress size={20} /> : <BackupIcon />}
                onClick={handleExportDiagnostics}
                disabled={diagnosticsLoading}
                fullWidth
              >
                Envoyer les journaux d&apos;erreurs au support
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Paramètres Email */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<EmailIcon color="primary" />}
              title="Configuration Email"
              subheader="Provider et clés API"
            />
            <CardContent>
              <TextField
                fullWidth
                label="Provider"
                select
                value={emailSettings.provider}
                onChange={(e) => setEmailSettings({ ...emailSettings, provider: e.target.value })}
                SelectProps={{ native: true }}
                sx={{ mb: 2 }}
              >
                <option value="resend">Resend</option>
                <option value="smtp">SMTP</option>
              </TextField>

              <TextField
                fullWidth
                label="API Key"
                type="password"
                value={emailSettings.apiKey}
                onChange={(e) => setEmailSettings({ ...emailSettings, apiKey: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Email expéditeur"
                type="email"
                value={emailSettings.fromEmail}
                onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Nom expéditeur"
                value={emailSettings.fromName}
                onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                startIcon={emailLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSaveEmailSettings}
                disabled={emailLoading}
                fullWidth
              >
                Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Sauvegardes Automatiques */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<BackupIcon color="primary" />}
              title="Sauvegardes Automatiques"
              subheader="Configuration des backups"
            />
            <CardContent>
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
                <Box sx={{ mt: 2 }}>
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
            </CardContent>
          </Card>
        </Grid>

        {/* Suppression Définitive (Hard Delete) */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              avatar={<DeleteForeverIcon color="error" />}
              title="Suppression Définitive"
              subheader="Mode dangereux - Suppression sans corbeille"
            />
            <CardContent>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Attention :</strong> Activer ce mode supprime définitivement les données sans possibilité de récupération.
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

        {/* Sécurité */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              avatar={<SecurityIcon color="primary" />}
              title="Paramètres de Sécurité"
              subheader="Options de sécurité avancées"
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={requireAdmin2FA}
                        onChange={(e) => handleToggleSecuritySetting('requireAdmin2FA', e.target.checked, setRequireAdmin2FA)}
                      />
                    }
                    label="Exiger authentification 2FA pour admin"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={activityLogsEnabled}
                        onChange={(e) => handleToggleSecuritySetting('activityLogsEnabled', e.target.checked, setActivityLogsEnabled)}
                      />
                    }
                    label="Logs d'activité détaillés"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={maintenanceMode}
                        onChange={(e) => handleToggleSecuritySetting('maintenanceMode', e.target.checked, setMaintenanceMode)}
                      />
                    }
                    label="Mode maintenance"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securityAlertsEnabled}
                        onChange={(e) => handleToggleSecuritySetting('securityAlertsEnabled', e.target.checked, setSecurityAlertsEnabled)}
                      />
                    }
                    label="Notifications email pour activité suspecte"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de configuration tunnel */}
      <TunnelConfigDialog
        open={tunnelConfigOpen}
        onClose={() => setTunnelConfigOpen(false)}
        onConfigured={async () => {
          setTunnelConfigured(true);
          await loadTunnelStatus();
          
          // Sauvegarder dans DB
          try {
            await fetch('/api/admin/system-settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tunnelConfigured: true,
                tunnelHostname: tunnelHostname, // À récupérer du dialog si possible
              }),
            });
          } catch (e) {
            logger.error('Erreur sauvegarde tunnel config:', e);
          }
          
          setSuccess('Tunnel configuré avec succès !');
        }}
      />
    </Box>
  );
}
