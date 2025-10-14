"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

type ServiceRate = {
  id: string;
  name: string;
  description: string | null;
  priceHT: number;
  bikeType: string | null;
  category: string | null;
  duration: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const BIKE_TYPES = ["VTT", "Route", "Ville", "Électrique", "Gravel", "BMX"];
const CATEGORIES = ["Entretien", "Réparation", "Diagnostic", "Personnalisation", "Autre"];

export default function ServiceRatesPage() {
  const [serviceRates, setServiceRates] = useState<ServiceRate[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ServiceRate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priceHT: "",
    bikeType: "",
    category: "",
    duration: "",
    active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadServiceRates();
  }, []);

  async function loadServiceRates() {
    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch("/api/admin/service-rates", {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      setServiceRates(data.serviceRates);
      setLastUpdate(data.lastUpdate);
    } catch (error) {
      console.error("Error loading service rates:", error);
      setError("Erreur lors du chargement des prestations");
    } finally {
      setLoading(false);
    }
  }

  function openDialog(rate?: ServiceRate) {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        name: rate.name,
        description: rate.description || "",
        priceHT: rate.priceHT.toString(),
        bikeType: rate.bikeType || "",
        category: rate.category || "",
        duration: rate.duration?.toString() || "",
        active: rate.active,
      });
    } else {
      setEditingRate(null);
      setFormData({
        name: "",
        description: "",
        priceHT: "",
        bikeType: "",
        category: "",
        duration: "",
        active: true,
      });
    }
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      const url = editingRate
        ? `/api/admin/service-rates/${editingRate.id}`
        : "/api/admin/service-rates";
      const method = editingRate ? "PATCH" : "POST";
      const token = localStorage.getItem('jwt_token');

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erreur lors de la sauvegarde");

      setSuccess(
        editingRate
          ? "Prestation mise à jour avec succès"
          : "Prestation créée avec succès",
      );
      setDialogOpen(false);
      loadServiceRates();
    } catch (error) {
      console.error("Error saving service rate:", error);
      setError("Erreur lors de la sauvegarde");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette prestation ?"))
      return;

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch(`/api/admin/service-rates/${id}`, {
        method: "DELETE",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      setSuccess("Prestation supprimée avec succès");
      loadServiceRates();
    } catch (error) {
      console.error("Error deleting service rate:", error);
      setError("Erreur lors de la suppression");
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem('jwt_token');
      const response = await fetch("/api/admin/service-rates/import", {
        method: "POST",
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erreur lors de l'import");

      setSuccess(`${data.imported} prestation(s) importée(s)`);
      if (data.errors) {
        console.warn("Import errors:", data.errors);
      }
      loadServiceRates();
    } catch (error) {
      console.error("Error importing:", error);
      setError(error instanceof Error ? error.message : "Erreur lors de l'import");
    }

    // Reset input
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRate ? "Modifier la prestation" : "Nouvelle prestation"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
