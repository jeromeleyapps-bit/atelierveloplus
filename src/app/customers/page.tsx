"use client";

import { useState, useRef } from "react"
import { generateShortId } from "@/lib/short-id";
// ✅ Hooks personnalisés
import { useCustomersData } from '@/hooks/useCustomersData';
import { useCustomersUI } from '@/hooks/useCustomersUI';
import { useCustomersMutations } from '@/hooks/useCustomersMutations';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Link from "next/link";
import { listCustomerBikes, saveCustomerBike, deleteCustomerBike, type Customer } from "@/lib/api";
import RequireAuth from "../components/RequireAuth";
import SectionCard from "../components/SectionCard";
import Container from "@mui/material/Container";
import PeopleIcon from "@mui/icons-material/People";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import ListAltIcon from "@mui/icons-material/ListAlt";
import EditIcon from "@mui/icons-material/Edit";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import DeleteIcon from "@mui/icons-material/Delete";
import Checkbox from "@mui/material/Checkbox";
import { logger } from '@/lib/logger';

export default function CustomersPage() {
  // ✅ Hooks personnalisés (remplacent états data + mutations)
  const customersData = useCustomersData();
  const customersUI = useCustomersUI();
  const customersMutations = useCustomersMutations({
    onSuccess: customersUI.showToast,
    onError: customersUI.showToast,
  });

  // Utilisation des valeurs des hooks
  const items = customersData.items;
  const loading = customersData.isLoading;
  const searchQuery = customersData.searchQuery;
  const setSearchQuery = customersData.setSearchQuery;
  const selected = customersData.selected;
  const setSelected = customersData.setSelected;
  const refresh = customersData.refetch;
  const toast = customersUI.toast;
  const setToast = customersUI.setToast;
  
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [notes, setNotes] = useState("");
  const [_bikeBrand, setBikeBrand] = useState("");
  const [_bikeModel, setBikeModel] = useState("");
  const [_nationalFileId, setNationalFileId] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [eEmail, setEEmail] = useState("");
  const [eFirstName, setEFirstName] = useState("");
  const [eLastName, setELastName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eAddress1, setEAddress1] = useState("");
  const [eAddress2, setEAddress2] = useState("");
  const [eZip, setEZip] = useState("");
  const [eCity, setECity] = useState("");
  const [eCountry, setECountry] = useState("");
  const [eNotes, setENotes] = useState("");
  const [eBikeBrand, setEBikeBrand] = useState("");
  const [eBikeModel, setEBikeModel] = useState("");
  const [eNationalFileId, setENationalFileId] = useState("");

  // Bikes editing (Vélo 1..5)
  const [bikeForms, setBikeForms] = useState<Array<{ brand: string; model: string; nationalFileId: string; serialNumber: string; color: string; notes: string; exists: boolean }>>([
    { brand: "", model: "", nationalFileId: "", serialNumber: "", color: "", notes: "", exists: false },
    { brand: "", model: "", nationalFileId: "", serialNumber: "", color: "", notes: "", exists: false },
    { brand: "", model: "", nationalFileId: "", serialNumber: "", color: "", notes: "", exists: false },
    { brand: "", model: "", nationalFileId: "", serialNumber: "", color: "", notes: "", exists: false },
    { brand: "", model: "", nationalFileId: "", serialNumber: "", color: "", notes: "", exists: false },
  ]);

  function openEdit(c: Customer) {
    setEditing(c);
    setEEmail(c.email || "");
    setEFirstName(c.firstName || "");
    setELastName(c.lastName || "");
    setEPhone(c.phone || "");
    setEAddress1(c.address1 || "");
    setEAddress2(c.address2 || "");
    setEZip(c.zip || "");
    setECity(c.city || "");
    setECountry(c.country || "");
    setENotes(c.notes || "");
    setEBikeBrand((c as { bikeBrand?: string })?.bikeBrand || "");
    setEBikeModel((c as { bikeModel?: string })?.bikeModel || "");
    setENationalFileId((c as { nationalFileId?: string })?.nationalFileId || "");
    // Load bikes
    (async () => {
      try {
        const bikes = await listCustomerBikes(c.id);
        const next = [0,1,2,3,4].map((i) => {
          const b = bikes.find(bb => bb.index === i+1);
          return {
            brand: (b?.brand as string) || "",
            model: (b?.model as string) || "",
            nationalFileId: (b?.nationalFileId as string) || "",
            serialNumber: (b?.serialNumber as string) || "",
            color: (b?.color as string) || "",
            notes: (b?.notes as string) || "",
            exists: !!b,
          };
        });
        setBikeForms(next);
      } catch (e) { logger.error(e); }
      setEditOpen(true);
    })();
  }

  async function saveEdit() {
    if (!editing) return;
    setSubmitting(true);
    try {
      const payload: unknown = {
        email: eEmail || null,
        firstName: eFirstName || null,
        lastName: eLastName || null,
        phone: ePhone || null,
        address1: eAddress1 || null,
        address2: eAddress2 || null,
        zip: eZip || null,
        city: eCity || null,
        country: eCountry || null,
        notes: eNotes || null,
        bikeBrand: eBikeBrand || null,
        bikeModel: eBikeModel || null,
        nationalFileId: eNationalFileId || null,
      };
      customersMutations.update(editing.id, payload);
      setEditOpen(false);
      setEditing(null);
    } finally {
      setSubmitting(false);
    }
  }

  // Import/Export CSV
  const fileRef = useRef<HTMLInputElement | null>(null);
  async function onExportCsv() {
    try {
      const res = await fetch('/api/customers/export');
      if (!res.ok) { logger.error(await res.text()); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { logger.error(e); }
  }
  async function onImportCsv(file: File) {
    try {
      const text = await file.text();
      const res = await fetch('/api/customers/import', { method: 'POST', headers: { 'Content-Type': 'text/csv;charset=utf-8' }, body: text });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        logger.error(data);
        customersUI.showToast('Erreur import CSV', 'error');
        return;
      }
      refresh(); // Refetch from hook
      customersUI.showToast(`Import terminé (${data.imported ?? '?'})`, 'success');
    } catch (e) {
      logger.error(e);
      customersUI.showToast('Erreur import CSV', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelected(filtered.map(c => c.id));
    } else {
      setSelected([]);
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter(s => s !== id));
    }
  }

  async function handleDeleteSelected() {
    if (selected.length === 0) return;
    if (!confirm(`Supprimer ${selected.length} client(s) ?`)) return;
    
    customersMutations.bulkDelete(selected);
    setSelected([]);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      customersMutations.create({
        email: email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        address1: address1 || undefined,
        address2: address2 || undefined,
        zip: zip || undefined,
        city: city || undefined,
        country: country || undefined,
        notes: notes || undefined,
      } as unknown);
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setAddress1("");
      setAddress2("");
      setZip("");
      setCity("");
      setCountry("");
      setBikeBrand("");
      setBikeModel("");
      setNationalFileId("");
      setNotes("");
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = items.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const firstName = (c.firstName || "").toLowerCase();
    const lastName = (c.lastName || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    return firstName.includes(query) || lastName.includes(query) || email.includes(query);
  });

  // Thème rose pour clients
  const theme = {
    bg: '#FCE4EC',
    border: '#EC407A',
    text: '#C2185B',
    primary: '#EC407A',
    primaryDark: '#D81B60',
    primaryLight: '#FCE4EC',
  };

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Rose */}
        <Box
          sx={{
            bgcolor: theme.bg,
            borderBottom: 2,
            borderColor: theme.border,
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PeopleIcon sx={{ fontSize: 40, color: theme.text }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                    👥 Clients
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion de la clientèle
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
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
              </Stack>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="xl">
        <SectionCard title="Créer un client" icon={<PersonAddAlt1Icon color="primary" />} actions={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
            <Button variant="outlined" onClick={onExportCsv}>Exporter CSV</Button>
            <Button variant="outlined" component="label">Importer CSV
              <input ref={fileRef} type="file" accept=".csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImportCsv(f); }} />
            </Button>
          </Stack>
        }>
          <form onSubmit={onCreate}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                <TextField label="Email" size="small" value={email} onChange={(e) => setEmail(e.target.value)} />
                <TextField label="Prénom" size="small" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <TextField label="Nom" size="small" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                <TextField label="Téléphone" size="small" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                <TextField label="Adresse" size="small" value={address1} onChange={(e) => setAddress1(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Complément" size="small" value={address2} onChange={(e) => setAddress2(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Code postal" size="small" value={zip} onChange={(e) => setZip(e.target.value)} sx={{ width: 160 }} />
                <TextField label="Ville" size="small" value={city} onChange={(e) => setCity(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Pays" size="small" value={country} onChange={(e) => setCountry(e.target.value)} sx={{ width: 200 }} />
              </Stack>
              <TextField label="Notes" size="small" value={notes} onChange={(e) => setNotes(e.target.value)} multiline minRows={2} />
              {/* Champs vélo déplacés vers la section "Vélos du client" dans la modale d'édition */}
              <Stack direction="row" spacing={2}>
                <Button type="submit" variant="contained" disabled={submitting} sx={{ whiteSpace: 'nowrap' }}>
                  {submitting ? "Création..." : "Créer"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </SectionCard>

        <SectionCard title="Liste des clients" icon={<ListAltIcon color="primary" />}>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              {selected.length > 0 && (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleDeleteSelected}
                  disabled={submitting}
                >
                  Supprimer ({selected.length})
                </Button>
              )}
              <TextField
                label="Rechercher par nom ou prénom"
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez un nom ou prénom..."
              />
              {searchQuery && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSearchQuery("")}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  Effacer
                </Button>
              )}
            </Stack>
          </Box>
          <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    indeterminate={selected.length > 0 && selected.length < filtered.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sx={{ width: 100 }}>ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Adresse</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Vélos</TableCell>
                <TableCell>Créé le</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ '& tr:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
              {loading && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton width={160} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={180} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={140} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={120} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={160} />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!loading && filtered.map((c) => (
                <TableRow key={c.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(c.id)}
                        onChange={(e) => handleSelectOne(c.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={c.id}>
                        <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main' }}>
                          {generateShortId('CLI', c.id)}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {c.email ? (
                          <Link href={`/customers/${c.id}`}>{c.email}</Link>
                        ) : (
                          "-"
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {[c.lastName?.toUpperCase(), c.firstName].filter(Boolean).join(" ") || "-"}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {(() => {
                          const parts = [c.address1, [c.zip, c.city].filter(Boolean).join(" "), c.country].filter(Boolean);
                          return parts.length ? parts.join(" · ") : "-";
                        })()}
                      </Box>
                    </TableCell>
                    <TableCell>{c.phone || "-"}</TableCell>
                    <TableCell>{c.bikesCount ?? 0}</TableCell>
                    <TableCell>
                      <span suppressHydrationWarning>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Link href={`/customers/${c.id}/bikes`} aria-label="Vélos">
                          <IconButton size="small">
                            <DirectionsBikeIcon 
                              fontSize="small" 
                              sx={{ 
                                color: (c.bikesCount ?? 0) > 0 ? 'success.main' : 'action.disabled' 
                              }} 
                            />
                          </IconButton>
                        </Link>
                        <IconButton size="small" aria-label="Modifier" onClick={() => openEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>Aucun client</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableContainer>
        </SectionCard>
        {/* Edit Customer Dialog */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Modifier le client</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                <TextField label="Email" size="small" value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
                <TextField label="Prénom" size="small" value={eFirstName} onChange={(e) => setEFirstName(e.target.value)} />
                <TextField label="Nom" size="small" value={eLastName} onChange={(e) => setELastName(e.target.value)} />
                <TextField label="Téléphone" size="small" value={ePhone} onChange={(e) => setEPhone(e.target.value)} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                <TextField label="Adresse" size="small" value={eAddress1} onChange={(e) => setEAddress1(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Complément" size="small" value={eAddress2} onChange={(e) => setEAddress2(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Code postal" size="small" value={eZip} onChange={(e) => setEZip(e.target.value)} sx={{ width: 160 }} />
                <TextField label="Ville" size="small" value={eCity} onChange={(e) => setECity(e.target.value)} sx={{ flex: 1 }} />
                <TextField label="Pays" size="small" value={eCountry} onChange={(e) => setECountry(e.target.value)} sx={{ width: 200 }} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                <TextField label="Marque du vélo (optionnel)" size="small" value={eBikeBrand} onChange={(e) => setEBikeBrand(e.target.value)} />
                <TextField label="Modèle (optionnel)" size="small" value={eBikeModel} onChange={(e) => setEBikeModel(e.target.value)} />
                <TextField label="ID fichier national (optionnel)" size="small" value={eNationalFileId} onChange={(e) => setENationalFileId(e.target.value)} />
              </Stack>
              <TextField label="Notes" size="small" value={eNotes} onChange={(e) => setENotes(e.target.value)} multiline minRows={2} />

              <Divider />
              <Typography variant="subtitle1">Vélos du client</Typography>
              {[0,1,2,3,4].map((i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1 }}>
                  <Stack spacing={1}>
                    <Typography variant="body2"><strong>Vélo {i+1}</strong></Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                      <TextField size="small" label="Marque" value={bikeForms[i]?.brand || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], brand: e.target.value }; return n; })} />
                      <TextField size="small" label="Modèle" value={bikeForms[i]?.model || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], model: e.target.value }; return n; })} />
                      <TextField size="small" label="ID fichier national" value={bikeForms[i]?.nationalFileId || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], nationalFileId: e.target.value }; return n; })} />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
                      <TextField size="small" label="N° série" value={bikeForms[i]?.serialNumber || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], serialNumber: e.target.value }; return n; })} />
                      <TextField size="small" label="Couleur" value={bikeForms[i]?.color || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], color: e.target.value }; return n; })} />
                    </Stack>
                    <TextField size="small" label="Notes vélo" value={bikeForms[i]?.notes || ''} onChange={(e) => setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], notes: e.target.value }; return n; })} multiline minRows={2} />
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" onClick={async () => {
                        if (!editing) return;
                        const bf = bikeForms[i];
                        try {
                          await saveCustomerBike(editing.id, (i+1) as 1|2|3|4|5, {
                            brand: bf.brand || undefined,
                            model: bf.model || undefined,
                            nationalFileId: bf.nationalFileId || undefined,
                            serialNumber: bf.serialNumber || undefined,
                            color: bf.color || undefined,
                            notes: bf.notes || undefined,
                          });
                          setBikeForms(f => { const n=[...f]; n[i] = { ...n[i], exists: true }; return n; });
                          setToast({ open: true, message: `Vélo ${i+1} enregistré`, severity: 'success' });
                        } catch (e) {
                          logger.error(e);
                          setToast({ open: true, message: `Erreur: enregistrement vélo ${i+1}`, severity: 'error' });
                        }
                      }}>Enregistrer vélo {i+1}</Button>
                      <Button size="small" color="error" variant="outlined" disabled={!bikeForms[i]?.exists} onClick={async () => {
                        if (!editing) return;
                        try {
                          await deleteCustomerBike(editing.id, (i+1) as 1|2|3|4|5);
                          setBikeForms(f => { const n=[...f]; n[i] = { brand: '', model: '', nationalFileId: '', serialNumber: '', color: '', notes: '', exists: false }; return n; });
                          setToast({ open: true, message: `Vélo ${i+1} supprimé`, severity: 'success' });
                        } catch (e) {
                          logger.error(e);
                          setToast({ open: true, message: `Erreur: suppression vélo ${i+1}`, severity: 'error' });
                        }
                      }}>Supprimer vélo {i+1}</Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={saveEdit} disabled={submitting}>Enregistrer</Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast((t) => ({ ...t, open: false }))}
            severity={toast.severity}
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
        </Container>
      </Box>
    </RequireAuth>
  );
}
