"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  IconButton,
} from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import { listCashRegisterEntries, createCashRegisterEntry, updateCashRegisterEntry, deleteCashRegisterEntry } from "@/lib/api";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

export default function CashRegisterPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: "direct_sale",
    amount: "",
    description: "",
    invoiceId: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success"
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  function getUserIdHeader() {
    if (typeof window !== "undefined") {
      const uid = window.localStorage.getItem("auth:userId");
      return uid ? { "x-user-id": uid } : {};
    }
    return {};
  }

  async function loadEntries() {
    setLoading(true);
    try {
      const data = await listCashRegisterEntries();
      setEntries(data);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur de chargement", severity: "error" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadEntries();
  }, []);

  async function handleSubmit() {
    if (!form.amount) {
      setToast({ open: true, message: "Montant requis", severity: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        type: form.type,
        amount: parseFloat(form.amount),
        note: form.description,
        reference: form.invoiceId
      };
      
      if (editingId) {
        await updateCashRegisterEntry(editingId, data);
      } else {
        await createCashRegisterEntry(data);
      }

      setToast({ open: true, message: editingId ? "Entrée modifiée" : "Entrée enregistrée", severity: "success" });
      setOpen(false);
      setEditingId(null);
      setForm({ type: "direct_sale", amount: "", description: "", invoiceId: "" });
      await loadEntries();
    } catch (e) {
      setToast({ open: true, message: "Erreur d'enregistrement", severity: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit(entry: any) {
    setEditingId(entry.id);
    setForm({
      type: entry.type,
      amount: entry.amount.toString(),
      description: entry.description || "",
      invoiceId: entry.invoiceId || ""
    });
    setOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette entrée ?")) return;
    
    try {
      await deleteCashRegisterEntry(id);
      setToast({ open: true, message: "Entrée supprimée", severity: "success" });
      await loadEntries();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur de suppression", severity: "error" });
    }
  }

  const totalCash = entries.reduce((sum, e) => {
    if (e.type === "expense") {
      return sum - e.amount;
    }
    return sum + e.amount;
  }, 0);

  return (
    <RequireAuth>
      <PageShell title="Caisse">
        <SectionCard
          title="Caisse Espèces"
          icon={<PointOfSaleIcon color="primary" />}
          actions={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
            >
              Nouvelle entrée
            </Button>
          }
        >
          <Box sx={{ mb: 3 }}>
            <Paper sx={{ 
              p: 3, 
              bgcolor: totalCash < 0 ? "error.light" : "success.light", 
              color: totalCash < 0 ? "error.contrastText" : "success.contrastText" 
            }}>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {totalCash.toFixed(2)} €
              </Typography>
              <Typography variant="body2">Total en caisse {totalCash < 0 ? "(Négatif)" : ""}</Typography>
            </Paper>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Facture</TableCell>
                  <TableCell align="right">Montant</TableCell>
                  <TableCell>Utilisateur</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Chargement...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Aucune entrée
                    </TableCell>
                  </TableRow>
                )}
                {!loading && entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          entry.type === "direct_sale" ? "Vente directe" :
                          entry.type === "invoice_payment" ? "Paiement facture" :
                          entry.type === "expense_professional" ? "Dépense pro" :
                          entry.type === "expense_personal" ? "Dépense perso" : entry.type
                        }
                        size="small"
                        color={
                          entry.type === "direct_sale" ? "primary" :
                          entry.type === "invoice_payment" ? "secondary" :
                          entry.type === "expense_professional" ? "warning" :
                          entry.type === "expense_personal" ? "error" : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>{entry.description || "-"}</TableCell>
                    <TableCell>{entry.invoice?.number || "-"}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", color: (entry.type === 'expense_professional' || entry.type === 'expense_personal') ? 'error.main' : 'success.main' }}>
                      {(entry.type === 'expense_professional' || entry.type === 'expense_personal') ? '-' : '+'}{entry.amount.toFixed(2)} €
                    </TableCell>
                    <TableCell>{entry.user?.name || entry.user?.email || "-"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <IconButton size="small" color="primary" onClick={() => handleEdit(entry)} title="Modifier">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(entry.id)} title="Supprimer">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <Dialog open={open} onClose={() => { setOpen(false); setEditingId(null); setForm({ type: "direct_sale", amount: "", description: "", invoiceId: "" }); }} maxWidth="sm" fullWidth>
          <DialogTitle>{editingId ? "Modifier l'entrée" : "Nouvelle entrée caisse"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={form.type}
                  label="Type"
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <MenuItem value="direct_sale">💰 Vente directe (Entrée)</MenuItem>
                  <MenuItem value="invoice_payment">📄 Paiement de facture (Entrée)</MenuItem>
                  <MenuItem value="expense_professional">🏢 Dépense professionnelle (Sortie)</MenuItem>
                  <MenuItem value="expense_personal">👤 Dépense personnelle (Sortie)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Montant (€)"
                type="number"
                fullWidth
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                inputProps={{ step: "0.01", min: "0" }}
              />

              {(form.type === "direct_sale" || form.type === "expense_professional" || form.type === "expense_personal") && (
                <TextField
                  label={form.type.startsWith('expense') ? "Objet de la dépense" : "Description"}
                  fullWidth
                  multiline
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required={form.type.startsWith('expense')}
                />
              )}

              {form.type === "invoice_payment" && (
                <TextField
                  label="Numéro de facture"
                  fullWidth
                  value={form.invoiceId}
                  onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}
                  helperText="Optionnel : ID de la facture"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setOpen(false); setEditingId(null); setForm({ type: "direct_sale", amount: "", description: "", invoiceId: "" }); }}>Annuler</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Enregistrement..." : editingId ? "Modifier" : "Enregistrer"}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast({ ...toast, open: false })}
        >
          <Alert severity={toast.severity}>{toast.message}</Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
