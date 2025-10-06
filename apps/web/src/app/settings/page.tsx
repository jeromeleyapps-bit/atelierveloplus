"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, Paper, Snackbar, Stack, TextField, Typography, Divider } from "@mui/material";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import RequireAuth from "../components/RequireAuth";
import { getSetting, setSetting, getAppSettings, updateAppSettings } from "@/lib/api";

export default function SettingsPage() {
  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingShop, setSavingShop] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [vatPercent, setVatPercent] = useState<number>(20);
  const [defaultMinStock, setDefaultMinStock] = useState<number>(0);
  const [defaultReorderQty, setDefaultReorderQty] = useState<number>(0);
  
  // Informations atelier
  const [shopName, setShopName] = useState<string>("");
  const [shopEmail, setShopEmail] = useState<string>("");
  const [shopPhone, setShopPhone] = useState<string>("");
  const [address1, setAddress1] = useState<string>("");
  const [zip, setZip] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [legalFooter, setLegalFooter] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const [m, v, ms, rq, appSettings] = await Promise.all([
          getSetting<number>('pricing.defaultMultiplier'),
          getSetting<number>('pricing.defaultVatRate'),
          getSetting<number>('stock.defaultMin'),
          getSetting<number>('stock.defaultReorderQty'),
          getAppSettings(),
        ]);
        if (m?.value != null && !Number.isNaN(Number(m.value))) setMultiplier(Number(m.value));
        if (v?.value != null && !Number.isNaN(Number(v.value))) setVatPercent(Math.round(Number(v.value) * 100));
        if (ms?.value != null && !Number.isNaN(Number(ms.value))) setDefaultMinStock(Number(ms.value));
        if (rq?.value != null && !Number.isNaN(Number(rq.value))) setDefaultReorderQty(Number(rq.value));
        
        // Charger les informations atelier
        setShopName(appSettings.shopName || "");
        setShopEmail(appSettings.shopEmail || "");
        setShopPhone(appSettings.shopPhone || "");
        setAddress1(appSettings.address1 || "");
        setZip(appSettings.zip || "");
        setCity(appSettings.city || "");
        setLegalFooter(appSettings.legalFooter || "");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await Promise.all([
        setSetting('pricing.defaultMultiplier', multiplier),
        setSetting('pricing.defaultVatRate', Math.max(0, Number(vatPercent) / 100)),
        setSetting('stock.defaultMin', Math.max(0, Math.floor(defaultMinStock))),
        setSetting('stock.defaultReorderQty', Math.max(0, Math.floor(defaultReorderQty))),
      ]);
      setToast({ open: true, message: 'Paramètres enregistrés', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: enregistrement', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function saveShopInfo() {
    setSavingShop(true);
    try {
      await updateAppSettings({
        shopName,
        shopEmail,
        shopPhone,
        address1,
        zip,
        city,
        legalFooter,
      });
      setToast({ open: true, message: 'Informations atelier enregistrées', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: enregistrement', severity: 'error' });
    } finally {
      setSavingShop(false);
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Paramètres" maxWidth="sm">
        <SectionCard title="Informations de l'atelier">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ces informations apparaîtront sur vos devis, factures et avoirs (PDF).
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Nom de l'atelier"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              disabled={loading}
              size="small"
              helperText="Ex: Atelier Vélo+"
            />
            <TextField
              label="Adresse"
              value={address1}
              onChange={(e) => setAddress1(e.target.value)}
              disabled={loading}
              size="small"
              helperText="Ex: 123 Rue de la République"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Code postal"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={loading}
                size="small"
                sx={{ width: 150 }}
              />
              <TextField
                label="Ville"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                size="small"
                sx={{ flex: 1 }}
              />
            </Stack>
            <TextField
              label="Téléphone"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value)}
              disabled={loading}
              size="small"
              helperText="Ex: 01 23 45 67 89"
            />
            <TextField
              label="Email"
              type="email"
              value={shopEmail}
              onChange={(e) => setShopEmail(e.target.value)}
              disabled={loading}
              size="small"
              helperText="Ex: contact@atelier-velo.fr"
            />
            <TextField
              label="Mention légale (pied de page)"
              value={legalFooter}
              onChange={(e) => setLegalFooter(e.target.value)}
              disabled={loading}
              size="small"
              multiline
              rows={2}
              helperText="Texte affiché en bas des documents PDF (SIRET, TVA, etc.)"
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={saveShopInfo} disabled={savingShop || loading}>
                {savingShop ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </Stack>
          </Stack>
        </SectionCard>
        <SectionCard title="Tarification">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Définissez vos paramètres par défaut pour les prix de vente.</Typography>
          <Stack spacing={2}>
            <TextField
              label="Multiplicateur par défaut (PV)"
              type="number"
              inputProps={{ step: '0.1' }}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              helperText="PV = Prix achat HT × multiplicateur"
              disabled={loading}
              size="small"
            />
            <TextField
              label="TVA par défaut (%)"
              type="number"
              inputProps={{ step: '1' }}
              value={vatPercent}
              onChange={(e) => setVatPercent(Number(e.target.value))}
              helperText="Stockée en décimal (ex: 20% → 0.20). Utilisée comme valeur par défaut lors de la création d'article."
              disabled={loading}
              size="small"
            />
          </Stack>
        </SectionCard>
        <SectionCard title="Stock">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Paramètres par défaut pour les nouveaux articles.</Typography>
          <Stack spacing={2}>
            <TextField
              label="Stock min par défaut"
              type="number"
              inputProps={{ step: '1' }}
              value={defaultMinStock}
              onChange={(e) => setDefaultMinStock(Number(e.target.value))}
              disabled={loading}
              size="small"
            />
            <TextField
              label="Qté de réassort par défaut"
              type="number"
              inputProps={{ step: '1' }}
              value={defaultReorderQty}
              onChange={(e) => setDefaultReorderQty(Number(e.target.value))}
              disabled={loading}
              size="small"
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={save} disabled={saving || loading}>Enregistrer</Button>
            </Stack>
          </Stack>
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
