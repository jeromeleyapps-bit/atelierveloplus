"use client";

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import RequireAuth from "../../components/RequireAuth";
import PageShell from "../../components/PageShell";
import Link from "next/link";

// Icons
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BuildIcon from "@mui/icons-material/Build";
import EventIcon from "@mui/icons-material/Event";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import InventoryIcon from "@mui/icons-material/Inventory";
import SettingsIcon from "@mui/icons-material/Settings";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import EmailIcon from "@mui/icons-material/Email";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import TimerIcon from "@mui/icons-material/Timer";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PublicIcon from "@mui/icons-material/Public";
import SecurityIcon from "@mui/icons-material/Security";

export default function GuidePage() {
  return (
    <RequireAuth>
      <PageShell title="Mode d&apos;Emploi">
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
              📚 Mode d&apos;Emploi - Atelier Vélo+
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Bienvenue dans votre système de gestion d&apos;atelier vélo. Ce guide vous présente
              toutes les fonctionnalités de l&apos;application et des astuces pour une utilisation optimale.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Version 1.0.0</strong> - Mise à jour: Novembre 2025
              <br />✨ Nouvelles fonctionnalités: Widget Actualités Vélo, Auto-entrepreneur TVA 0%, Dashboard harmonisé
            </Alert>
            
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>📊 Comparatif des licences:</strong> 
              <Button 
                component={Link} 
                href="/admin/license/upgrade" 
                variant="outlined" 
                size="small" 
                sx={{ ml: 1, textTransform: 'none' }}
              >
                Voir les fonctionnalités par licence
              </Button>
            </Alert>
          </Box>

          {/* Démarrage Rapide */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: "primary.50" }}>
            <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
              🚀 Démarrage Rapide
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="1. Configurez vos informations d'atelier via le Wizard"
                  secondary="Au premier lancement ou via Admin → Configurer l'atelier"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="2. Définissez votre statut fiscal (Auto-entrepreneur ou Société)"
                  secondary="Important: Si Auto-entrepreneur, TVA automatiquement à 0% sur toutes factures"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="3. Configurez vos tarifs de base"
                  secondary="Tarif horaire, multiplicateur, TVA (fixé à 0% si AE)"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="4. Ajoutez vos premiers articles au catalogue"
                  secondary="Catalogue → Ajouter un article"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="5. Créez votre premier client"
                  secondary="Clients → Nouveau client"
                />
              </ListItem>
            </List>
          </Paper>

          {/* Section 1: Tableau de Bord */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DashboardIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Tableau de Bord
                </Typography>
                <Chip label="Essentiel" size="small" color="primary" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Le tableau de bord est votre centre de contrôle. Il affiche en temps réel :
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="📊 Statistiques du jour"
                    secondary="Chiffre d'affaires, nombre de réparations, nouveaux clients"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="📅 Rendez-vous à venir"
                    secondary="Les 5 prochains rendez-vous avec statut"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="🔧 Réparations en cours"
                    secondary="Suivi en temps réel de l'état des réparations"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="⚠️ Alertes stock"
                    secondary="Articles en rupture ou stock faible (toujours visible même si stock OK)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="📰 Actualités Vélo"
                    secondary="Flux RSS des magazines vélo français (Top Vélo, Vélo Magazine, etc.)"
                  />
                </ListItem>
              </List>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Actualisez le tableau de bord en cliquant sur le bouton
                de rafraîchissement pour voir les dernières données.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 2: Gestion des Clients */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <PeopleIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Gestion des Clients
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Gérez votre base de clients efficacement :
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Créer un client
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="• Nom, prénom, email, téléphone" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="• Adresse complète (optionnelle)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="• Notes personnalisées" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Fiche client
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="📜 Historique complet des réparations" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🚲 Liste des vélos enregistrés" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="💰 Chiffre d'affaires total" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📧 Envoi d'emails directs" />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Utilisez la recherche rapide (Ctrl+K) pour trouver
                instantanément un client par nom, email ou téléphone.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 3: Réparations */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <BuildIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Réparations & Services
                </Typography>
                <Chip label="Cœur de métier" size="small" color="success" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Gérez vos réparations de A à Z :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Créer une réparation
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Sélectionnez le client"
                    secondary="Créez-le si nécessaire"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="2. Choisissez ou créez le vélo"
                    secondary="Marque, modèle, numéro de série"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="3. Ajoutez les services"
                    secondary="Sélectionnez dans vos tarifs prédéfinis"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="4. Ajoutez les pièces nécessaires"
                    secondary="Depuis votre catalogue avec gestion automatique du stock"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="5. Définissez le statut"
                    secondary="En attente, En cours, Terminée, Livrée"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Statuts de réparation
              </Typography>
              <Stack spacing={1}>
                <Chip label="🕐 En attente" size="small" />
                <Chip label="🔧 En cours" size="small" color="info" />
                <Chip label="✅ Terminée" size="small" color="success" />
                <Chip label="📦 Livrée" size="small" color="default" />
              </Stack>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Important :</strong> Pensez à mettre à jour le statut régulièrement.
                Le client peut recevoir des notifications automatiques selon la configuration.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 4: Calendrier */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <EventIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Calendrier atelier
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Organisez votre planning efficacement :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Créer un rendez-vous
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="📅 Date et heure" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="👤 Client (existant ou nouveau)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🔧 Type de service" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📝 Notes spécifiques" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📧 Confirmation par email automatique" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Vues disponibles
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Vue Mois"
                    secondary="Vision globale de votre planning"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Vue Semaine"
                    secondary="Détail jour par jour"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Vue Jour"
                    secondary="Planning horaire détaillé"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Cliquez directement sur une plage horaire dans le
                calendrier pour créer rapidement un rendez-vous.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 4.5: Rendez-vous clients en ligne (Pro) */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <PublicIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Rendez-vous clients en ligne
                </Typography>
                <Chip label="Pro" size="small" color="warning" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Fonctionnalité Pro :</strong> Cette fonctionnalité est disponible uniquement avec les licences 
                  <strong> Pro</strong> (359€/an) et <strong>Pro Lifetime</strong> (599€ une fois).
                </Typography>
              </Alert>

              <Typography variant="body2" paragraph>
                Configurez l&apos;accès public à votre calendrier de rendez-vous via Internet. 
                Vos clients pourront prendre rendez-vous en ligne sans configuration réseau complexe.
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Cloudflare Tunnel</strong> crée un lien sécurisé entre votre application locale et Internet, 
                  sans nécessiter de port forwarding ou d&apos;IP publique fixe.
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                📋 Prérequis
              </Typography>
              <List dense>
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

              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
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

              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                ✅ Utilisation dans l&apos;application
              </Typography>
              <List dense>
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

              <Alert severity="success" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>🎉 Une fois configuré :</strong> Vos clients pourront prendre rendez-vous en ligne via l&apos;URL publique 
                  que vous avez configurée, même si votre ordinateur est derrière un routeur ou un pare-feu.
                </Typography>
              </Alert>

              <Box sx={{ mt: 3, p: 2, bgcolor: "warning.50", borderRadius: 1 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                  <SecurityIcon color="warning" />
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
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Section 5: Catalogue */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <InventoryIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Catalogue & Stock
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Gérez votre inventaire de pièces et accessoires :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Ajouter un article
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="📦 Nom et description" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🏷️ Catégorie (Pièces, Accessoires, Vélos)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="💰 Prix d'achat et de vente" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📊 Stock initial" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="⚠️ Seuil d'alerte stock" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🔢 Référence fournisseur" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Gestion du stock
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Déduction automatique"
                    secondary="Le stock est mis à jour automatiquement lors d'une réparation"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Alertes intelligentes"
                    secondary="Notification quand le stock atteint le seuil défini"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Historique des mouvements"
                    secondary="Traçabilité complète des entrées/sorties"
                  />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Définissez des seuils d&apos;alerte adaptés à votre rotation
                de stock pour éviter les ruptures.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 6: Ventes */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <ShoppingCartIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Ventes & Facturation
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Gérez vos ventes et générez des factures professionnelles :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Créer une vente
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="🛒 Ajoutez des articles depuis le catalogue" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🔢 Ajustez les quantités" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="💳 Choisissez le mode de paiement" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📄 Générez la facture PDF" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📧 Envoyez par email au client" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Factures
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Numérotation automatique"
                    secondary="Format : FACT-AAAA-NNNN"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Informations légales"
                    secondary="SIRET, TVA, mentions obligatoires"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Export PDF"
                    secondary="Design professionnel et personnalisable"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Vous pouvez créer une facture directement depuis
                une réparation terminée en un clic.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 7: Tarifs */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <LocalOfferIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Tarifs des Services
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Définissez vos tarifs de services pour une facturation rapide :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Créer un tarif
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="🔧 Nom du service (ex: Révision complète)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="📝 Description détaillée" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="💰 Prix TTC" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="⏱️ Durée estimée" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="🏷️ Catégorie" />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Exemples de services
              </Typography>
              <Stack spacing={1}>
                <Chip label="🔧 Révision complète - 45€" size="small" variant="outlined" />
                <Chip label="🚲 Réglage dérailleur - 15€" size="small" variant="outlined" />
                <Chip label="🛞 Changement pneu - 20€" size="small" variant="outlined" />
                <Chip label="🔩 Réparation crevaison - 10€" size="small" variant="outlined" />
              </Stack>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Astuce :</strong> Créez des forfaits (ex: Révision + Nettoyage) pour
                augmenter votre panier moyen.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 8: Administration */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <SettingsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Administration & Paramètres
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Configurez votre application selon vos besoins via <strong>Admin → Paramètres</strong> :
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>🌐 Rendez-vous clients en ligne :</strong> La configuration du tunnel Cloudflare a été déplacée 
                  dans un onglet dédié. Accédez-y via <strong>Rendez-vous clients en ligne</strong> dans le menu principal.
                </Typography>
              </Alert>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                📧 Configuration Email
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Provider (Resend ou SMTP)"
                    secondary="Configurez votre service d'envoi d'emails"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Clé API et informations expéditeur"
                    secondary="Email et nom d'expéditeur personnalisés"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Emails automatiques"
                    secondary="Confirmations de RDV, notifications de réparation"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                💾 Sauvegardes & Restauration
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Export manuel (PC1)"
                    secondary='Admin → "Exporter toutes les données" → Fichier JSON téléchargé'
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Import manuel (PC2)"
                    secondary='Admin → "Restaurer depuis un backup" → Sélectionner fichier JSON'
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Données incluses"
                    secondary="Clients, réparations, factures, catalogue, paramètres"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Transfert entre PC"
                    secondary="Export PC1 → USB/Cloud → Import PC2 = Toutes données transférées"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fusion intelligente"
                    secondary="Import = fusion (pas remplacement). Données existantes conservées + nouvelles ajoutées"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Sauvegardes automatiques"
                    secondary="Configurables : horaire, quotidien ou hebdomadaire"
                  />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                <strong>Cas d&apos;usage :</strong>
                <br />• Changement de PC : Export PC1 → Import PC2
                <br />• Backup sécurité : Export hebdomadaire → Cloud (Google Drive, Dropbox)
                <br />• Multi-sites : Export Site A → Import Site B
                <br />• Récupération crash : Dernier backup → Import sur PC neuf
              </Alert>

              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Important :</strong>
                <br />• Fichier JSON = CONFIDENTIEL (toutes données clients)
                <br />• Recommandation : Backup hebdomadaire minimum
                <br />• Tester restauration 1 fois/mois
                <br />• Plusieurs copies (USB + Cloud)
              </Alert>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                🔒 Sécurité Avancée
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Authentification 2FA pour admin"
                    secondary="Sécurité renforcée pour l'accès administrateur"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Logs d'activité détaillés"
                    secondary="Traçabilité de toutes les actions importantes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mode maintenance"
                    secondary="Bloquez temporairement l'accès à l'application"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Alertes de sécurité"
                    secondary="Notifications email pour activité suspecte"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                ⚠️ Suppression Définitive (Hard Delete)
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Mode dangereux à utiliser avec précaution"
                    secondary='Requiert la saisie de "CONFIRMER" pour activation'
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Suppression sans corbeille"
                    secondary="Les données supprimées ne peuvent pas être récupérées"
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <strong>Nouveau :</strong> Tous les paramètres système sont maintenant centralisés dans une seule page accessible via Admin → Paramètres.
              </Alert>

              <Alert severity="warning">
                <strong>Important :</strong> Effectuez des sauvegardes régulières de vos données.
                Recommandation : configurez les sauvegardes automatiques hebdomadaires.
              </Alert>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                💼 Statut Fiscal et TVA
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Auto-entrepreneur"
                    secondary="TVA automatiquement fixée à 0% sur TOUTES les factures et lignes. Le champ TVA est désactivé dans le wizard si ce statut est sélectionné."
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Société classique"
                    secondary="TVA personnalisable par défaut (généralement 20%). Peut être ajustée par facture."
                  />
                </ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Ordre Wizard Onboarding:</strong>
                <br />1. Bienvenue
                <br />2. Identité personnelle
                <br />3. Identité de l&apos;atelier
                <br />4. Coordonnées
                <br />5. <strong>Statut fiscal</strong> (Auto-entrepreneur coché → TVA 0%)
                <br />6. <strong>Tarification</strong> (TVA désactivée si AE)
                <br />7. Confirmation
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section 9: Astuces Avancées */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TipsAndUpdatesIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Astuces & Raccourcis
                </Typography>
                <Chip label="Pro" size="small" color="warning" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Raccourcis clavier
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Ctrl + K"
                    secondary="Recherche rapide globale"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Ctrl + N"
                    secondary="Nouvelle réparation"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Ctrl + Shift + C"
                    secondary="Nouveau client"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Optimisation du workflow
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Créez des modèles de services fréquents"
                    secondary="Gagnez du temps sur les réparations courantes"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Utilisez les notes clients"
                    secondary="Préférences, historique, particularités"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Configurez les emails automatiques"
                    secondary="Réduisez les appels et améliorez la satisfaction"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Analysez vos statistiques"
                    secondary="Identifiez vos services les plus rentables"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Bonnes pratiques
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="✅ Mettez à jour les statuts en temps réel" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✅ Vérifiez le stock avant de promettre une réparation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✅ Envoyez les factures immédiatement après paiement" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✅ Sauvegardez vos données régulièrement" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="✅ Gardez vos tarifs à jour" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Section Vélos Clients */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <DirectionsBikeIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Gestion des Vélos Clients
                </Typography>
                <Chip label="Important" size="small" color="info" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Chaque client peut avoir jusqu&apos;à 5 vélos enregistrés :
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Accéder aux vélos
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="1. Ouvrir fiche client → Cliquer 'Vélos'"
                    secondary="Affiche la liste des vélos du client"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Informations vélo
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="🏷️ Marque et modèle" /></ListItem>
                <ListItem><ListItemText primary="🔢 Numéro de série (unique)" /></ListItem>
                <ListItem><ListItemText primary="🎨 Couleur" /></ListItem>
                <ListItem><ListItemText primary="📄 Fichier national (BICYCODE)" /></ListItem>
                <ListItem><ListItemText primary="📝 Notes" /></ListItem>
              </List>

              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Limite:</strong> Maximum 5 vélos par client.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section Licences */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <VpnKeyIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Système de Licences
                </Typography>
                <Chip label="Essentiel" size="small" color="primary" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Atelier Vélo+ propose 3 types de licences :
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                🎯 Basique (199€/an)
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="✅ Facturation illimitée" /></ListItem>
                <ListItem><ListItemText primary="✅ Support email 48h" /></ListItem>
                <ListItem><ListItemText primary="⚠️ Limite: 20 emails/semaine" /></ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                ⭐ Pro (359€/an)
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="✅ Emails illimités" /></ListItem>
                <ListItem><ListItemText primary="✅ Stats avancées" /></ListItem>
                <ListItem><ListItemText primary="⚡ Support 12h" /></ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                💎 Pro Lifetime (599€ une fois)
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="✅ Licence à vie" /></ListItem>
                <ListItem><ListItemText primary="✅ Maintenance 3 ans" /></ListItem>
                <ListItem><ListItemText primary="⭐ Support prioritaire" /></ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Essai:</strong> 14 jours PRO gratuit + 7 jours grace period
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section Chronomètre */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TimerIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Chronomètre Réparation
                </Typography>
                <Chip label="Productivité" size="small" color="success" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Suivez le temps passé sur chaque réparation :
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Utilisation
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="1. Ouvrir ticket → Démarrer chrono" /></ListItem>
                <ListItem><ListItemText primary="2. Chrono visible en haut de toutes les pages" /></ListItem>
                <ListItem><ListItemText primary="3. Pause/Reprendre si nécessaire" /></ListItem>
                <ListItem><ListItemText primary="4. Stop → Temps enregistré automatiquement" /></ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Calcul automatique
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="Facturation par tranches 30min (45min = 1h)" /></ListItem>
                <ListItem><ListItemText primary="Tarif horaire depuis paramètres" /></ListItem>
                <ListItem><ListItemText primary="Ajout auto au devis lors génération" /></ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Exemple:</strong> 45min × 60€/h = 1h facturée = 60€ HT
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Section Support & Diagnostics */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <SupportAgentIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Support & Diagnostics
                </Typography>
                <Chip label="Aide" size="small" color="warning" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                En cas de problème, envoyez vos logs au support :
              </Typography>
              
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Procédure
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="1. Admin → Paramètres → Diagnostics" /></ListItem>
                <ListItem><ListItemText primary="2. Cliquer 'Envoyer logs au support'" /></ListItem>
                <ListItem><ListItemText primary="3. ZIP créé et envoyé par email" /></ListItem>
                <ListItem><ListItemText primary="4. Réponse sous 48h (Basique) ou 12h (Pro)" /></ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                Contenu ZIP
              </Typography>
              <List dense>
                <ListItem><ListItemText primary="📄 Logs application" /></ListItem>
                <ListItem><ListItemText primary="📄 Logs serveur" /></ListItem>
                <ListItem><ListItemText primary="💻 Infos système" /></ListItem>
              </List>

              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Confidentialité:</strong> Aucune donnée client dans les logs
              </Alert>
              
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Contact:</strong> atelier-velo-plus@upgradedbikes.com
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Support */}
          <Paper sx={{ p: 3, mt: 3, bgcolor: "grey.50" }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              💬 Besoin d&apos;aide ?
            </Typography>
            <Typography variant="body2" paragraph>
              Si vous rencontrez un problème ou avez une question, n&apos;hésitez pas à nous contacter :
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Chip
                icon={<EmailIcon />}
                label="atelier-velo-plus@upgradedbikes.com"
                component="a"
                href="mailto:atelier-velo-plus@upgradedbikes.com"
                clickable
                color="primary"
              />
            </Stack>
          </Paper>

          {/* Section 10: Nouvelles Fonctionnalités */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <TipsAndUpdatesIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Nouveautés v1.0.0
                </Typography>
                <Chip label="Nouveau" size="small" color="success" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" paragraph>
                Les dernières fonctionnalités ajoutées à Atelier Vélo+ :
              </Typography>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📰 Widget Actualités Vélo
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Flux RSS automatique"
                    secondary="Affiche les 5 derniers articles des magazines vélo français (Top Vélo, Vélo Magazine, VTT Magazine, Planète Cyclisme)"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Mise à jour automatique"
                    secondary="Refresh toutes les 6 heures pour rester informé des dernières actualités"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Accès direct"
                    secondary="Cliquez sur un article pour l'ouvrir dans votre navigateur"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                💼 Gestion Auto-Entrepreneur Améliorée
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="TVA automatique à 0%"
                    secondary="Si statut Auto-entrepreneur sélectionné, TVA forcée à 0% sur toutes les factures"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Champ TVA désactivé"
                    secondary="Impossible de modifier la TVA si Auto-entrepreneur pour éviter les erreurs"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Ordre Wizard optimisé"
                    secondary="Statut fiscal AVANT Tarification pour cohérence (TVA fixée dès sélection AE)"
                  />
                </ListItem>
              </List>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
                🎨 Interface Harmonisée
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Dashboard modernisé"
                    secondary="Tous les widgets ont un style cohérent avec bordures colorées et fonds pastels"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Page Admin harmonisée"
                    secondary="Sections avec même charte graphique que le dashboard"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Widget Stock toujours visible"
                    secondary="Équilibre visuel avec 4 cards, affiche 'Stock OK' si aucune alerte"
                  />
                </ListItem>
              </List>

              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>🚀 Plus de 400 lignes de fonctionnalités ajoutées et 440+ lignes de code nettoyé!</strong>
                <br />L&apos;application est maintenant plus rapide, plus cohérente et plus facile à utiliser.
              </Alert>
            </AccordionDetails>
          </Accordion>

          {/* Footer */}
          <Box sx={{ mt: 4, mb: 2, textAlign: "center" }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Atelier Vélo+ v1.0.0 - © 2025 Jérôme Leyssard - Upgraded Bikes
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tous droits réservés - Dernière mise à jour: Novembre 2025
            </Typography>
          </Box>
      </PageShell>
    </RequireAuth>
  );
}
