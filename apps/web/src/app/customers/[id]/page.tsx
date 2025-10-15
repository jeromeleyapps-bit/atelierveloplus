"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Chip, Skeleton, Stack, Typography, TextField, Snackbar, Box, Container, Card, CardHeader, CardContent, Grid } from "@mui/material";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "../../components/RequireAuth";
import PageShell from "../../components/PageShell";
import SectionCard from "../../components/SectionCard";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PeopleIcon from "@mui/icons-material/People";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

type Customer = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  address1?: string | null;
  address2?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  shipAddress1?: string | null;
  shipAddress2?: string | null;
  shipZip?: string | null;
  shipCity?: string | null;
  shipCountry?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function CustomerDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = (params as any)?.id as string;
  const [row, setRow] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'load_failed');
        setRow(data as Customer);
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fullName = [row?.firstName, row?.lastName].filter(Boolean).join(' ');
  const shortId = row?.id ? row.id.slice(0, 5) : '';
  const nameSlug = fullName
    ? fullName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    : (row?.email?.split('@')[0] || 'client');
  const customerCode = nameSlug && shortId ? `${nameSlug}-id${shortId}` : (row?.id || '');

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
                    👤 {fullName || row?.email || 'Client'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Code: {customerCode}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => router.push('/customers')}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Retour
                </Button>
                {!edit && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => setEdit(true)}
                    sx={{
                      bgcolor: theme.primary,
                      '&:hover': { bgcolor: theme.primaryDark },
                    }}
                  >
                    Modifier
                  </Button>
                )}
              </Stack>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="xl">
        <SectionCard
          title={fullName || row?.email || row?.id || "Client"}
          icon={<PersonOutlineIcon color="primary" />}
          actions={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {edit ? (
                <>
                  <Button variant="outlined" color="inherit" onClick={() => { setEdit(false); setRow(row => row ? { ...row } : row); }}>Annuler</Button>
                  <Button variant="contained" disabled={saving} onClick={async () => {
                    if (!row) return;
                    setSaving(true);
                    try {
                      const payload = { ...row } as any;
                      const res = await fetch(`/api/customers/${row.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data?.error || 'update_failed');
                      setRow(data as Customer);
                      setEdit(false);
                      setToast({ open: true, message: 'Modifications enregistrées', severity: 'success' });
                    } catch (e) { console.error(e); setToast({ open: true, message: 'Erreur: mise à jour', severity: 'error' }); }
                    finally { setSaving(false); }
                  }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" component={Link} href={`/customers/${id}/bikes`}>Vélos</Button>
                  <Button variant="outlined" onClick={() => setEdit(true)}>Modifier</Button>
                  <Button variant="outlined" component={Link} href="/customers">Fermer</Button>
                </>
              )}
            </Stack>
          }
        >
          {loading && (
            <Stack spacing={1}>
              <Skeleton width={180} />
              <Skeleton width={240} />
              <Skeleton width={320} />
            </Stack>
          )}
          {!loading && error && (
            <Alert severity="error">Erreur: {error}</Alert>
          )}
          {!loading && row && (
            <Stack spacing={2}>
              <Typography variant="body2"><b>Code client:</b> {customerCode}</Typography>
              {edit ? (
                <Stack spacing={2}>
                  <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                    <TextField size="small" label="Email" value={row.email || ''} onChange={e => setRow(r => r ? { ...r, email: e.target.value } : r)} />
                    <TextField size="small" label="Prénom" value={row.firstName || ''} onChange={e => setRow(r => r ? { ...r, firstName: e.target.value } : r)} />
                    <TextField size="small" label="Nom" value={row.lastName || ''} onChange={e => setRow(r => r ? { ...r, lastName: e.target.value } : r)} />
                    <TextField size="small" label="Téléphone" value={row.phone || ''} onChange={e => setRow(r => r ? { ...r, phone: e.target.value } : r)} />
                  </Stack>
                  <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                    <TextField size="small" label="Adresse" value={row.address1 || ''} onChange={e => setRow(r => r ? { ...r, address1: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="Complément" value={row.address2 || ''} onChange={e => setRow(r => r ? { ...r, address2: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="CP" value={row.zip || ''} onChange={e => setRow(r => r ? { ...r, zip: e.target.value } : r)} sx={{ width: 140 }} />
                    <TextField size="small" label="Ville" value={row.city || ''} onChange={e => setRow(r => r ? { ...r, city: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="Pays" value={row.country || ''} onChange={e => setRow(r => r ? { ...r, country: e.target.value } : r)} sx={{ width: 180 }} />
                  </Stack>
                  <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
                    <TextField size="small" label="Adresse livraison" value={row.shipAddress1 || ''} onChange={e => setRow(r => r ? { ...r, shipAddress1: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="Complément livraison" value={row.shipAddress2 || ''} onChange={e => setRow(r => r ? { ...r, shipAddress2: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="CP livraison" value={row.shipZip || ''} onChange={e => setRow(r => r ? { ...r, shipZip: e.target.value } : r)} sx={{ width: 140 }} />
                    <TextField size="small" label="Ville livraison" value={row.shipCity || ''} onChange={e => setRow(r => r ? { ...r, shipCity: e.target.value } : r)} sx={{ flex: 1 }} />
                    <TextField size="small" label="Pays livraison" value={row.shipCountry || ''} onChange={e => setRow(r => r ? { ...r, shipCountry: e.target.value } : r)} sx={{ width: 180 }} />
                  </Stack>
                  <TextField size="small" label="Notes" value={row.notes || ''} onChange={e => setRow(r => r ? { ...r, notes: e.target.value } : r)} multiline minRows={2} />
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {row.email && <Typography variant="body2"><b>Email:</b> {row.email}</Typography>}
                  {row.phone && <Typography variant="body2"><b>Téléphone:</b> {row.phone}</Typography>}
                  {(row.address1 || row.address2 || row.zip || row.city || row.country) && (
                    <Typography variant="body2">
                      <b>Adresse:</b> {[row.address1, row.address2, row.zip, row.city, row.country].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {(row.shipAddress1 || row.shipAddress2 || row.shipZip || row.shipCity || row.shipCountry) && (
                    <Typography variant="body2">
                      <b>Adresse de livraison:</b> {[row.shipAddress1, row.shipAddress2, row.shipZip, row.shipCity, row.shipCountry].filter(Boolean).join(', ')}
                    </Typography>
                  )}
                  {row.notes && <Typography variant="body2"><b>Notes:</b> {row.notes}</Typography>}
                </Stack>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Chip size="small" label={`Créé le ${new Date(row.createdAt).toLocaleString()}`} />
                <Chip size="small" label={`Maj le ${new Date(row.updatedAt).toLocaleString()}`} />
              </Stack>
            </Stack>
          )}
        </SectionCard>
        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast(t => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))}>{toast.message}</Alert>
        </Snackbar>
        </Container>
      </Box>
    </RequireAuth>
  );
}
