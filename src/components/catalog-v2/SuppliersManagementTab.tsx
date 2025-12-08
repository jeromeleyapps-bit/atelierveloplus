"use client";

import { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenIcon from '@mui/icons-material/OpenInNew';
import { logger } from '@/lib/logger';

interface Supplier {
  id: string;
  name: string;
  website?: string;
  contact?: string;
  notes?: string;
}

interface SuppliersManagementTabProps {
  onToast: (message: string, severity?: "success" | "error" | "info") => void;
}

export default function SuppliersManagementTab({ onToast }: SuppliersManagementTabProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "",
    website: "",
    contact: "",
    notes: "",
  });

  // Charger depuis localStorage (simple pour MVP)
  useEffect(() => {
    const stored = localStorage.getItem("suppliers");
    if (stored) {
      try {
        setSuppliers(JSON.parse(stored));
      } catch (e) {
        logger.error("Erreur chargement fournisseurs:", e);
      }
    }
  }, []);

  function saveSuppliers(newSuppliers: Supplier[]) {
    setSuppliers(newSuppliers);
    localStorage.setItem("suppliers", JSON.stringify(newSuppliers));
  }

  function handleAdd() {
    if (!form.name.trim()) {
      onToast("Nom requis", "error");
      return;
    }

    const newSupplier: Supplier = {
      id: Date.now().toString(),
      name: form.name,
      website: form.website || undefined,
      contact: form.contact || undefined,
      notes: form.notes || undefined,
    };

    saveSuppliers([...suppliers, newSupplier]);
    onToast("Fournisseur ajouté", "success");
    handleCloseDialog();
  }

  function handleUpdate() {
    if (!editingSupplier || !form.name.trim()) {
      onToast("Nom requis", "error");
      return;
    }

    const updated = suppliers.map((s) =>
      s.id === editingSupplier.id
        ? { ...s, name: form.name, website: form.website, contact: form.contact, notes: form.notes }
        : s
    );

    saveSuppliers(updated);
    onToast("Fournisseur modifié", "success");
    handleCloseDialog();
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce fournisseur ?")) return;
    saveSuppliers(suppliers.filter((s) => s.id !== id));
    onToast("Fournisseur supprimé", "success");
  }

  function handleOpenDialog(supplier?: Supplier) {
    if (supplier) {
      setEditingSupplier(supplier);
      setForm({
        name: supplier.name,
        website: supplier.website || "",
        contact: supplier.contact || "",
        notes: supplier.notes || "",
      });
    } else {
      setEditingSupplier(null);
      setForm({ name: "", website: "", contact: "", notes: "" });
    }
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    setDialogOpen(false);
    setEditingSupplier(null);
    setForm({ name: "", website: "", contact: "", notes: "" });
  }

  function handleOpenWebsite(url: string) {
    if (!url) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    window.open(fullUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Box>
      {/* Actions */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Nouveau Fournisseur
        </Button>
        <Typography variant="body2" sx={{ ml: "auto", alignSelf: "center", color: "text.secondary" }}>
          {suppliers.length} fournisseur{suppliers.length > 1 ? "s" : ""}
        </Typography>
      </Stack>

      {/* Liste fournisseurs */}
      {suppliers.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun fournisseur
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ajoutez vos fournisseurs avec leurs sites web
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {suppliers.map((supplier) => (
              <ListItem key={supplier.id} divider>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6">{supplier.name}</Typography>
                      {supplier.website && (
                        <Chip
                          label="Site web"
                          size="small"
                          color="primary"
                          variant="outlined"
                          icon={<OpenIcon />}
                          onClick={() => handleOpenWebsite(supplier.website!)}
                          sx={{ cursor: "pointer" }}
                        />
                      )}
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                      {supplier.website && (
                        <Typography variant="caption" color="primary">
                          🌐 {supplier.website}
                        </Typography>
                      )}
                      {supplier.contact && (
                        <Typography variant="caption" color="text.secondary">
                          📞 {supplier.contact}
                        </Typography>
                      )}
                      {supplier.notes && (
                        <Typography variant="caption" color="text.secondary">
                          📝 {supplier.notes}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleOpenDialog(supplier)} sx={{ mr: 1 }}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" onClick={() => handleDelete(supplier.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Dialog Ajout/Modification */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSupplier ? "Modifier Fournisseur" : "Nouveau Fournisseur"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom *"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <TextField
              label="Site web"
              fullWidth
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://example.com"
              helperText="URL du site fournisseur (ouverture nouvelle fenêtre)"
            />
            <TextField
              label="Contact"
              fullWidth
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Email ou téléphone"
            />
            <TextField
              label="Notes"
              fullWidth
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Annuler</Button>
          <Button variant="contained" onClick={editingSupplier ? handleUpdate : handleAdd}>
            {editingSupplier ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
