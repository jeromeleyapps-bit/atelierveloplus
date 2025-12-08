"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from "@mui/icons-material/Add";
import KeyIcon from "@mui/icons-material/Key";
import PublicIcon from "@mui/icons-material/Public";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RequireAuth from "../components/RequireAuth";

import SectionCard from "../components/SectionCard";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import BusinessIcon from "@mui/icons-material/Business";
import RefreshIcon from "@mui/icons-material/Refresh";
import { createSupplier, getSupplierCredentials, listSuppliers, saveSupplierCredentials, deleteSupplier, type Supplier } from "@/lib/api";
import { logger } from '@/lib/logger';

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  
  // TanStack Query pour la liste des fournisseurs
  const { 
    data: rows = [], 
    isLoading: loading,
    refetch: refresh 
  } = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  
  // Mutation créer fournisseur
  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setToast({ open: true, message: "Fournisseur créé", severity: "success" });
      setCreateOpen(false);
      setName("");
      setWebsite("");
      setConnectorType("MOCK");
      setCUsername("");
      setCPassword("");
      setCExtraJson("");
    },
    onError: (error: Error) => {
      setToast({ open: true, message: `Erreur: ${error.message}`, severity: 'error' });
    },
  });
  
  // Mutation supprimer fournisseur
  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setToast({ open: true, message: 'Fournisseur supprimé', severity: 'success' });
    },
    onError: () => {
      setToast({ open: true, message: 'Erreur suppression', severity: 'error' });
    },
  });

  // Create supplier dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [connectorType, setConnectorType] = useState("MOCK");
  const [_savingCreate, _setSavingCreate] = useState(false);
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

  // Normaliser une URL en absolu (ajoute https:// si manquant)
  function toAbsoluteUrl(u?: string | null): string | undefined {
    if (!u) return undefined;
    const s = String(u).trim();
    if (!s) return undefined;
    if (/^https?:\/\//i.test(s)) return s; // déjà absolu
    return `https://${s}`;
  }

  function openCreate() {
    setName(""); setWebsite(""); setConnectorType("MOCK");
    setCUsername(""); setCPassword("");
    setCExtraJson("");
    setCreateOpen(true);
  }
  function saveCreate() {
    if (!name.trim()) {
      setToast({ open: true, message: "Nom requis", severity: "error" });
      return;
    }
    createMutation.mutate({ 
      name, 
      website: website || undefined, 
      connectorType, 
      username: cUsername || undefined, 
      password: cPassword || undefined, 
      extraJson: cExtraJson || undefined 
    });
  }

  async function openCredentials(sup: Supplier) {
    try {
      const c = await getSupplierCredentials(sup.id);
      setCredSupplier(sup);
      setUsername((c.username as string | null) || "");
      setPassword((c.password as string | null) || "");
      const existingExtra = (c.extraJson as string | null) || "";
      if (existingExtra && String(existingExtra).trim()) {
        setExtraJson(String(existingExtra));
      } else {
        // Prefill defaults based on connector type
        let def: unknown = { timeoutMs: 12000, retries: 1, debug: false };
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
      logger.error(e);
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
      logger.error(e);
      setToast({ open: true, message: "Erreur: enregistrement identifiants", severity: "error" });
    } finally {
      setSavingCred(false);
    }
  }

  function onDeleteSupplier(id: string) {
    const ok = window.confirm('Supprimer ce fournisseur ? Les références et identifiants liés seront supprimés.');
    if (!ok) return;
    deleteMutation.mutate(id);
  }

  // Thème marron pour fournisseurs (harmonisé avec catalogue)
  const theme = {
    bg: '#F5F5DC',
    border: '#8b7355',
    text: '#5d4037',
    primary: '#8b7355',
    primaryDark: '#6d5d4b',
    primaryLight: '#F5F5DC',
  };

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Marron */}
        <Box
          sx={{
            bgcolor: theme.bg,
            borderBottom: 2,
            borderColor: theme.border,
            py: 3,
            mb: 3,
          }}
        >
          <ResponsiveContainer>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <BusinessIcon sx={{ fontSize: 40, color: theme.text }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                    🏭 Fournisseurs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion des partenaires et connexions
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => window.location.href = '/catalog'}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Retour Catalogue
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => refresh()}
                  disabled={loading}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Actualiser
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                  sx={{
                    bgcolor: theme.primary,
                    '&:hover': { bgcolor: theme.primaryDark },
                  }}
                >
                  Nouveau
                </Button>
              </Stack>
            </Stack>
          </ResponsiveContainer>
        </Box>
        <ResponsiveContainer>
        <SectionCard title="Annuaire fournisseurs">
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
                          <IconButton size="small" component="a" href={toAbsoluteUrl(s.website)} target="_blank" rel="noopener noreferrer" disabled={!s.website} aria-label="Site web du fournisseur">
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
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth disableEnforceFocus>
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
            <Button variant="contained" onClick={saveCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Credentials */}
        <Dialog open={credOpen} onClose={() => setCredOpen(false)} maxWidth="sm" fullWidth disableEnforceFocus>
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
        </ResponsiveContainer>
      </Box>
    </RequireAuth>
  );
}
