"use client";

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import Stack from '@mui/material/Stack';

import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import RequireAuth from "../../components/RequireAuth";
import PageShell from "../../components/PageShell";
import Link from "next/link";
import TunnelConfigDialog from "../settings/TunnelConfigDialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Icons
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SettingsIcon from "@mui/icons-material/Settings";

import SecurityIcon from "@mui/icons-material/Security";
import { logger } from '@/lib/logger';

export default function OnlineBookingPage() {
  const [tunnelDialogOpen, setTunnelDialogOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      try {
        const response = await fetch('/api/admin/license/check-booking', {
          method: 'POST',
        });
        const data = await response.json();
        
        if (data.allowed) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          // Rediriger vers la page d'upgrade après un court délai
          setTimeout(() => {
            router.push('/admin/license/upgrade');
          }, 2000);
        }
      } catch (error) {
        logger.error('Erreur vérification licence:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    
    checkAccess();
  }, [router]);

  if (loading) {
    return (
      <RequireAuth>
        <PageShell title="Rendez-vous clients en ligne" headerColor="#2196f3">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <Typography>Vérification de votre licence...</Typography>
          </Box>
        </PageShell>
      </RequireAuth>
    );
  }

  if (!hasAccess) {
    return (
      <RequireAuth>
        <PageShell title="Rendez-vous clients en ligne" headerColor="#2196f3">
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold" gutterBottom>
              Fonctionnalité Pro requise
            </Typography>
            <Typography variant="body2">
              Cette fonctionnalité est disponible uniquement avec les licences <strong>Pro</strong> (359€/an) 
              et <strong>Pro Lifetime</strong> (599€ une fois).
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Redirection vers la page d&apos;upgrade...
            </Typography>
          </Alert>
        </PageShell>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageShell title="Rendez-vous clients en ligne" headerColor="#2196f3">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            component={Link}
            href="/admin"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 2 }}
          >
            Retour à l&apos;administration
          </Button>
          
          <Typography variant="h4" gutterBottom fontWeight="bold">
            🌐 Rendez-vous clients en ligne
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Configurez l&apos;accès public à votre calendrier de rendez-vous via Internet. 
            Vos clients pourront prendre rendez-vous en ligne sans configuration réseau complexe.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Cloudflare Tunnel</strong> crée un lien sécurisé entre votre application locale et Internet, 
            sans nécessiter de port forwarding ou d&apos;IP publique fixe.
          </Alert>
        </Box>

        {/* Configuration rapide */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: "primary.50" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CloudUploadIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Configuration du tunnel Cloudflare
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configurez votre tunnel en 3 étapes simples
                </Typography>
              </Box>
            </Stack>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SettingsIcon />}
              size="large"
              onClick={() => setTunnelDialogOpen(true)}
            >
              Configurer le tunnel
            </Button>
          </Stack>
        </Paper>

        {/* Prérequis */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            📋 Prérequis
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Compte Cloudflare gratuit"
                secondary={
                  <>
                    Créez un compte sur{' '}
                    <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener noreferrer">
                      Cloudflare Dashboard
                    </a>
                    {' '}(gratuit)
                  </>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Un domaine configuré sur Cloudflare"
                secondary="Ou utilisez un sous-domaine trycloudflare.com (temporaire)"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Application fonctionnelle en local"
                secondary="L'application doit fonctionner sur http://localhost:3000"
              />
            </ListItem>
          </List>
        </Paper>

        {/* Configuration en 3 étapes */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
            🚀 Configuration en 3 étapes
          </Typography>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">Étape 1 : Obtenir le Tunnel ID</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <ol style={{ paddingLeft: '20px' }}>
                  <li>Connectez-vous à{' '}
                    <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">
                      Cloudflare Dashboard
                    </a>
                  </li>
                  <li>Allez dans <strong>Zero Trust → Access → Tunnels</strong></li>
                  <li>Cliquez sur <strong>Create a tunnel</strong> (ou utilisez un tunnel existant)</li>
                  <li>Choisissez <strong>Cloudflared</strong> comme connecteur</li>
                  <li>Donnez un nom à votre tunnel (ex: &quot;atelier-velo&quot;)</li>
                  <li>Le <strong>Tunnel ID</strong> apparaît dans l&apos;URL ou dans les détails du tunnel</li>
                  <li><strong>Format :</strong> xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</li>
                </ol>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Notez bien ce Tunnel ID, vous en aurez besoin pour la configuration.
                </Alert>
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">Étape 2 : Configurer le sous-domaine</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <ol style={{ paddingLeft: '20px' }}>
                  <li>Dans Cloudflare Dashboard → <strong>Zero Trust → Access → Tunnels</strong></li>
                  <li>Cliquez sur votre tunnel → Onglet <strong>Public Hostnames</strong></li>
                  <li>Cliquez sur <strong>Add a public hostname</strong></li>
                  <li>Entrez un sous-domaine (ex: <strong>rdv-votre-nom</strong>)</li>
                  <li>Sélectionnez votre domaine dans la liste déroulante</li>
                  <li>Dans <strong>Service</strong>, entrez : <code>http://localhost:3000</code></li>
                  <li>Cliquez sur <strong>Save hostname</strong></li>
                </ol>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>Exemple :</strong> Si votre domaine est &quot;upgradedbikes.com&quot; et votre sous-domaine &quot;rdv-utilisateur&quot;, 
                  l&apos;URL publique sera : <strong>https://rdv-utilisateur.upgradedbikes.com</strong>
                </Alert>
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight="bold">Étape 3 : Télécharger les credentials JSON</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <ol style={{ paddingLeft: '20px' }}>
                  <li>Dans Cloudflare Dashboard → <strong>Zero Trust → Access → Tunnels</strong></li>
                  <li>Cliquez sur votre tunnel</li>
                  <li>Dans l&apos;onglet <strong>Overview</strong>, cherchez la section <strong>Credentials</strong></li>
                  <li>Cliquez sur le bouton <strong>Download</strong> pour télécharger le fichier JSON</li>
                  <li>Ouvrez le fichier avec un éditeur de texte (Notepad, Bloc-notes, etc.)</li>
                  <li><strong>Copiez TOUT le contenu</strong> (de {`{`} à {`}`})</li>
                  <li>Collez-le dans le champ &quot;Credentials JSON&quot; du wizard de configuration</li>
                </ol>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Important :</strong> Ne partagez JAMAIS ce fichier credentials. Il contient des informations sensibles 
                  qui permettent d&apos;accéder à votre tunnel.
                </Alert>
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Paper>

        {/* Utilisation */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            ✅ Utilisation dans l&apos;application
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Configuration wizard en 3 étapes"
                secondary="Tunnel ID, nom de domaine, et credentials JSON"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Démarrage/Arrêt du tunnel"
                secondary="Contrôlez l'accès en ligne à vos RDV depuis n'importe où"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Status en temps réel"
                secondary="Vérifiez que le tunnel est actif et fonctionnel"
              />
            </ListItem>
          </List>
        </Paper>

        {/* Sécurité */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: "warning.50" }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <SecurityIcon color="warning" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold">
              🔐 Sécurité
            </Typography>
          </Stack>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Bonnes pratiques :</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Ne jamais partager le fichier credentials JSON</li>
              <li>Ne jamais partager le Tunnel ID</li>
              <li>Le tunnel expose UNIQUEMENT le port 3000</li>
              <li>Pas d&apos;accès au reste de votre ordinateur</li>
            </ul>
          </Alert>
          <Alert severity="info">
            <strong>HTTPS automatique :</strong> Cloudflare fournit un certificat SSL gratuit. 
            La connexion est chiffrée de bout en bout.
          </Alert>
        </Paper>

        {/* Succès */}
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>🎉 Une fois configuré :</strong> Vos clients pourront prendre rendez-vous en ligne via l&apos;URL publique 
            que vous avez configurée, même si votre ordinateur est derrière un routeur ou un pare-feu.
          </Typography>
        </Alert>

        {/* Dialog de configuration */}
        <TunnelConfigDialog
          open={tunnelDialogOpen}
          onClose={() => setTunnelDialogOpen(false)}
          onConfigured={() => {
            setTunnelDialogOpen(false);
            // Optionnel: Rafraîchir la page ou afficher un message de succès
          }}
        />
      </PageShell>
    </RequireAuth>
  );
}

