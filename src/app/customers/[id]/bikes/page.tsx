"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BuildIcon from "@mui/icons-material/Build";
import { DataGrid, type GridColDef, type GridRenderCellParams } from "@mui/x-data-grid";
import { z } from "zod";
import { logger } from '@/lib/logger';
import {
  Customer,
  CustomerBike,
  createCustomerBike,
  deleteCustomerBikeById,
  getCustomer,
  listCustomerBikes,
  updateCustomerBike,
  createWorkOrder,
} from "@/lib/api";

export default function CustomerBikesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const customerId = params?.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [rows, setRows] = useState<CustomerBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerBike | null>(null);
  const [form, setForm] = useState({ brand: "", model: "", serialNumber: "", color: "", nationalFileId: "", notes: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const formSchema = z.object({
    brand: z.string().trim().optional().nullable(),
    model: z.string().trim().optional().nullable(),
    serialNumber: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
    nationalFileId: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  });

  const title = useMemo(() => {
    const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ");
    return name ? `Vélos de ${name}` : "Vélos du client";
  }, [customer]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [cust, bikes] = await Promise.all([
        getCustomer(customerId),
        listCustomerBikes(customerId),
      ]);
      setCustomer(cust);
      // Sort A->Z by brand then model (case-insensitive)
      const sorted = [...bikes].sort((a, b) => {
        const ka = `${a.brand || ''}`.toLowerCase();
        const kb = `${b.brand || ''}`.toLowerCase();
        if (ka < kb) return -1; if (ka > kb) return 1;
        const ma = `${a.model || ''}`.toLowerCase();
        const mb = `${b.model || ''}`.toLowerCase();
        if (ma < mb) return -1; if (ma > mb) return 1;
        return 0;
      });
      setRows(sorted);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur de chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function openCreate() {
    if (rows.length >= 5) {
      alert("Limite de 5 vélos par client atteinte.");
      return;
    }
    setEditing(null);
    setForm({ brand: "", model: "", serialNumber: "", color: "", nationalFileId: "", notes: "" });
    setDialogOpen(true);
  }
  function openEdit(bike: CustomerBike) {
    setEditing(bike);
    setForm({
      brand: bike.brand || "",
      model: bike.model || "",
      serialNumber: bike.serialNumber || "",
      color: bike.color || "",
      nationalFileId: bike.nationalFileId || "",
      notes: bike.notes || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      setFormErrors({});
      if (!editing && rows.length >= 5) {
        alert("Limite de 5 vélos par client atteinte.");
        return;
      }
      
      // Validation: au moins marque OU modèle requis
      const brandFilled = form.brand?.toString().trim();
      const modelFilled = form.model?.toString().trim();
      
      if (!brandFilled && !modelFilled) {
        setFormErrors({
          brand: "Marque ou modèle requis",
          model: "Marque ou modèle requis"
        });
        alert("Veuillez renseigner au moins la marque ou le modèle du vélo.");
        return;
      }
      
      const parsed = formSchema.safeParse(Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v?.toString().trim() ? v : null])));
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => { if (i.path[0]) errs[String(i.path[0])] = i.message; });
        setFormErrors(errs);
        return;
      }
      const payload = parsed.data as Record<string, unknown>;
      if (editing) {
        await updateCustomerBike(customerId, editing.id, payload);
      } else {
        await createCustomerBike(customerId, payload);
      }
      setDialogOpen(false);
      await refresh();
    } catch (e) {
      logger.error('[CustomerBikes] Erreur enregistrement:', {
        error: e,
        message: e instanceof Error ? e.message : 'unknown',
        customerId,
        editing: !!editing,
        payload: editing ? { id: editing.id } : 'new',
      });
      
      // Message utilisateur plus détaillé
      let errorMsg = "Erreur lors de l'enregistrement";
      if (e instanceof Error) {
        errorMsg = e.message;
      } else if (typeof e === 'object' && e !== null && 'error' in e) {
        errorMsg = String((e as { error: unknown }).error);
      }
      alert(`Impossible d'enregistrer le vélo: ${errorMsg}\n\nVérifiez que tous les champs requis sont remplis.`);
      
      // Afficher erreurs validation si disponibles (Zod errors)
      if (typeof e === 'object' && e !== null && 'issues' in e && Array.isArray((e as { issues: unknown }).issues)) {
        const validationErrors: Record<string, string> = {};
        const issues = (e as { issues: Array<{ path: unknown[]; message: string }> }).issues;
        issues.forEach((issue) => {
          validationErrors[String(issue.path[0])] = issue.message;
        });
        setFormErrors(validationErrors);
      }
    }
  }

  async function handleDelete(bike: CustomerBike) {
    if (!confirm("Supprimer ce vélo ?")) return;
    try {
      await deleteCustomerBikeById(customerId, bike.id);
      await refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de la suppression";
      alert(message);
    }
  }

  async function handleCreateWO(bike: CustomerBike) {
    try {
      const wo = await createWorkOrder({ customerId, bikeId: bike.id });
      // Option: naviguer vers une page OR si existante, sinon toast
      // router.push(`/workorders/${wo.id}`);
      // Pour l'instant, toast simple:
      alert(`Ordre de réparation créé: ${wo.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur lors de la création de l'OR";
      alert(message);
    }
  }

  const columns: GridColDef[] = [
    { 
      field: 'index', 
      headerName: '#', 
      width: 60, 
      sortable: true,
      headerAlign: 'center',
      align: 'center',
    },
    { 
      field: 'brand', 
      headerName: 'Marque', 
      minWidth: 120,
      flex: 1,
      valueGetter: (p) => p.row.brand || '-',
      cellClassName: 'font-medium',
    },
    { 
      field: 'model', 
      headerName: 'Modèle', 
      minWidth: 120,
      flex: 1,
      valueGetter: (p) => p.row.model || '-',
    },
    { 
      field: 'serialNumber', 
      headerName: 'N° série', 
      minWidth: 140,
      flex: 1,
      valueGetter: (p) => p.row.serialNumber || '-',
    },
    { 
      field: 'color', 
      headerName: 'Couleur', 
      width: 110,
      valueGetter: (p) => p.row.color || '-',
    },
    { 
      field: 'nationalFileId', 
      headerName: 'Fichier National', 
      minWidth: 140,
      flex: 0.8,
      valueGetter: (p) => p.row.nationalFileId || '-',
    },
    {
      field: 'createdAt', 
      headerName: 'Créé le', 
      width: 160, 
      valueGetter: (p) => new Date(p.row.createdAt).toLocaleDateString('fr-FR'),
    },
    {
      field: 'actions', 
      headerName: 'Actions', 
      width: 140, 
      sortable: false, 
      filterable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams<CustomerBike>) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={() => openEdit(params.row)} aria-label="Modifier" sx={{ color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleDelete(params.row)} aria-label="Supprimer" sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => handleCreateWO(params.row)} aria-label="Créer OR" sx={{ color: 'success.main' }}>
            <BuildIcon fontSize="small" />
          </IconButton>
        </Stack>
      )
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Toolbar disableGutters sx={{ mb: 2, gap: 1 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>{title}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          Nouveau vélo
        </Button>
      </Toolbar>

      {error && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, color: "error.main" }}>
          {error}
        </Paper>
      )}

      <Paper variant="outlined" sx={{ height: 520, width: '100%', p: 1 }}>
        {loading ? (
          <Box sx={{ p: 2 }}><Typography color="text.secondary">Chargement…</Typography></Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 2 }}><Typography color="text.secondary">Aucun vélo pour ce client.</Typography></Box>
        ) : (
          <DataGrid rows={rows} columns={columns} density="compact" disableRowSelectionOnClick getRowId={(r) => r.id} />
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Modifier le vélo" : "Nouveau vélo"}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ my: 1 }} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <Stack spacing={2}>
              <TextField label="Marque" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} error={!!formErrors.brand} helperText={formErrors.brand} />
              <TextField label="Modèle" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} error={!!formErrors.model} helperText={formErrors.model} />
              <TextField label="N° série" value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} error={!!formErrors.serialNumber} helperText={formErrors.serialNumber} />
              <TextField label="Couleur" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} error={!!formErrors.color} helperText={formErrors.color} />
              <TextField label="Identifiant fichier national" value={form.nationalFileId} onChange={(e) => setForm((f) => ({ ...f, nationalFileId: e.target.value }))} error={!!formErrors.nationalFileId} helperText={formErrors.nationalFileId} />
              <TextField label="Notes" multiline minRows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} error={!!formErrors.notes} helperText={formErrors.notes} />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>{editing ? "Enregistrer" : "Créer"}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
