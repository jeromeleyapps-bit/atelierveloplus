"use client";

import { useState } from "react";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useLogoUpload } from "@/hooks/useLogoUpload";
import { logger } from '@/lib/logger';

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

export default function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const router = useRouter();
  const logoUpload = useLogoUpload();
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Données formulaire - ÉTAPES COMPLÈTES
  // Étape 2: Identité personnelle
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // Étape 3: Identité atelier
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("");
  // Étape 4: Coordonnées
  const [address1, setAddress1] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  // Étape 5: Tarification
  const [hourlyRate, setHourlyRate] = useState(60);
  const [multiplier, setMultiplier] = useState(1.5);
  const [vatPercent, setVatPercent] = useState(20);
  // Étape 6: Statut fiscal
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
  const [siret, setSiret] = useState("");
  const [tva, setTva] = useState("");

  const steps = [
    "Bienvenue",
    "Identité personnelle",
    "Identité de l'atelier",
    "Coordonnées",
    "Statut fiscal",
    "Tarification",
    "Confirmation",
  ];

  const handleNext = () => {
    // Validation par étape
    if (activeStep === 1 && (!firstName.trim() || !lastName.trim())) {
      setError("Le prénom et le nom sont obligatoires");
      return;
    }
    if (activeStep === 2 && !shopName.trim()) {
      setError("Le nom de l'atelier est obligatoire");
      return;
    }
    if (activeStep === 3 && (!address1.trim() || !city.trim())) {
      setError("L'adresse et la ville sont obligatoires");
      return;
    }
    // Si passage de Statut fiscal → Tarification: Forcer TVA=0 si AE
    if (activeStep === 4 && isAutoEntrepreneur) {
      setVatPercent(0);
    }
    
    setError("");
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError("");
    setActiveStep((prev) => prev - 1);
  };

  const handleFinish = async () => {
    setSaving(true);
    setError("");

    try {
      const token = localStorage.getItem("jwt_token");
      
      // Vérification critique: Token présent (utilisateur authentifié)
      if (!token) {
        logger.error("[Wizard] ❌ Aucun token JWT - Utilisateur non authentifié");
        setError("Session expirée. Veuillez vous reconnecter.");
        setSaving(false);
        return;
      }
      
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // 1. Sauvegarder identité personnelle (User.name)
      const userName = [firstName, lastName].filter(Boolean).join(" ");
      const profileRes = await fetch("/api/user/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ name: userName }),
      });
      
      if (!profileRes.ok) {
        const errData = await profileRes.json();
        throw new Error(`Erreur profil: ${errData.error || "Échec sauvegarde"}`);
      }

      // 2. Sauvegarder paramètres atelier et coordonnées
      const settingsRes = await fetch("/api/account/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          shopName,
          shopLogo: shopLogo || undefined,
          address1,
          zip,
          city,
          shopPhone,
          shopEmail,
          isAutoEntrepreneur,
          siret: siret || undefined,
          tva: tva || undefined,
        }),
      });
      
      if (!settingsRes.ok) {
        const errData = await settingsRes.json();
        throw new Error(`Erreur paramètres: ${errData.error || "Échec sauvegarde"}`);
      }

      // 3. Sauvegarder tarification (GlobalSettings)
      await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            key: "pricing.hourlyRate",
            value: String(hourlyRate),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            key: "pricing.defaultMultiplier",
            value: String(multiplier),
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers,
          body: JSON.stringify({
            key: "pricing.defaultVatRate",
            value: String(vatPercent / 100),
          }),
        }),
      ]);

      // Sauvegarder shopName dans localStorage pour la bannière
      localStorage.setItem("auth:shopName", shopName);
      window.dispatchEvent(
        new CustomEvent("shopNameUpdated", {
          detail: { shopName, shopLogo: null },
        })
      );

      // 4. Démarrer trial gratuit automatiquement (14 jours PRO)
      try {
        const trialEmail = shopEmail || "noreply@atelier.local";
        const trialName = shopName || "Atelier";
        
        const trialResponse = await fetch("/api/admin/license/start-trial", {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: trialEmail,
            name: trialName,
          }),
        });
        
        if (trialResponse.ok) {
          const trialData = await trialResponse.json();
          logger.info("[Wizard] ✅ Trial 14j PRO démarré:", trialData);
        } else {
          const errorData = await trialResponse.json();
          logger.warn("[Wizard] ⚠️ Trial non démarré:", errorData.message);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        logger.error("[Wizard] ❌ Erreur démarrage trial", { error: message });
      }

      // Vérifier que le token est toujours valide avant redirection
      const finalToken = localStorage.getItem("jwt_token");
      if (!finalToken) {
        logger.warn("[Wizard] ⚠️ Token perdu pendant la configuration - Redirection login");
        router.push("/auth/login" as Route);
        return;
      }
      
      logger.info("[Wizard] ✅ Configuration terminée - Token valide");
      onComplete();
      
      // Petite pause pour laisser le state se synchroniser
      await new Promise(resolve => setTimeout(resolve, 300));
      router.push("/dashboard" as Route);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de la configuration";
      logger.error(message);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour passer l'assistant sans loop
  const handleSkip = async () => {
    try {
      const token = localStorage.getItem("jwt_token");
      if (!token) {
        logger.warn("[Wizard] Skip sans token - fermeture directe");
        onComplete();
        return;
      }
      
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      
      // Sauvegarder shopName par défaut pour éviter loop au reload
      await fetch("/api/account/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          shopName: "Mon Atelier",
        }),
      });
      
      // Sauvegarder aussi dans localStorage pour la bannière
      localStorage.setItem("auth:shopName", "Mon Atelier");
      window.dispatchEvent(
        new CustomEvent("shopNameUpdated", {
          detail: { shopName: "Mon Atelier", shopLogo: null },
        })
      );
      
      logger.info("[Wizard] ✅ Skip avec shopName par défaut");
      onComplete();
    } catch (err) {
      logger.error("[Wizard] Erreur skip:", err);
      // Fermer quand même pour ne pas bloquer l'utilisateur
      onComplete();
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              🚴 Bienvenue dans Atelier Vélo+
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 4 }}>
              Configurons votre atelier en quelques étapes simples.
              <br />
              Cela ne prendra que 2 minutes !
            </Typography>
            <Paper sx={{ p: 3, bgcolor: "primary.50", border: 1, borderColor: "primary.200" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Ce que nous allons configurer :
              </Typography>
              <Stack spacing={1} sx={{ textAlign: "left" }}>
                <Typography variant="body2">✓ Votre identité personnelle</Typography>
                <Typography variant="body2">✓ Nom et coordonnées de votre atelier</Typography>
                <Typography variant="body2">✓ Tarification (tarif horaire, multiplicateur, TVA)</Typography>
                <Typography variant="body2">✓ Statut fiscal (auto-entrepreneur ou société)</Typography>
                <Typography variant="body2">✓ Informations légales pour vos factures</Typography>
              </Stack>
            </Paper>
          </Box>
        );

      case 1:
        // ÉTAPE 1: Identité personnelle (NOUVEAU)
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Votre identité
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ces informations permettront de personnaliser votre espace.
            </Typography>
            <TextField
              label="Prénom *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ex: Jean"
              fullWidth
              required
            />
            <TextField
              label="Nom *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Ex: Dupont"
              fullWidth
              required
            />
          </Stack>
        );

      case 2:
        // ÉTAPE 2: Identité atelier
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Identité de votre atelier
            </Typography>
            <TextField
              label="Nom de l'atelier *"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Ex: Atelier Vélo Pro"
              fullWidth
              required
              helperText="Ce nom apparaîtra sur vos factures et devis"
            />
            
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                Logo de l&apos;atelier (optionnel)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Formats: PNG, JPG | Taille max: 5MB
              </Typography>
              <Button
                variant="outlined"
                component="label"
                disabled={logoUpload.uploading}
                sx={{ mb: 1 }}
              >
                {logoUpload.uploading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                    Upload...
                  </>
                ) : shopLogo ? (
                  "Changer le logo"
                ) : (
                  "Téléverser logo (PNG/JPG)"
                )}
                <input
                  type="file"
                  hidden
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const path = await logoUpload.upload(file);
                      if (path) setShopLogo(path);
                    }
                  }}
                />
              </Button>
              {shopLogo && (
                <Typography variant="caption" sx={{ display: "block", color: 'success.main' }}>
                  ✓ Logo uploadé: {typeof shopLogo === 'string' ? shopLogo : 'logo.png'}
                </Typography>
              )}
            </Box>
          </Stack>
        );

      case 3:
        // ÉTAPE 3: Coordonnées
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Coordonnées de l&apos;atelier
            </Typography>
            <TextField
              label="Adresse *"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              placeholder="Ex: 123 Rue du Vélo"
              fullWidth
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Code postal *"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="75000"
                required
                sx={{ width: "30%" }}
              />
              <TextField
                label="Ville *"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Paris"
                fullWidth
                required
              />
            </Stack>
            <TextField
              label="Téléphone"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              placeholder="01 23 45 67 89"
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={shopEmail}
              onChange={(e) => setShopEmail(e.target.value)}
              placeholder="contact@atelier.fr"
              fullWidth
            />
          </Stack>
        );

      case 4:
        // ÉTAPE 4: Statut fiscal (AVANT Tarification)
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Statut fiscal
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isAutoEntrepreneur}
                  onChange={(e) => {
                    setIsAutoEntrepreneur(e.target.checked);
                    // Si AE coché → Forcer TVA à 0 immédiatement
                    if (e.target.checked) {
                      setVatPercent(0);
                    }
                  }}
                />
              }
              label="Je suis auto-entrepreneur (TVA non applicable)"
            />
            {isAutoEntrepreneur && (
              <Alert severity="warning">
                ⚠️ En tant qu&apos;auto-entrepreneur, la TVA sera automatiquement fixée à 0% sur toutes vos factures
              </Alert>
            )}
            {!isAutoEntrepreneur && (
              <Alert severity="info">
                En tant que société, la TVA sera automatiquement calculée sur vos factures
              </Alert>
            )}
            <TextField
              label="SIRET"
              value={siret}
              onChange={(e) => setSiret(e.target.value)}
              placeholder="123 456 789 00012"
              fullWidth
              helperText="Numéro d'identification de votre entreprise"
            />
            {!isAutoEntrepreneur && (
              <TextField
                label="N° TVA Intracommunautaire"
                value={tva}
                onChange={(e) => setTva(e.target.value)}
                placeholder="FR12345678901"
                fullWidth
              />
            )}
          </Stack>
        );

      case 5:
        // ÉTAPE 5: Tarification (APRÈS Statut fiscal)
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Tarification
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Définissez vos tarifs par défaut. Vous pourrez les ajuster plus tard.
            </Typography>
            <TextField
              label="Tarif horaire main d'œuvre (€/h)"
              type="number"
              inputProps={{ step: '1', min: '0' }}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              helperText="Tarif facturé pour les réparations et entretiens"
              fullWidth
            />
            <TextField
              label="Multiplicateur prix de vente"
              type="number"
              inputProps={{ step: '0.1', min: '1' }}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              helperText="Prix de vente = Prix achat HT × multiplicateur (recommandé: 1.5 - 2.0)"
              fullWidth
            />
            <TextField
              label={isAutoEntrepreneur ? "TVA (Auto-entrepreneur = 0%)" : "TVA par défaut (%)"}
              type="number"
              inputProps={{ step: '1', min: '0', max: '100' }}
              value={vatPercent}
              onChange={(e) => setVatPercent(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              helperText={isAutoEntrepreneur ? "TVA fixée à 0% (auto-entrepreneur)" : "Utilisée comme valeur par défaut sur les factures"}
              disabled={isAutoEntrepreneur}
              fullWidth
            />
            {isAutoEntrepreneur && (
              <Alert severity="info" sx={{ mt: 1 }}>
                💡 En tant qu&apos;auto-entrepreneur, la TVA est automatiquement à 0% et ne peut pas être modifiée
              </Alert>
            )}
          </Stack>
        );

      case 6:
        // ÉTAPE 6: Confirmation
        return (
          <Stack spacing={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Récapitulatif
            </Typography>
            <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
              <Stack spacing={2}>
                {(firstName || lastName) && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Votre nom
                    </Typography>
                    <Typography variant="body1">
                      {[firstName, lastName].filter(Boolean).join(" ")}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Nom de l&apos;atelier
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {shopName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Adresse
                  </Typography>
                  <Typography variant="body1">
                    {address1}
                    <br />
                    {zip} {city}
                  </Typography>
                </Box>
                {shopPhone && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Téléphone
                    </Typography>
                    <Typography variant="body1">{shopPhone}</Typography>
                  </Box>
                )}
                {shopEmail && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{shopEmail}</Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Tarification
                  </Typography>
                  <Typography variant="body1">
                    Tarif horaire: {hourlyRate}€/h | Multiplicateur: ×{multiplier} | TVA: {vatPercent}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Statut fiscal
                  </Typography>
                  <Typography variant="body1">
                    {isAutoEntrepreneur ? "Auto-entrepreneur (TVA non applicable)" : "Société (TVA applicable)"}
                  </Typography>
                </Box>
                {siret && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      SIRET
                    </Typography>
                    <Typography variant="body1">{siret}</Typography>
                  </Box>
                )}
              </Stack>
            </Paper>
            <Alert severity="success">
              Tout est prêt ! Vous pourrez modifier ces informations à tout moment dans les paramètres.
            </Alert>
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          minHeight: "60vh",
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}

        <Stack direction="row" spacing={2} sx={{ mt: 4, justifyContent: "space-between", alignItems: "center" }}>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={activeStep === 0 || saving}
              onClick={handleBack}
              variant="outlined"
            >
              Retour
            </Button>
            <Button
              onClick={handleSkip}
              disabled={saving}
              variant="text"
              color="secondary"
              sx={{
                textTransform: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              Passer l&apos;assistant de configuration
            </Button>
          </Stack>
          <Box sx={{ flex: 1 }} />
          {activeStep < steps.length - 1 ? (
            <Button variant="contained" onClick={handleNext}>
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleFinish}
              disabled={saving}
              sx={{ minWidth: 150 }}
            >
              {saving ? "Enregistrement..." : "Terminer"}
            </Button>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
