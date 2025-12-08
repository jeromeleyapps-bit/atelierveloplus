"use client";

// ✅ Hooks personnalisés
import { useServiceRatesData } from '@/hooks/useServiceRatesData';
import { useServiceRatesUI } from '@/hooks/useServiceRatesUI';
import { useServiceRatesMutations } from '@/hooks/useServiceRatesMutations';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';

import type { ServiceRate as _ServiceRate } from '@/hooks/useServiceRatesData';

const BIKE_TYPES = ["VTT", "Route", "Ville", "Électrique", "Gravel", "BMX"];
const CATEGORIES = ["Entretien", "Réparation", "Diagnostic", "Personnalisation", "Autre"];

export default function ServiceRatesPage() {
  // ✅ Hooks personnalisés
  const ratesData = useServiceRatesData();
  const ratesUI = useServiceRatesUI();
  const ratesMutations = useServiceRatesMutations({
    onSuccess: ratesUI.showSuccess,
    onError: ratesUI.showError,
  });

  // Alias locaux
  const serviceRates = ratesData.serviceRates;
  const lastUpdate = ratesData.lastUpdate;
  const loading = ratesData.isLoading;
  const dialogOpen = ratesUI.dialogOpen;
  const setDialogOpen = ratesUI.setDialogOpen;
  const editingRate = ratesUI.editingRate;
  const formData = ratesUI.formData;
  const setFormData = ratesUI.setFormData;
  const error = ratesUI.error;
  const setError = ratesUI.setError;
  const success = ratesUI.success;
  const setSuccess = ratesUI.setSuccess;
  const openDialog = ratesUI.openDialog;

  function handleSave() {
    if (editingRate) {
      ratesMutations.update(editingRate.id, formData as unknown as Record<string, unknown>);
    } else {
      ratesMutations.create(formData as unknown as Record<string, unknown>);
    }
    ratesUI.closeDialog();
  }

  function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette prestation ?")) return;
    ratesMutations.remove(id);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem('jwt_token');
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/admin/service-rates/import", {
        method: "POST",
        headers,
        body: formData,
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'import");
      }

      setSuccess(`${data.imported} prestation(s) importée(s)`);
      if (data.errors) {
        setError(`Import partiel: ${data.errors.length} ligne(s) en erreur`);
      }
      ratesData.refetch();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur lors de l'import");
    }

    event.target.value = "";
  }

  function exportCSV() {
    const headers = ["prestation", "tarif", "type_velo", "categorie", "duree", "description"];
    const rows = serviceRates.map((rate) => [
      rate.name,
      rate.priceHT.toString(),
      rate.bikeType || "",
      rate.category || "",
      rate.duration?.toString() || "",
      rate.description || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prestations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getLastUpdateText() {
    if (!lastUpdate) return "Jamais mis à jour";
    const date = new Date(lastUpdate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));

    if (diffMonths === 0) return "Mis à jour récemment";
    if (diffMonths === 1) return "Mis à jour il y a 1 mois";
    return `Mis à jour il y a ${diffMonths} mois`;
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Tarifs et Prestations
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getLastUpdateText()}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCSV}
          >
            Exporter CSV
          </Button>
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
          >
            Importer CSV
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={handleImport}
            />
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openDialog()}
          >
            Nouvelle prestation
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Prestation</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell>Type vélo</TableCell>
              <TableCell align="right">Tarif HT</TableCell>
              <TableCell align="right">Durée</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!serviceRates || serviceRates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  {loading ? "Chargement..." : "Aucune prestation. Cliquez sur \"Nouvelle prestation\" pour commencer."}
                </TableCell>
              </TableRow>
            ) : (
              serviceRates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {rate.name}
                    </Typography>
                    {rate.description && (
                      <Typography variant="caption" color="text.secondary">
                        {rate.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {rate.category && (
                      <Chip label={rate.category} size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {rate.bikeType ? (
                      <Chip label={rate.bikeType} size="small" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Tous
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">
                      {rate.priceHT.toFixed(2)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {rate.duration ? `${rate.duration} min` : "-"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={rate.active ? "Actif" : "Inactif"}
                      color={rate.active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openDialog(rate)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(rate.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog Créer/Modifier */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRate ? "Modifier la prestation" : "Nouvelle prestation"}
        </DialogTitle>
        <DialogContent sx={{ overflow: 'auto', maxHeight: 'calc(100vh - 200px)', pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Nom de la prestation"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="Tarif HT (€)"
              type="number"
              value={formData.priceHT}
              onChange={(e) => setFormData({ ...formData, priceHT: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Type de vélo"
              select
              value={formData.bikeType}
              onChange={(e) => setFormData({ ...formData, bikeType: e.target.value })}
              fullWidth
            >
              <MenuItem value="">Tous les types</MenuItem>
              {BIKE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Catégorie"
              select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            >
              <MenuItem value="">Aucune catégorie</MenuItem>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Durée estimée (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
              }
              label="Prestation active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained">
            {editingRate ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
