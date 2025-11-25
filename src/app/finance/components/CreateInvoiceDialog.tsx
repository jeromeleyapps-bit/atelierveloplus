"use client";

import { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { listCustomers, createCustomer, createWorkOrder, createInvoice, getAppSettings, type Customer, type WorkOrder } from "@/lib/api";
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";
import VatRateSelector from "@/app/components/VatRateSelector";
import SelectTicketDialog from "@/app/finance/components/SelectTicketDialog";
import { usePageTheme } from "@/hooks/usePageTheme";
import { useRouter } from "next/navigation";
import { logger } from '@/lib/logger';

interface CreateInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (invoiceId: string) => void;
}

export default function CreateInvoiceDialog({ open, onClose, onSuccess }: CreateInvoiceDialogProps) {
  const theme = usePageTheme('invoice'); // Vert pour factures
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"product" | "equipment" | "bike" | "service">("product");
  const [pricingMode, setPricingMode] = useState<"HT_TVA" | "AE_TTC">("HT_TVA");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mode sélection: 'manual' (classique) ou 'ticket' (sélection ticket existant)
  const [selectionMode, setSelectionMode] = useState<'manual' | 'ticket'>('manual');
  const [selectTicketDialogOpen, setSelectTicketDialogOpen] = useState(false);
  
  // Pour les réparations : sélection du ticket
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  
  // Dialog nouveau client
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  
  // Lignes de facturation
  const [lines, setLines] = useState<LineItem[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState(20);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  // Charger les settings au montage
  useEffect(() => {
    if (open) {
      getAppSettings().then(settings => {
        setIsAutoEntrepreneur(settings?.isAutoEntrepreneur || false);
        setDefaultVatRate(settings?.isAutoEntrepreneur ? 0 : 20);
      });
    }
  }, [open]);

  async function loadCustomers() {
    setLoadingCustomers(true);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (e) {
      logger.error("Failed to load customers", e);
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
      logger.error("Failed to load work orders", e);
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
        logger.error("Settings API error:", response.status);
        return;
      }
      
      // Settings chargés mais plus utilisés pour TVA
    } catch (error) {
      logger.error("Error loading settings:", error);
    }
  }

  function handleAddLine(line: LineItem) {
    // Forcer TVA à 0 si auto-entrepreneur
    const vatRate = isAutoEntrepreneur ? 0 : line.vatRate;
    setLines([...lines, { ...line, vatRate, id: `temp-${Date.now()}` }]);
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
      logger.error("Failed to create customer", e);
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
        customerId: selectedCustomer.id, // ← Ajout customerId pour factures directes
        pricingMode,
        currency: "EUR",
        vatRate: defaultVatRate,
        laborRate: 60,
      });

      // Ajouter les lignes si présentes
      if (lines.length > 0) {
        const token = localStorage.getItem("jwt_token");
        for (const line of lines) {
          // Ajouter directement à la facture (pas au workOrder)
          await fetch(`/api/finance/invoices/${invoice.id}/lines`, {
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
              vatRate: line.vatRate || defaultVatRate,
              duration: line.duration,
              sourceId: line.sourceId,
            }),
          });
        }
      }

      onSuccess(invoice.id);
      handleClose();
    } catch (e) {
      logger.error("CreateInvoiceDialog error:", e);
      const message = e instanceof Error ? e.message : "Erreur lors de la création";
      setError(message);
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

            {/* Mode de création */}
            <FormControl component="fieldset">
              <FormLabel component="legend">Mode de création</FormLabel>
              <RadioGroup 
                value={selectionMode} 
                onChange={(e) => setSelectionMode(e.target.value as 'manual' | 'ticket')}
                row
              >
                <FormControlLabel 
                  value="manual" 
                  control={<Radio />} 
                  label="Manuelle" 
                />
                <FormControlLabel 
                  value="ticket" 
                  control={<Radio />} 
                  label="Depuis un ticket" 
                />
              </RadioGroup>
            </FormControl>

            {/* Mode ticket: Bouton sélection */}
            {selectionMode === 'ticket' && (
              <Button
                variant="contained"
                fullWidth
                onClick={() => setSelectTicketDialogOpen(true)}
                sx={{
                  bgcolor: theme.primary,
                  '&:hover': {
                    bgcolor: theme.primaryDark
                  }
                }}
              >
                Sélectionner un ticket à facturer
              </Button>
            )}

            {/* Sélection client (mode manuel uniquement) */}
            {selectionMode === 'manual' && (
              <>
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
                    isOptionEqualToValue={(option, value) => option.id === value.id}
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
                  <RadioGroup value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as "product" | "equipment" | "bike" | "service")}>
                    <FormControlLabel value="product" control={<Radio />} label="Produit" />
                    <FormControlLabel value="equipment" control={<Radio />} label="Équipement" />
                    <FormControlLabel value="bike" control={<Radio />} label="Vélo complet" />
                    <FormControlLabel value="service" control={<Radio />} label="Service / Réparation" />
                  </RadioGroup>
                </FormControl>

                {/* Sélection du ticket pour les réparations */}
                {invoiceType === "service" && selectedCustomer && (
                  <Autocomplete<WorkOrder>
                    fullWidth
                    options={workOrders}
                    value={selectedWorkOrder}
                    loading={loadingWorkOrders}
                    getOptionLabel={(wo) => {
                      const desc = (wo as { description?: string }).description || "Sans description";
                      const status = wo.status || "";
                      return `#${wo.id.slice(-6)} - ${desc} (${status})`;
                    }}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
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
              </>
            )}

            {/* Prestations et Pièces - Mode manuel uniquement */}
            {selectionMode === 'manual' && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                  {invoiceType === "service" ? "Prestations et Pièces" : "Articles"}
                </Typography>
                {/* TVA par défaut - masqué si auto-entrepreneur */}
                {!isAutoEntrepreneur && (
                  <VatRateSelector
                    value={defaultVatRate}
                    onChange={setDefaultVatRate}
                    label="TVA par défaut"
                    fullWidth
                  />
                )}
                <LineItemSelector
                  onAddLine={handleAddLine}
                  isAutoEntrepreneur={isAutoEntrepreneur}
                />
                <LineItemsTable
                  lines={lines}
                  onUpdateLine={handleUpdateLine}
                  onDeleteLine={handleDeleteLine}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          {selectionMode === 'manual' && (
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
              {submitting ? "Création..." : "Créer la Facture"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog sélection ticket */}
      <SelectTicketDialog
        open={selectTicketDialogOpen}
        onClose={() => setSelectTicketDialogOpen(false)}
        onSelect={async (ticketId) => {
          try {
            setSubmitting(true);
            // Créer facture depuis ticket
            const token = localStorage.getItem("jwt_token");
            const res = await fetch("/api/finance/invoices", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                workOrderId: ticketId,
                pricingMode: "HT_TVA",
                currency: "EUR",
                vatRate: 20,
                laborRate: 60,
              }),
            });
            
            if (!res.ok) {
              throw new Error("Erreur création facture");
            }
            
            const invoice = await res.json();
            setSelectTicketDialogOpen(false);
            handleClose();
            
            // Rediriger vers la facture
            router.push(`/finance/invoices/${invoice.id}`);
          } catch (error) {
            logger.error("Error creating invoice from ticket:", error);
            const message = error instanceof Error ? error.message : "Erreur lors de la création";
            setError(message);
          } finally {
            setSubmitting(false);
          }
        }}
      />

      {/* Dialog nouveau client */}
      <Dialog open={newCustomerOpen} onClose={() => setNewCustomerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Créer un nouveau client</DialogTitle>
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
