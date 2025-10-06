"use client";

import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import KeyIcon from "@mui/icons-material/Key";
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import { createSupplier, getSupplierCredentials, listSuppliers, saveSupplierCredentials, type Supplier } from "@/lib/api";

export default function SuppliersPage() {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  // Create supplier dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [connectorType, setConnectorType] = useState("MOCK");
  const [savingCreate, setSavingCreate] = useState(false);
  const [cUsername, setCUsername] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cExtraJson, setCExtraJson] = useState("");

  // Credentials dialog
  const [credOpen, setCredOpen] = useState(false);
  const [credSupplier, setCredSupplier] = useState<Supplier | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [extraJson, setExtraJson] = useState("");
  const [savingCred, setSavingCred] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const s = await listSuppliers();
      setRows(s);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: chargement fournisseurs", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function openCreate() {
    setName(""); setWebsite(""); setConnectorType("MOCK");
    setCUsername(""); setCPassword("");
    setCExtraJson("");
    setCreateOpen(true);
  }
  async function saveCreate() {
    setSavingCreate(true);
    try {
      if (!name.trim()) throw new Error("Nom requis");
      await createSupplier({ name, website: website || undefined, connectorType, username: cUsername || undefined, password: cPassword || undefined, extraJson: cExtraJson || undefined });
      setToast({ open: true, message: "Fournisseur créé", severity: "success" });
      setCreateOpen(false);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: création fournisseur", severity: "error" });
    } finally {
      setSavingCreate(false);
    }
  }

  async function openCredentials(sup: Supplier) {
    try {
      const c = await getSupplierCredentials(sup.id);
      setCredSupplier(sup);
      setUsername((c.username as any) || "");
      setPassword((c.password as any) || "");
      const existingExtra = (c.extraJson as any) || "";
      if (existingExtra && String(existingExtra).trim()) {
        setExtraJson(String(existingExtra));
      } else {
        // Prefill defaults based on connector type
        let def: any = { timeoutMs: 12000, retries: 1, debug: false };
        if (sup.connectorType === 'FOURMYBIKE') {
          def = {
            loginUrl: "https://4mybike.de/account/login",
            loginUserField: "login[username]",
            loginPassField: "login[password]",
            searchUrl: "https://4mybike.de/search",
            skuParam: "q",
            priceRegex: "\\b(\\\\d+[,.]\\\\d{2})\\\\s*€",
            availabilityRegex: "(En stock|Disponible|Rupture|Sous\\\\s*\\\\d+\\\\s*j)",
            timeoutMs: 12000,
            retries: 1,
            debug: false
          };
        } else if (sup.connectorType === 'RCZBIKESHOP') {
          def = {
            loginUrl: "https://www.rczbikeshop.com/en/customer/account/login/",
            loginUserField: "login[username]",
            loginPassField: "login[password]",
            searchUrl: "https://www.rczbikeshop.com/en/catalogsearch/result/",
            skuParam: "q",
            priceRegex: "\\b(\\\\d+[,.]\\\\d{2})\\\\s*€",
            availabilityRegex: "(In Stock|Available|Out of stock|Ships\\\\s*in\\\\s*\\\\d+\\\\s*day)",
            timeoutMs: 12000,
            retries: 1,
            debug: false
          };
        }
        setExtraJson(JSON.stringify(def, null, 2));
      }
      setCredOpen(true);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: chargement identifiants", severity: "error" });
    }
  }
  async function saveCredentials() {
    if (!credSupplier) return;
    setSavingCred(true);
    try {
      await saveSupplierCredentials(credSupplier.id, {
        username: username || undefined,
        password: password || undefined,
        extraJson: extraJson || undefined,
      });
      setToast({ open: true, message: "Identifiants enregistrés", severity: "success" });
      setCredOpen(false);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: enregistrement identifiants", severity: "error" });
    } finally {
      setSavingCred(false);
    }
  }

  async function onDeleteSupplier(id: string) {
    const ok = window.confirm('Supprimer ce fournisseur ? Les références et identifiants liés seront supprimés.');
    if (!ok) return;
    try {
      await (await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })).json();
      setToast({ open: true, message: 'Fournisseur supprimé', severity: 'success' });
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: suppression fournisseur', severity: 'error' });
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Fournisseurs" maxWidth="md">
        <SectionCard title="Annuaire fournisseurs" actions={<Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>Nouveau fournisseur</Button>}>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Site web</TableCell>
                  <TableCell>Connecteur</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.website || "—"}</TableCell>
                    <TableCell>{s.connectorType}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                        <span>
                          <IconButton size="small" component="a" href={s.website || undefined} target="_blank" rel="noopener noreferrer" disabled={!s.website} aria-label="Site web du fournisseur">
                            <PublicIcon fontSize="small" />
                          </IconButton>
                        </span>
                        <Button size="small" startIcon={<KeyIcon />} variant="outlined" onClick={() => openCredentials(s)}>Identifiants</Button>
                        <Button size="small" color="error" variant="outlined" onClick={() => onDeleteSupplier(s.id)}>Supprimer</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && !loading && (
                  <TableRow><TableCell colSpan={4}><Typography align="center" color="text.secondary">Aucun fournisseur</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        {/* Dialog Create Supplier */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" label="Nom" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <TextField size="small" label="Site web" value={website} onChange={(e) => setWebsite(e.target.value)} />
              <TextField size="small" label="Connecteur" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} value={connectorType} onChange={(e) => setConnectorType(e.target.value)}>
                <option value="MOCK">MOCK</option>
                <option value="FOURMYBIKE">4mybike</option>
                <option value="RCZBIKESHOP">RCZ Bike Shop</option>
              </TextField>
              <TextField size="small" label="Login (optionnel)" value={cUsername} onChange={(e) => setCUsername(e.target.value)} />
              <TextField size="small" label="Mot de passe (optionnel)" type="password" value={cPassword} onChange={(e) => setCPassword(e.target.value)} />
              <TextField size="small" label="Paramètres (JSON) optionnels" multiline minRows={2} value={cExtraJson} onChange={(e) => setCExtraJson(e.target.value)} helperText="Laisse vide ou colle un JSON de configuration connecteur." />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={saveCreate} disabled={savingCreate}>Créer</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Credentials */}
        <Dialog open={credOpen} onClose={() => setCredOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Identifiants — {credSupplier?.name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" label="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} />
              <TextField size="small" label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <TextField size="small" label="Paramètres (JSON)" multiline minRows={2} value={extraJson} onChange={(e) => setExtraJson(e.target.value)} helperText="Clés supplémentaires pour le connecteur (ex: entrepôt, pays)" />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCredOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={saveCredentials} disabled={savingCred}>Enregistrer</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
