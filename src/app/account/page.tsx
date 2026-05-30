"use client";

import { useAccountData } from '@/hooks/useAccountData';
import { useLogoUpload } from '@/hooks/useLogoUpload';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';
import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useRouter } from "next/navigation";
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import SimpleBookingSection from "./components/SimpleBookingSection";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import StarIcon from "@mui/icons-material/Star";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ComputerIcon from "@mui/icons-material/Computer";
import type { AccountSettings } from "@/lib/api";
import { updateAccountSettings, setSetting } from "@/lib/api";
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

export default function AccountPage() {
  const { user, logout } = useAuth();
  const accountData = useAccountData();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Direct useState - NO custom hooks
  const [form, setForm] = useState<AccountSettings>({});
  const [multiplier, setMultiplier] = useState(1.5);
  const [vatPercent, setVatPercent] = useState(20);
  const [hourlyRate, setHourlyRate] = useState(60);
  const [defaultMinStock, setDefaultMinStock] = useState(0);
  const [defaultReorderQty, setDefaultReorderQty] = useState(0);
  const [rdvHost, setRdvHost] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });
  const [license, setLicense] = useState<{ tier: string; status: string; isTrial?: boolean; trial?: { endsAt: string; daysRemaining?: number }; features?: Record<string, boolean> } | null>(null);
  const [advancedMode] = useAdvancedMode();
  const [hardwareId, setHardwareId] = useState<string | null>(null);
  const [hardwareIdCopied, setHardwareIdCopied] = useState(false);

  // Logo upload hook avec sauvegarde automatique
  const logoUpload = useLogoUpload({
    onSuccess: async (path) => {
      logger.info('[Account] Logo uploadé:', { path });
      
      // ✅ Mise à jour du formulaire
      setForm(prevForm => ({ ...prevForm, shopLogo: path }));
      
      // ✅ Sauvegarde automatique en base de données
      try {
        logger.info('[Account] Sauvegarde automatique du logo...');
        const saved = await updateAccountSettings({ shopLogo: path });
        
        // Mise à jour localStorage
        if (saved.shopLogo) {
          window.localStorage.setItem('auth:shopLogo', saved.shopLogo);
          logger.info('[Account] Logo sauvegardé dans localStorage:', { shopLogo: saved.shopLogo });
        }
        
        // ✅ Dispatch événement pour mise à jour bannière
        window.dispatchEvent(new CustomEvent('shopNameUpdated', { 
          detail: { shopLogo: saved.shopLogo } 
        }));
        logger.info('[Account] Événement shopNameUpdated dispatché');
        
        // Invalider cache React Query
        queryClient.invalidateQueries({ queryKey: ['accountSettings'] });
        
        setToast({ open: true, message: '✓ Logo enregistré et affiché dans la bannière', severity: 'success' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('[Account] Erreur sauvegarde logo:', { error: errorMessage });
        setToast({ open: true, message: 'Logo uploadé mais erreur de sauvegarde. Cliquez "Enregistrer tout"', severity: 'error' });
      }
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('[Account] Erreur upload logo:', { error: errorMessage });
      setToast({ open: true, message: 'Erreur lors du téléversement', severity: 'error' });
    },
  });

  // Load license info and hardware ID
  useEffect(() => {
    async function fetchLicense() {
      try {
        const token = window.localStorage.getItem('jwt_token');
        const res = await fetch('/api/admin/license/status', {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setLicense(data);
        }
      } catch (err) {
        logger.error('[Account] Error fetching license:', err);
      }
    }
    
    async function fetchHardwareId() {
      try {
        const res = await fetch('/api/admin/license/hardware-id');
        if (res.ok) {
          const data = await res.json();
          setHardwareId(data.displayId);
        }
      } catch (err) {
        logger.error('[Account] Error fetching hardware ID:', err);
      }
    }
    
    fetchLicense();
    fetchHardwareId();
  }, []);

  // Load data once - FIX: Utiliser seulement isLoading pour éviter boucle infinie
  useEffect(() => {
    if (!accountData.isLoading && accountData.accountSettings) {
      setForm(accountData.accountSettings);
      setMultiplier(accountData.multiplier);
      // ✅ FIX: Ajuster TVA selon statut AE au chargement
      const isAE = accountData.accountSettings?.isAutoEntrepreneur || false;
      setVatPercent(isAE ? 0 : accountData.vatPercent);
      setHourlyRate(accountData.hourlyRate);
      setDefaultMinStock(accountData.defaultMinStock);
      setDefaultReorderQty(accountData.defaultReorderQty);
      setRdvHost(accountData.rdvHost);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountData.isLoading]);

  // ✅ FIX: Ajuster TVA automatiquement si statut AE change
  useEffect(() => {
    if (form.isAutoEntrepreneur) {
      // Si AE coché → Forcer TVA à 0%
      setVatPercent(0);
    } else if (form.isAutoEntrepreneur === false && vatPercent === 0) {
      // Si AE décoché et TVA à 0 → Remettre à 20% par défaut
      setVatPercent(20);
    }
  }, [form.isAutoEntrepreneur, vatPercent]);

  async function handleSave() {
    setSaving(true);
    logger.info('[ACCOUNT] ===== SAVE DEBUG =====');
    logger.info('[ACCOUNT] Form à sauvegarder:', { form });
    logger.info('[ACCOUNT] form.shopLogo:', { shopLogo: form.shopLogo });
    try {
      const [saved] = await Promise.all([
        updateAccountSettings(form),
        setSetting('pricing.defaultMultiplier', multiplier),
        // ✅ FIX: Si auto-entrepreneur, forcer TVA à 0% même si vatPercent différent
        setSetting('pricing.defaultVatRate', form.isAutoEntrepreneur ? 0 : Math.max(0, Number(vatPercent) / 100)),
        setSetting('pricing.hourlyRate', Math.max(0, Number(hourlyRate))),
        setSetting('stock.defaultMin', Math.max(0, Math.floor(defaultMinStock))),
        setSetting('stock.defaultReorderQty', Math.max(0, Math.floor(defaultReorderQty))),
        rdvHost ? setSetting('cloudflare.rdvHost', rdvHost) : Promise.resolve(null),
      ]);

      // Update localStorage for shop name AND logo
      if (saved.shopName) {
        window.localStorage.setItem('auth:shopName', saved.shopName);
      }
      if (saved.shopLogo) {
        window.localStorage.setItem('auth:shopLogo', saved.shopLogo);
      }
      // Dispatch event même si null (pour effacer logo)
      window.dispatchEvent(new CustomEvent('shopNameUpdated', { 
        detail: { shopName: saved.shopName, shopLogo: saved.shopLogo } 
      }));

      setForm(saved);
      
      // ✅ FIX: Invalider le cache React Query pour forcer le rechargement des données
      queryClient.invalidateQueries({ queryKey: ['accountSettings'] });
      
      setToast({ open: true, message: 'Paramètres enregistrés', severity: 'success' });
    } catch (e) {
      logger.error('[ACCOUNT] Erreur sauvegarde:', e);
      const errorMsg = e instanceof Error ? e.message : 'Erreur inconnue';
      setToast({ open: true, message: `Erreur: ${errorMsg}`, severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Mon compte" maxWidth="md" headerColor="#2563eb">
        {/* SECTION: Profil Utilisateur */}
        <SectionCard title="Profil Utilisateur" icon={<PersonIcon color="primary" />}>
          {user ? (
            <Stack spacing={3}>
              {/* Informations personnelles */}
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                  INFORMATIONS PERSONNELLES
                </Typography>
                <Stack spacing={1.5}>
                  {(form.firstName || form.lastName) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        Nom:
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {[form.firstName, form.lastName].filter(Boolean).join(' ')}
                      </Typography>
                    </Box>
                  )}
                  {user.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        Email:
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {user.email}
                      </Typography>
                    </Box>
                  )}
                  {advancedMode && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        User ID:
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {user.id}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Statut de la licence */}
              {license && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    STATUT DE LA LICENCE
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      bgcolor: license.isTrial ? '#e3f2fd' : '#f5f5f5',
                      border: 1,
                      borderColor: license.isTrial ? '#2196f3' : '#e0e0e0',
                      borderRadius: 2,
                    }}
                  >
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          {license.isTrial ? (
                            <StarIcon sx={{ fontSize: 28, color: '#2196f3' }} />
                          ) : (
                            <VpnKeyIcon sx={{ fontSize: 28, color: '#757575' }} />
                          )}
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Licence active
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                              {license.isTrial
                                ? 'Essai Gratuit PRO'
                                : license.tier === 'basique'
                                ? 'Basique'
                                : license.tier === 'pro'
                                ? 'Pro'
                                : license.tier === 'pro_lifetime'
                                ? 'Pro Lifetime'
                                : 'Aucune'}
                            </Typography>
                          </Box>
                        </Box>
                        <Chip
                          label={
                            license.isTrial
                              ? `${license.trial?.daysRemaining || 0} jours restants`
                              : 'Active'
                          }
                          color={license.isTrial ? 'info' : 'success'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      </Box>

                      {license.isTrial && (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          <Typography variant="body2">
                            Profitez de toutes les fonctionnalités PRO gratuitement pendant votre période d&apos;essai
                          </Typography>
                        </Alert>
                      )}

                      <Button
                        variant="contained"
                        startIcon={<VpnKeyIcon />}
                        onClick={() => {
                          // ✅ FIX: Utiliser router.push au lieu de href pour éviter déconnexion
                          // Trial → Page upgrade, Licence activée → Page gestion
                          const targetRoute = license.isTrial 
                            ? '/admin/license/upgrade' 
                            : '/admin/license';
                          router.push(targetRoute);
                        }}
                        fullWidth
                        sx={{
                          bgcolor: license.isTrial ? '#2196f3' : '#1976d2',
                          '&:hover': {
                            bgcolor: license.isTrial ? '#1976d2' : '#1565c0',
                          },
                        }}
                      >
                        {license.isTrial ? 'Voir les offres' : 'Gérer ma licence'}
                      </Button>
                    </Stack>
                  </Paper>
                </Box>
              )}

              {/* Identifiant Machine — technique, réservé au mode avancé / support */}
              {hardwareId && advancedMode && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                    IDENTIFIANT MACHINE (support)
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: '#fafafa',
                      border: 1,
                      borderColor: '#e0e0e0',
                      borderRadius: 2,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ComputerIcon sx={{ fontSize: 24, color: '#757575' }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Identifiant de cette machine
                          </Typography>
                          <Typography 
                            variant="h6" 
                            fontWeight="bold" 
                            sx={{ 
                              fontFamily: 'monospace',
                              letterSpacing: 1,
                              color: '#1976d2'
                            }}
                          >
                            {hardwareId}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ContentCopyIcon />}
                          onClick={() => {
                            navigator.clipboard.writeText(hardwareId);
                            setHardwareIdCopied(true);
                            setTimeout(() => setHardwareIdCopied(false), 2000);
                            setToast({ open: true, message: 'Identifiant copié !', severity: 'success' });
                          }}
                          sx={{ minWidth: 100 }}
                        >
                          {hardwareIdCopied ? 'Copié !' : 'Copier'}
                        </Button>
                      </Box>
                      <Alert severity="info" sx={{ py: 0.5 }}>
                        <Typography variant="caption">
                          Identifiant unique de cet ordinateur. Utile uniquement pour le support
                          en cas de transfert de licence vers un nouveau matériel.
                        </Typography>
                      </Alert>
                    </Stack>
                  </Paper>
                </Box>
              )}

              <Divider />

              {/* Actions */}
              <Box>
                <Button 
                  variant="outlined" 
                  color="inherit" 
                  onClick={logout}
                  fullWidth
                  sx={{ textTransform: 'none' }}
                >
                  Se déconnecter
                </Button>
              </Box>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography>Vous n&apos;êtes pas connecté.</Typography>
              <Button variant="contained" href="/auth/login">
                Se connecter
              </Button>
            </Stack>
          )}
        </SectionCard>

        {/* SECTION: RDV en Ligne */}
        <SimpleBookingSection
          rdvHost={rdvHost}
          onRdvHostChange={setRdvHost}
          onShowToast={(msg, severity) => setToast({ open: true, message: msg, severity })}
        />

        {/* SECTION: Paramètres Atelier */}
        <SectionCard title="Paramètres atelier" icon={<SettingsIcon color="primary" />}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <Grid container spacing={2}>
              {/* Informations de base */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Nom de l'atelier"
                  fullWidth
                  size="small"
                  value={form.shopName || ''}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  fullWidth
                  size="small"
                  value={form.shopEmail || ''}
                  onChange={(e) => setForm({ ...form, shopEmail: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Téléphone"
                  fullWidth
                  size="small"
                  value={form.shopPhone || ''}
                  onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
                  disabled={saving}
                />
              </Grid>

              {/* Adresse */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Adresse (ligne 1)"
                  fullWidth
                  size="small"
                  value={form.address1 || ''}
                  onChange={(e) => setForm({ ...form, address1: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Adresse (ligne 2)"
                  fullWidth
                  size="small"
                  value={form.address2 || ''}
                  onChange={(e) => setForm({ ...form, address2: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Code postal"
                  fullWidth
                  size="small"
                  value={form.zip || ''}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  label="Ville"
                  fullWidth
                  size="small"
                  value={form.city || ''}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Pays"
                  fullWidth
                  size="small"
                  value={form.country || ''}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  disabled={saving}
                />
              </Grid>

              {/* Identité visuelle */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    IDENTITÉ VISUELLE
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12}>
                <Stack spacing={1}>
                  <Typography variant="body2" fontWeight={600}>
                    Logo de l&apos;atelier
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Formats: PNG, JPG | Taille max: 5MB | Redimensionné automatiquement à 512x512px
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    disabled={logoUpload.uploading}
                    sx={{ maxWidth: 200 }}
                  >
                    {logoUpload.uploading
                      ? 'Upload...'
                      : form.shopLogo
                      ? 'Changer le logo'
                      : 'Téléverser logo (PNG/JPG)'}
                    <input
                      type="file"
                      hidden
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={(e) => logoUpload.upload(e.target.files?.[0])}
                    />
                  </Button>
                  {form.shopLogo && (
                    <Typography variant="caption" sx={{ color: 'success.main' }}>
                      ✓ Logo actuel: {form.shopLogo}
                    </Typography>
                  )}
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Mentions légales"
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  placeholder="Ex: SIRET 123 456 789 00012 - TVA FR12345678901 - RCS Paris 123456789 - Capital social 10000€ - Assurance RC Pro: AXA Police n°123456789"
                  value={form.legalFooter || ''}
                  onChange={(e) => setForm({ ...form, legalFooter: e.target.value })}
                  disabled={saving}
                  helperText="Texte affiché en pied de page sur tous les documents PDF (devis, factures, avoirs)"
                />
              </Grid>

              {/* Statut fiscal */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    STATUT FISCAL
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.isAutoEntrepreneur || false}
                      onChange={(e) => setForm({ ...form, isAutoEntrepreneur: e.target.checked })}
                      disabled={saving}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">
                        <strong>Auto-Entrepreneur (TVA 0%)</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Si coché, les articles du catalogue auront une TVA de 0% par défaut.
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              {/* Informations légales */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    INFORMATIONS LÉGALES
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="SIRET"
                  fullWidth
                  size="small"
                  value={form.siret || ''}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="N° TVA Intracommunautaire"
                  fullWidth
                  size="small"
                  value={form.tva || ''}
                  onChange={(e) => setForm({ ...form, tva: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="RCS"
                  fullWidth
                  size="small"
                  value={form.rcs || ''}
                  onChange={(e) => setForm({ ...form, rcs: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Capital"
                  fullWidth
                  size="small"
                  value={form.capital || ''}
                  onChange={(e) => setForm({ ...form, capital: e.target.value })}
                  disabled={saving}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Assurance professionnelle"
                  fullWidth
                  size="small"
                  value={form.insurance || ''}
                  onChange={(e) => setForm({ ...form, insurance: e.target.value })}
                  disabled={saving}
                />
              </Grid>

              {/* Tarification */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    TARIFICATION
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Multiplicateur par défaut (PV)"
                  type="number"
                  inputProps={{ step: '0.1' }}
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText="PV = Prix achat HT × multiplicateur"
                  disabled={saving}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={form.isAutoEntrepreneur ? "TVA par défaut (%) - Auto-Entrepreneur" : "TVA par défaut (%)"}
                  type="number"
                  inputProps={{ step: '1', min: 0, max: 100 }}
                  value={vatPercent}
                  onChange={(e) => setVatPercent(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText={form.isAutoEntrepreneur 
                    ? "TVA 0% pour auto-entrepreneur" 
                    : "Utilisée comme valeur par défaut"}
                  disabled={saving || form.isAutoEntrepreneur}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Tarif horaire main d'œuvre (€/h)"
                  type="number"
                  inputProps={{ step: '1', min: '0' }}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText="Facturation par tranches de 30 min"
                  disabled={saving}
                  fullWidth
                  size="small"
                />
              </Grid>

              {/* Stock */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    STOCK
                  </Typography>
                </Divider>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Stock min par défaut"
                  type="number"
                  inputProps={{ step: '1' }}
                  value={defaultMinStock}
                  onChange={(e) => setDefaultMinStock(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText="Pour les nouveaux articles"
                  disabled={saving}
                  fullWidth
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Qté de réassort par défaut"
                  type="number"
                  inputProps={{ step: '1' }}
                  value={defaultReorderQty}
                  onChange={(e) => setDefaultReorderQty(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText="Pour les nouveaux articles"
                  disabled={saving}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer tout'}
              </Button>
            </Stack>
          </Box>
        </SectionCard>

        {/* Toast notifications */}
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
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
