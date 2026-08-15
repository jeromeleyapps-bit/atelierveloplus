"use client";

// ✅ Hooks personnalisés
import { useCashRegisterData } from '@/hooks/useCashRegisterData';
import { useCashRegisterUI } from '@/hooks/useCashRegisterUI';
import { useCashRegisterMutations } from '@/hooks/useCashRegisterMutations';
import { useState, useEffect, useCallback } from 'react';
import { listCustomers, type Customer } from '@/lib/api';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';

import Autocomplete from '@mui/material/Autocomplete';
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
// ✅ OPTIMISATION: Lazy loading Recharts pour réduire bundle initial
// Note: Recharts utilise des exports nommés, donc on garde l'import direct
// Le lazy loading sera implémenté au niveau du composant parent si nécessaire
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';

export default function CashRegisterPage() {
  // ✅ Hooks personnalisés
  const registerData = useCashRegisterData();
  const registerUI = useCashRegisterUI();
  const registerMutations = useCashRegisterMutations({
    onSuccess: registerUI.showToast,
    onError: (msg) => registerUI.showToast(msg, 'error'),
  });

  // Liste clients pour autocomplete
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (e) {
      logger.error('Erreur chargement clients:', e);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Charger clients à l'ouverture du dialog — déclaré après loadCustomers, qui
  // était auparavant référencée avant sa déclaration.
  useEffect(() => {
    if (registerUI.open) {
      loadCustomers();
    }
  }, [registerUI.open, loadCustomers]);

  // Alias locaux
  const entries = registerData.entries;
  const loading = registerData.isLoading;
  const totalCash = registerData.totalCash;
  const balance = registerData.balance;
  const treasuryData = registerData.treasuryData;
  
  const open = registerUI.open;
  const _setOpen = registerUI.setOpen;
  const form = registerUI.form;
  const setForm = registerUI.setForm;
  const toast = registerUI.toast;
  const editingId = registerUI.editingId;
  
  const submitting = registerMutations.isPending;


  async function handleSubmit() {
    if (!form.amount) {
      registerUI.showToast('Montant requis', 'error');
      return;
    }

    // Calculer montant final avec remise
    const initialAmount = parseFloat(form.amount);
    const discountPercent = parseFloat(form.discount || '0');
    const finalAmount = initialAmount * (1 - discountPercent / 100);

    const data = {
      type: form.type,
      amount: finalAmount,
      note: form.description,
      reference: form.invoiceId,
      discount: discountPercent,
      paymentMethod: form.paymentMethod,
      customerEmail: form.customerEmail,
    };

    if (editingId) {
      registerMutations.update(editingId, data);
    } else {
      registerMutations.create(data);
      
      // Envoyer ticket par email si email fourni
      if (form.customerEmail && (form.type === 'direct_sale' || form.type === 'invoice_payment')) {
        try {
          const token = localStorage.getItem("jwt_token");
          await fetch('/api/cash-register/send-receipt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              email: form.customerEmail,
              type: form.type,
              amount: initialAmount,
              discount: discountPercent,
              finalAmount,
              paymentMethod: form.paymentMethod,
              description: form.description,
            }),
          });
          registerUI.showToast('Ticket envoyé par email', 'success');
        } catch (e) {
          logger.error('Erreur envoi ticket:', e);
          registerUI.showToast('Entrée créée mais email non envoyé', 'error');
        }
      }
    }
    registerUI.closeDialog();
  }

  const handleEdit = registerUI.openEdit;

  function handleDelete(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    registerMutations.remove(id);
  }


  return (
    <RequireAuth>
      <PageShell title="Caisse">
        {/* 1. Mouvements de Caisse - EN HAUT */}
        <SectionCard
          title="Mouvements de Caisse"
          icon={<PointOfSaleIcon color="primary" />}
          actions={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => registerUI.openCreate()}
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

        {/* 2. Solde Caisse - AU MILIEU */}
        <Paper sx={{ p: 3, mb: 3, bgcolor: balance >= 0 ? '#d1fae5' : '#fee2e2', border: 2, borderColor: balance >= 0 ? '#10b981' : '#ef4444' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Solde Caisse</Typography>
              <Typography variant="h3" fontWeight={700} color={balance >= 0 ? '#047857' : '#dc2626'}>
                {balance.toFixed(2)} €
              </Typography>
            </Box>
            <PointOfSaleIcon sx={{ fontSize: 60, color: balance >= 0 ? '#10b981' : '#ef4444', opacity: 0.3 }} />
          </Stack>
        </Paper>

        {/* 3. Graphique Trésorerie - EN BAS */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Évolution Trésorerie</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={treasuryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} name="Solde (€)" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>

        <Dialog open={open} onClose={() => registerUI.closeDialog()} maxWidth="sm" fullWidth>
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
                label="Montant initial (€)"
                type="number"
                fullWidth
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                inputProps={{ step: "0.01", min: "0" }}
              />

              {(form.type === "direct_sale" || form.type === "invoice_payment") && (
                <>
                  <TextField
                    label="Remise (%)"
                    type="number"
                    fullWidth
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    inputProps={{ step: "1", min: "0", max: "100" }}
                    helperText={`Montant final: ${(parseFloat(form.amount || '0') * (1 - parseFloat(form.discount || '0') / 100)).toFixed(2)} €`}
                  />

                  <FormControl fullWidth>
                    <InputLabel>Moyen de paiement</InputLabel>
                    <Select
                      value={form.paymentMethod}
                      label="Moyen de paiement"
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                    >
                      <MenuItem value="cash">💵 Espèces</MenuItem>
                      <MenuItem value="card">💳 Carte bancaire</MenuItem>
                      <MenuItem value="check">📝 Chèque</MenuItem>
                      <MenuItem value="transfer">🏦 Virement</MenuItem>
                    </Select>
                  </FormControl>

                  <Autocomplete
                    freeSolo
                    options={customers}
                    loading={loadingCustomers}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return option.email || `${option.firstName || ''} ${option.lastName || ''}`.trim();
                    }}
                    value={form.customerEmail}
                    onInputChange={(_, value) => setForm({ ...form, customerEmail: value })}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Email client (pour ticket)"
                        type="email"
                        helperText="Optionnel : sélectionnez un client ou saisissez un email"
                      />
                    )}
                    renderOption={(props, option) => {
                      const name = `${option.firstName || ''} ${option.lastName || ''}`.trim();
                      return (
                        <li {...props} key={option.id}>
                          <Stack>
                            <Typography variant="body2">{name || 'Client sans nom'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.email}
                            </Typography>
                          </Stack>
                        </li>
                      );
                    }}
                  />
                </>
              )}

              <TextField
                label={form.type.startsWith('expense') ? "Objet de la dépense" : "Description"}
                fullWidth
                multiline
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required={form.type.startsWith('expense')}
              />

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
            <Button onClick={() => registerUI.closeDialog()}>Annuler</Button>
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
          onClose={() => registerUI.closeToast()}
        >
          <Alert severity={toast.severity}>{toast.message}</Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
