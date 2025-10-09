"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Alert, Box, Button, Checkbox, Divider, FormControlLabel, Grid, Snackbar, Stack, TextField, Typography } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import { getAccountSettings, updateAccountSettings, getSetting, setSetting, type AccountSettings } from "@/lib/api";

export default function AccountPage() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState<AccountSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  
  // Paramètres de tarification et stock
  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [vatPercent, setVatPercent] = useState<number>(20);
  const [defaultMinStock, setDefaultMinStock] = useState<number>(0);
  const [defaultReorderQty, setDefaultReorderQty] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const [s, m, v, ms, rq] = await Promise.all([
          getAccountSettings(),
          getSetting<number>('pricing.defaultMultiplier'),
          getSetting<number>('pricing.defaultVatRate'),
          getSetting<number>('stock.defaultMin'),
          getSetting<number>('stock.defaultReorderQty'),
        ]);
        setForm(s || {});
        if (m?.value != null && !Number.isNaN(Number(m.value))) setMultiplier(Number(m.value));
        if (v?.value != null && !Number.isNaN(Number(v.value))) setVatPercent(Math.round(Number(v.value) * 100));
        if (ms?.value != null && !Number.isNaN(Number(ms.value))) setDefaultMinStock(Number(ms.value));
        if (rq?.value != null && !Number.isNaN(Number(rq.value))) setDefaultReorderQty(Number(rq.value));
      } catch (e) {
        console.error(e);
        setToast({ open: true, message: "Erreur: chargement paramètres", severity: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const [saved] = await Promise.all([
        updateAccountSettings(form),
        setSetting('pricing.defaultMultiplier', multiplier),
        setSetting('pricing.defaultVatRate', Math.max(0, Number(vatPercent) / 100)),
        setSetting('stock.defaultMin', Math.max(0, Math.floor(defaultMinStock))),
        setSetting('stock.defaultReorderQty', Math.max(0, Math.floor(defaultReorderQty))),
      ]);
      setForm(saved);
      if (saved.shopName) {
        window.localStorage.setItem('auth:shopName', saved.shopName);
        window.dispatchEvent(new CustomEvent('shopNameUpdated', { detail: { shopName: saved.shopName } }));
      }
      setToast({ open: true, message: "Paramètres enregistrés", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: enregistrement", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Mon compte" maxWidth="md">
        <SectionCard title="Profil" icon={<PersonIcon color="primary" />}>
          {user ? (
            <Stack spacing={2}>
              <Typography variant="body1"><strong>User ID:</strong> {user.id}</Typography>
              {user.email && (<Typography variant="body1"><strong>Email:</strong> {user.email}</Typography>)}
              <Typography variant="body2" color="text.secondary">Les requêtes API incluent l&apos;en-tête <code>x-user-id</code>.</Typography>
              <Button variant="outlined" color="inherit" onClick={logout}>Se déconnecter</Button>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Typography>Vous n&apos;êtes pas connecté.</Typography>
              <Button variant="contained" href="/auth/login">Se connecter</Button>
            </Stack>
          )}
        </SectionCard>

        <SectionCard title="Paramètres atelier" icon={<SettingsIcon color="primary" />}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Nom de l'atelier" fullWidth size="small" value={form.shopName || ''} onChange={(e) => setForm({ ...form, shopName: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Email" fullWidth size="small" value={form.shopEmail || ''} onChange={(e) => setForm({ ...form, shopEmail: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Téléphone" fullWidth size="small" value={form.shopPhone || ''} onChange={(e) => setForm({ ...form, shopPhone: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Adresse (ligne 1)" fullWidth size="small" value={form.address1 || ''} onChange={(e) => setForm({ ...form, address1: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Adresse (ligne 2)" fullWidth size="small" value={form.address2 || ''} onChange={(e) => setForm({ ...form, address2: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Code postal" fullWidth size="small" value={form.zip || ''} onChange={(e) => setForm({ ...form, zip: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField label="Ville" fullWidth size="small" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Pays" fullWidth size="small" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Couleur PDF (hex)" placeholder="#1976d2" fullWidth size="small" value={form.pdfPrimary || ''} onChange={(e) => setForm({ ...form, pdfPrimary: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField label="Mentions légales" fullWidth size="small" multiline minRows={3} value={form.legalFooter || ''} onChange={(e) => setForm({ ...form, legalFooter: e.target.value })} disabled={loading || saving} />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">STATUT FISCAL</Typography></Divider>
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={form.isAutoEntrepreneur || false} 
                      onChange={(e) => setForm({ ...form, isAutoEntrepreneur: e.target.checked })} 
                      disabled={loading || saving}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2"><strong>Auto-Entrepreneur (TVA 0%)</strong></Typography>
                      <Typography variant="caption" color="text.secondary">
                        Si coché, les articles du catalogue auront une TVA de 0% par défaut.
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">INFORMATIONS LÉGALES</Typography></Divider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField label="SIRET" fullWidth size="small" value={form.siret || ''} onChange={(e) => setForm({ ...form, siret: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="N° TVA Intracommunautaire" fullWidth size="small" value={form.tva || ''} onChange={(e) => setForm({ ...form, tva: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="RCS" fullWidth size="small" value={form.rcs || ''} onChange={(e) => setForm({ ...form, rcs: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Capital" fullWidth size="small" value={form.capital || ''} onChange={(e) => setForm({ ...form, capital: e.target.value })} disabled={loading || saving} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Assurance professionnelle" fullWidth size="small" value={form.insurance || ''} onChange={(e) => setForm({ ...form, insurance: e.target.value })} disabled={loading || saving} />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">TARIFICATION</Typography></Divider>
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
                  disabled={loading || saving}
                  fullWidth 
                  size="small" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="TVA par défaut (%)" 
                  type="number" 
                  inputProps={{ step: '1' }}
                  value={vatPercent}
                  onChange={(e) => setVatPercent(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  helperText="Utilisée comme valeur par défaut"
                  disabled={loading || saving}
                  fullWidth 
                  size="small" 
                />
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}><Typography variant="caption" color="text.secondary">STOCK</Typography></Divider>
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
                  disabled={loading || saving}
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
                  disabled={loading || saving}
                  fullWidth 
                  size="small" 
                />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained" disabled={saving}>Enregistrer tout</Button>
            </Stack>
          </Box>
        </SectionCard>

        <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
