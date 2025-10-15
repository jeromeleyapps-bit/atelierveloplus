"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Autocomplete,
  Typography,
  Alert,
} from "@mui/material";
import { listCustomers, createCustomer, createWorkOrder, createInvoice, type Customer, type WorkOrder } from "@/lib/api";
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";
import { usePageTheme } from "@/hooks/usePageTheme";

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

export default function CreateInvoiceDialog({ open, onClose, onSuccess }: CreateInvoiceDialogProps) {
  const theme = usePageTheme('invoice'); // Vert pour factures
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"product" | "equipment" | "bike" | "service">("product");
  const [pricingMode, setPricingMode] = useState<"HT_TVA" | "AE_TTC">("HT_TVA");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pour les réparations : sélection du ticket
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any | null>(null);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  
  // Dialog nouveau client
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  
  // Lignes de facturation
  const [lines, setLines] = useState<LineItem[]>([]);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (e) {
      console.error("Failed to load customers", e);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function loadWorkOrders(customerId: string) {
    setLoadingWorkOrders(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`/api/workshop/workorders?customerId=${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setWorkOrders(data);
      }
    } catch (e) {
      console.error("Failed to load work orders", e);
    } finally {
      setLoadingWorkOrders(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadCustomers();
      loadUserSettings();
      setLines([]); // Reset lines
    }
  }, [open]);

  async function loadUserSettings() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/account/settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        console.error("Settings API error:", response.status);
        setIsAutoEntrepreneur(false);
        return;
      }
      
      const data = await response.json();
      console.log("[Facture] isAutoEntrepreneur:", data.isAutoEntrepreneur);
      setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
    } catch (error) {
      console.error("Error loading settings:", error);
      setIsAutoEntrepreneur(false);
    }
  }

  function handleAddLine(line: LineItem) {
    setLines([...lines, { ...line, id: `temp-${Date.now()}` }]);
  }

  function handleUpdateLine(index: number, updates: Partial<LineItem>) {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
  }

  function handleDeleteLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  useEffect(() => {
    if (selectedCustomer && invoiceType === "service") {
      loadWorkOrders(selectedCustomer.id);
    } else {
      setWorkOrders([]);
      setSelectedWorkOrder(null);
    }
  }, [selectedCustomer, invoiceType]);

  async function handleCreateCustomer() {
    try {
      const created = await createCustomer({
        email: newCustomer.email || undefined,
        firstName: newCustomer.firstName || undefined,
        lastName: newCustomer.lastName || undefined,
        phone: newCustomer.phone || undefined,
      });
      setSelectedCustomer(created);
      setNewCustomerOpen(false);
      setNewCustomer({ firstName: "", lastName: "", email: "", phone: "" });
      await loadCustomers();
    } catch (e) {
      console.error("Failed to create customer", e);
      setError("Erreur lors de la création du client");
    }
  }

  async function handleSubmit() {
    if (!selectedCustomer) {
      setError("Veuillez sélectionner un client");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let workOrderId: string | undefined;

      // Créer un ticket UNIQUEMENT pour les réparations/services
      if (invoiceType === "service") {
        if (selectedWorkOrder) {
          // Utiliser le ticket existant
          workOrderId = selectedWorkOrder.id;
        } else {
          // Créer un nouveau ticket pour la réparation
          const ticket = await createWorkOrder({
            customerId: selectedCustomer.id,
          });
          workOrderId = ticket.id;
        }
      }
      // Pour les ventes de produits/équipements/vélos, pas de ticket créé

      // Créer la facture
      const invoice = await createInvoice({
        workOrderId,
        pricingMode,
        currency: "EUR",
        vatRate: pricingMode === "HT_TVA" ? 20 : 0,
        laborRate: 60,
      });

      // Ajouter les lignes si présentes
      if (lines.length > 0 && workOrderId) {
        const token = localStorage.getItem("jwt_token");
        for (const line of lines) {
          await fetch(`/api/workorders/${workOrderId}/lines`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              type: line.type,
              description: line.description,
              quantity: line.quantity,
              priceHT: line.priceHT,
              vatRate: isAutoEntrepreneur ? 0 : (line.vatRate || 20),  // Auto-entrepreneur = TVA 0%
              duration: line.duration,
              sourceId: line.sourceId,
              notes: line.notes,
            }),
          });
        }
      }

      onSuccess(invoice.id);
      handleClose();
    } catch (e: any) {
      console.error("CreateInvoiceDialog error:", e);
      setError(e.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setSelectedCustomer(null);
    setInvoiceType("product");
    setPricingMode("HT_TVA");
    setError(null);
    onClose();
  }

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderTop: 4,
            borderColor: theme.primary,
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: theme.primaryLight, color: theme.text }}>
          💰 Créer une nouvelle facture
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            {/* Sélection client */}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Autocomplete
                fullWidth
                options={customers}
                value={selectedCustomer}
                loading={loadingCustomers}
                getOptionLabel={(c) => {
                  const name = `${c.firstName || ""} ${c.lastName || ""}`.trim();
                  return name ? `${name} ${c.email ? `(${c.email})` : ""}` : c.email || c.id;
                }}
                onChange={(_, value) => setSelectedCustomer(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Client *" required />
                )}
              />
              <Button
                variant="outlined"
                onClick={() => setNewCustomerOpen(true)}
                sx={{ minWidth: 120, whiteSpace: "nowrap" }}
              >
                + Nouveau
              </Button>
            </Stack>

            {/* Type de vente */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Type de vente</FormLabel>
              <RadioGroup value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as any)}>
                <FormControlLabel value="product" control={<Radio />} label="Produit" />
                <FormControlLabel value="equipment" control={<Radio />} label="Équipement" />
                <FormControlLabel value="bike" control={<Radio />} label="Vélo complet" />
                <FormControlLabel value="service" control={<Radio />} label="Service / Réparation" />
              </RadioGroup>
            </FormControl>

            {/* Sélection du ticket pour les réparations */}
            {invoiceType === "service" && selectedCustomer && (
              <Autocomplete
                fullWidth
                options={workOrders}
                value={selectedWorkOrder}
                loading={loadingWorkOrders}
                getOptionLabel={(wo) => {
                  const desc = wo.description || "Sans description";
                  const status = wo.status || "";
                  return `#${wo.id.slice(-6)} - ${desc} (${status})`;
                }}
                onChange={(_, value) => setSelectedWorkOrder(value)}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Ticket de réparation (optionnel)" 
                    helperText="Sélectionnez un ticket existant ou laissez vide pour créer un nouveau"
                  />
                )}
              />
            )}

            {/* Mode de facturation */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Mode de facturation</FormLabel>
              <RadioGroup value={pricingMode} onChange={(e) => setPricingMode(e.target.value as any)}>
                <FormControlLabel value="HT_TVA" control={<Radio />} label="HT + TVA (20%)" />
                <FormControlLabel value="AE_TTC" control={<Radio />} label="TTC (Auto-entrepreneur)" />
              </RadioGroup>
            </FormControl>

            {/* Prestations et Pièces */}
            {invoiceType === "service" && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  Prestations et Pièces
                </Typography>
                <LineItemSelector
                  onAddLine={handleAddLine}
                  isAutoEntrepreneur={isAutoEntrepreneur}
                />
                <LineItemsTable
                  lines={lines}
                  onUpdateLine={handleUpdateLine}
                  onDeleteLine={handleDeleteLine}
                  isAutoEntrepreneur={isAutoEntrepreneur}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!selectedCustomer || submitting}
            sx={{
              bgcolor: theme.primary,
              '&:hover': {
                bgcolor: theme.primaryDark
              }
            }}
          >
            {submitting ? "Création..." : "Créer et éditer →"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog nouveau client */}
      <Dialog open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Prénom"
              value={newCustomer.firstName}
              onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
            />
            <TextField
              label="Nom"
              value={newCustomer.lastName}
              onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
            />
            <TextField
              label="Email"
              type="email"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            />
            <TextField
              label="Téléphone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCustomerOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateCustomer}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
