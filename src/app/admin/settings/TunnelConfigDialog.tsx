'use client';

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface TunnelConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onConfigured: () => void;
}

export default function TunnelConfigDialog({ open, onClose, onConfigured }: TunnelConfigDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [tunnelId, setTunnelId] = useState('');
  const [hostname, setHostname] = useState('');
  const [credentialsJson, setCredentialsJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setTunnelId('');
    setHostname('');
    setCredentialsJson('');
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      // Valider le JSON
      let credentials;
      try {
        credentials = JSON.parse(credentialsJson);
      } catch (_e) {
        throw new Error('Le fichier credentials JSON est invalide');
      }

      // Valider tunnel ID (format UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tunnelId)) {
        throw new Error('Le Tunnel ID doit être un UUID valide');
      }

      // Valider hostname
      const hostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
      if (!hostnameRegex.test(hostname)) {
        throw new Error('Le nom de domaine est invalide');
      }

      // Appeler l'IPC pour configurer
      const win = window as { electron?: { invoke: (channel: string, args: unknown) => Promise<{ ok: boolean; message?: string }> } };
      if (typeof window !== 'undefined' && win.electron) {
        const result = await win.electron.invoke('cloudflared:configure', {
          tunnelId,
          credentials,
          hostname,
        });

        if (!result.ok) {
          throw new Error(result.message || 'Erreur lors de la configuration');
        }

        // Succès
        handleReset();
        onConfigured();
        onClose();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Une erreur est survenue';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      label: 'Tunnel ID',
      description: 'Entrez votre Tunnel ID Cloudflare',
    },
    {
      label: 'Nom de domaine',
      description: 'Entrez le sous-domaine pour accéder à vos RDV',
    },
    {
      label: 'Credentials',
      description: 'Collez le contenu de votre fichier credentials JSON',
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUploadIcon />
          Configurer votre tunnel Cloudflare
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Prérequis :</strong> Vous devez avoir créé un tunnel sur{' '}
            <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">
              Cloudflare Dashboard
            </a>
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {step.description}
                </Typography>

                {index === 0 && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>📍 Où trouver le Tunnel ID ?</strong>
                        <br />
                        1. Dans Cloudflare Dashboard → <strong>Zero Trust → Access → Tunnels</strong>
                        <br />
                        2. Cliquez sur votre tunnel (ou créez-en un nouveau)
                        <br />
                        3. Le <strong>Tunnel ID</strong> apparaît dans l&apos;URL ou dans les détails du tunnel
                        <br />
                        <strong>Format attendu :</strong> xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                      </Typography>
                    </Alert>
                    <TextField
                      fullWidth
                      label="Tunnel ID"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={tunnelId}
                      onChange={(e) => setTunnelId(e.target.value)}
                      helperText="Exemple: a1b2c3d4-e5f6-4789-a012-3456789abcde"
                      autoFocus
                    />
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      href="https://dash.cloudflare.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1 }}
                    >
                      Ouvrir Cloudflare Dashboard
                    </Button>
                  </>
                )}

                {index === 1 && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>🌐 Configuration du sous-domaine</strong>
                        <br />
                        1. Dans Cloudflare Dashboard → <strong>Zero Trust → Access → Tunnels</strong>
                        <br />
                        2. Cliquez sur votre tunnel → Onglet <strong>Public Hostnames</strong>
                        <br />
                        3. Cliquez sur <strong>Add a public hostname</strong>
                        <br />
                        4. Entrez un sous-domaine (ex: <strong>rdv-votre-nom</strong>)
                        <br />
                        5. Sélectionnez votre domaine dans la liste
                        <br />
                        6. Service: <strong>http://localhost:3000</strong>
                        <br />
                        <strong>Exemple :</strong> rdv-utilisateur.upgradedbikes.com
                      </Typography>
                    </Alert>
                    <TextField
                      fullWidth
                      label="Nom de domaine"
                      placeholder="rdv-utilisateur.upgradedbikes.com"
                      value={hostname}
                      onChange={(e) => setHostname(e.target.value)}
                      helperText="Utilisez un sous-domaine unique pour vos RDV"
                    />
                  </>
                )}

                {index === 2 && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>🔐 Téléchargement des credentials</strong>
                        <br />
                        1. Dans Cloudflare Dashboard → <strong>Zero Trust → Access → Tunnels</strong>
                        <br />
                        2. Cliquez sur votre tunnel
                        <br />
                        3. Dans l&apos;onglet <strong>Overview</strong>, cherchez la section <strong>Credentials</strong>
                        <br />
                        4. Cliquez sur <strong>Download</strong> pour télécharger le fichier JSON
                        <br />
                        5. Ouvrez le fichier avec un éditeur de texte (Notepad, etc.)
                        <br />
                        6. <strong>Copiez TOUT le contenu</strong> (de {`{`} à {`}`}) et collez-le ci-dessous
                      </Typography>
                    </Alert>
                    <TextField
                      fullWidth
                      multiline
                      rows={8}
                      label="Credentials JSON"
                      placeholder='{"AccountTag": "...", "TunnelSecret": "...", ...}'
                      value={credentialsJson}
                      onChange={(e) => setCredentialsJson(e.target.value)}
                      helperText="Copiez tout le contenu du fichier .json de vos credentials"
                      sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                    />
                    {credentialsJson && (
                      <Alert severity="success" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <CheckCircleOutlineIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          JSON détecté ({credentialsJson.length} caractères)
                        </Typography>
                      </Alert>
                    )}
                  </>
                )}

                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSubmit : handleNext}
                    disabled={
                      loading ||
                      (index === 0 && !tunnelId) ||
                      (index === 1 && !hostname) ||
                      (index === 2 && !credentialsJson)
                    }
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : index === steps.length - 1 ? (
                      'Configurer'
                    ) : (
                      'Continuer'
                    )}
                  </Button>
                  {index > 0 && (
                    <Button disabled={loading} onClick={handleBack} sx={{ mt: 1, mr: 1 }}>
                      Retour
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Alert severity="success">
            Configuration terminée ! Vous pouvez maintenant démarrer votre tunnel.
          </Alert>
        )}

        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            📖 Comment obtenir ces informations ?
          </Typography>
          <Typography variant="body2" component="div">
            <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
              <li>Connectez-vous à <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare Dashboard</a></li>
              <li>Allez dans <strong>Zero Trust {'>'} Access {'>'} Tunnels</strong></li>
              <li>Cliquez sur <strong>Create a tunnel</strong> (ou utilisez un tunnel existant)</li>
              <li>Notez le <strong>Tunnel ID</strong> (dans l&apos;URL ou les détails)</li>
              <li>Téléchargez le fichier <strong>credentials JSON</strong></li>
              <li>Configurez un sous-domaine pointant vers ce tunnel</li>
            </ol>
          </Typography>
          
          {/* ✅ OPTIMISATION: Lien direct vers guide complet */}
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Besoin d&apos;aide détaillée avec captures d&apos;écran ?
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<HelpOutlineIcon />}
              endIcon={<OpenInNewIcon />}
              component="a"
              href="/admin/guide#tunnel-cloudflare"
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1 }}
            >
              📚 Guide Complet Cloudflare (Configuration Détaillée)
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
      </DialogActions>
    </Dialog>
  );
}
