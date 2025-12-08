'use client';

import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Link from '@mui/material/Link';

import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import HelpIcon from '@mui/icons-material/HelpOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SendIcon from '@mui/icons-material/Send';
import { logger } from '@/lib/logger';

interface SmtpConfig {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface SmtpConfigCardProps {
  initialConfig?: Partial<SmtpConfig>;
  onSave: (config: SmtpConfig) => Promise<void>;
}

export default function SmtpConfigCard({ initialConfig, onSave }: SmtpConfigCardProps) {
  const [config, setConfig] = useState<SmtpConfig>({
    host: initialConfig?.host || '',
    port: initialConfig?.port || '587',
    secure: initialConfig?.secure || false,
    user: initialConfig?.user || '',
    pass: initialConfig?.pass || '',
    from: initialConfig?.from || '',
  });

  const [testEmail, setTestEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string; messageId?: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      await onSave(config);
      setSuccess('Configuration SMTP sauvegardée avec succès!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    // Validation
    if (!config.host || !config.port || !config.user || !config.pass || !config.from) {
      setError('Veuillez remplir tous les champs avant de tester');
      return;
    }

    if (!testEmail) {
      setError('Veuillez entrer une adresse email de test');
      return;
    }

    setTesting(true);
    setSuccess('');
    setError('');
    setTestResult(null);

    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          pass: config.pass,
          from: config.from,
          testEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(data);
        setSuccess(`✅ Email de test envoyé avec succès à ${testEmail}! Vérifiez votre boîte de réception.`);
      } else {
        logger.error('[SMTP Test] Erreur serveur:', data);
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        setError(errorMsg);
        alert(`Erreur test email:\n${errorMsg}\n\nCode: ${data.code || 'N/A'}\nVoir console (F12) pour détails`);
      }
    } catch (e) {
      logger.error('[SMTP Test] Exception:', e);
      const message = e instanceof Error ? e.message : 'Erreur réseau';
      setError(`Erreur réseau: ${message}`);
    } finally {
      setTesting(false);
    }
  };

  const loadGmailPreset = () => {
    setConfig({
      ...config,
      host: 'smtp.gmail.com',
      port: '587',
      secure: false,
    });
    setSuccess('Configuration Gmail pré-remplie! Il ne reste qu\'à entrer votre email et App Password.');
  };

  return (
    <Card>
      <CardHeader
        avatar={<EmailIcon color="primary" />}
        title="Configuration Email (SMTP)"
        subheader="Envoi de factures, devis et notifications par email"
      />
      <CardContent>
        {/* Messages */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Guide d'aide */}
        <Collapse in={showHelp}>
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => setShowHelp(false)}>
                Masquer
              </Button>
            }
          >
            <Typography variant="subtitle2" gutterBottom>
              📧 Configuration rapide Gmail
            </Typography>
            <Typography variant="body2" gutterBottom>
              Pour utiliser Gmail, cliquez sur le bouton ci-dessous puis:
            </Typography>
            <ol style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
              <li>Générez un <strong>App Password</strong> sur{' '}
                <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">
                  myaccount.google.com/apppasswords
                </Link>
              </li>
              <li>Entrez votre email Gmail dans &quot;Utilisateur&quot;</li>
              <li>Collez le App Password (16 caractères) dans &quot;Mot de passe&quot;</li>
              <li>Testez la configuration avant de sauvegarder</li>
            </ol>
            <Button
              size="small"
              variant="outlined"
              onClick={loadGmailPreset}
              sx={{ mt: 1 }}
            >
              Pré-remplir pour Gmail
            </Button>
          </Alert>
        </Collapse>

        {!showHelp && (
          <Button
            size="small"
            startIcon={<HelpIcon />}
            onClick={() => setShowHelp(true)}
            sx={{ mb: 2 }}
          >
            Afficher l&apos;aide
          </Button>
        )}

        {/* Formulaire */}
        <Grid container spacing={2}>
          {/* Serveur SMTP */}
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Serveur SMTP"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="smtp.gmail.com"
              helperText="Ex: smtp.gmail.com pour Gmail"
            />
          </Grid>

          {/* Port */}
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              helperText="587 (standard) ou 465"
            />
          </Grid>

          {/* Sécurisé */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.secure}
                  onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">
                    Connexion sécurisée (SSL/TLS)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Laissez désactivé pour port 587 (STARTTLS)
                  </Typography>
                </Box>
              }
            />
          </Grid>

          {/* Utilisateur (email) */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Utilisateur (email)"
              type="email"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              placeholder="votre-email@gmail.com"
              helperText="Votre adresse email complète"
            />
          </Grid>

          {/* Mot de passe */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Mot de passe"
              type={showPassword ? 'text' : 'password'}
              value={config.pass}
              onChange={(e) => setConfig({ ...config, pass: e.target.value })}
              placeholder="xxxx xxxx xxxx xxxx"
              helperText="Pour Gmail: App Password (16 caractères sans espaces)"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Email expéditeur */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email expéditeur"
              type="email"
              value={config.from}
              onChange={(e) => setConfig({ ...config, from: e.target.value })}
              placeholder="votre-email@gmail.com"
              helperText="Email qui apparaîtra comme expéditeur (généralement le même que l'utilisateur)"
            />
          </Grid>

          {/* Section Test */}
          <Grid item xs={12}>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                🧪 Tester la configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Envoyez un email de test pour vérifier que tout fonctionne
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email de test"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="votre-email@example.com"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleTest}
                    disabled={testing}
                    startIcon={testing ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {testing ? 'Envoi...' : 'Tester'}
                  </Button>
                </Grid>
              </Grid>

              {testResult && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    ✅ Email envoyé! Message ID: {testResult.messageId}
                  </Typography>
                </Alert>
              )}
            </Box>
          </Grid>

          {/* Bouton Sauvegarder */}
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
            </Button>
          </Grid>
        </Grid>

        {/* FAQ / Aide détaillée */}
        <Box sx={{ mt: 3 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                💡 Aide: Comment créer un App Password Gmail?
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                <strong>Étapes pour générer un App Password Gmail:</strong>
              </Typography>
              <ol style={{ marginLeft: '20px', fontSize: '14px' }}>
                <li>Connectez-vous à votre compte Google</li>
                <li>Allez sur{' '}
                  <Link href="https://myaccount.google.com/apppasswords" target="_blank">
                    myaccount.google.com/apppasswords
                  </Link>
                </li>
                <li>Si demandé, vérifiez votre identité</li>
                <li>Dans &quot;Sélectionner l&apos;application&quot;, choisissez &quot;Autre&quot;</li>
              <li>Tapez &quot;Atelier Velo+&quot; puis &quot;Générer&quot;</li>
              <li>Copiez le code à 16 caractères (ex: xxxx xxxx xxxx xxxx)</li>
              <li>Collez-le dans le champ &quot;Mot de passe&quot; ci-dessus</li>
              </ol>
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  ⚠️ N&apos;utilisez JAMAIS votre mot de passe Gmail normal! Toujours utiliser un App Password.
                </Typography>
              </Alert>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                🔧 Dépannage: Problèmes courants
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <strong>❌ &quot;Échec de l&apos;authentification&quot;</strong>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>Vérifiez que vous utilisez un App Password (pas votre mot de passe Gmail)</li>
                  <li>Assurez-vous que l&apos;email utilisateur est correct</li>
                  <li>Générez un nouveau App Password si nécessaire</li>
                </ul>

                <strong>❌ &quot;Impossible de se connecter au serveur&quot;</strong>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>Vérifiez le serveur: <code>smtp.gmail.com</code></li>
                  <li>Vérifiez le port: <code>587</code> (recommandé)</li>
                  <li>Désactivez &quot;Connexion sécurisée&quot; pour port 587</li>
                </ul>

                <strong>❌ &quot;Délai d&apos;attente dépassé&quot;</strong>
                <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                  <li>Vérifiez votre connexion internet</li>
                  <li>Vérifiez que votre pare-feu autorise le port 587</li>
                </ul>
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      </CardContent>
    </Card>
  );
}
