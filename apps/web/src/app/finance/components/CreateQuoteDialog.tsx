"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
} from "@mui/material";
import { createQuote, searchWorkOrders, createWorkOrder, listCustomers, type WorkOrder, type Customer } from "@/lib/api";

interface CreateQuoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (quoteId: string) => void;
}

export default function CreateQuoteDialog({
  open,
  onClose,
  onSuccess,
}: CreateQuoteDialogProps) {
  const [quoteType, setQuoteType] = useState<"ticket" | "direct">("ticket");
  const [workOrderId, setWorkOrderId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [validDays, setValidDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Charger les tickets et clients au montage
  useEffect(() => {
    if (open) {
      if (quoteType === "ticket") {
        loadWorkOrders();
      } else {
        loadCustomers();
      }
    }
  }, [open, quoteType]);

  const loadWorkOrders = async () => {
    setLoading(true);
    try {
      const data = await searchWorkOrders({});
      setWorkOrders(data);
    } catch (err) {
      console.error("Erreur chargement tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await listCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Erreur chargement clients:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    setError("");

    try {
      let finalWorkOrderId = workOrderId;

      // Si devis direct, créer d'abord un ticket vide
      if (quoteType === "direct") {
        if (!selectedCustomer) {
          setError("Veuillez sélectionner un client");
          setCreating(false);
          return;
        }
        
        const wo = await createWorkOrder({
          customerId: selectedCustomer.id,
          bikeId: undefined,
          dueAt: undefined,
        });
        finalWorkOrderId = wo.id;
      } else {
        if (!workOrderId) {
          setError("Veuillez sélectionner un ticket");
          setCreating(false);
          return;
        }
      }

      const quote = await createQuote({ workOrderId: finalWorkOrderId, validDays });
      onSuccess(quote.id);
      onClose();
      // Rediriger vers la page du devis (route dédiée)
      window.location.href = `/finance/quotes/${quote.id}`;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du devis");
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setQuoteType("ticket");
      setWorkOrderId("");
      setSelectedCustomer(null);
      setValidDays(30);
      setError("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un devis</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          {/* Sélection du type de devis */}
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Type de devis
            </Typography>
            <ToggleButtonGroup
              value={quoteType}
              exclusive
              onChange={(_, val) => val && setQuoteType(val)}
              fullWidth
              size="small"
            >
              <ToggleButton value="ticket">
                Depuis un ticket
              </ToggleButton>
              <ToggleButton value="direct">
                Devis direct
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {loading ? (
            <Stack alignItems="center" py={3}>
              <CircularProgress />
            </Stack>
          ) : (
            <>
              {quoteType === "ticket" ? (
                <Autocomplete
                  options={workOrders}
                  getOptionLabel={(wo) => {
                    const customerName = [
                      wo.customer?.firstName,
                      wo.customer?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ");
                    const date = new Date(wo.createdAt).toLocaleDateString("fr-FR");
                    return `${date} - ${customerName || wo.customer?.email || "Client"}`;
                  }}
                  onChange={(_, val) => setWorkOrderId(val?.id || "")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Ticket / Ordre de réparation"
                      required
                      helperText="Sélectionnez le ticket pour lequel créer le devis"
                    />
                  )}
                />
              ) : (
                <Autocomplete
                  options={customers}
                  getOptionLabel={(customer) => {
                    const name = [customer.firstName, customer.lastName]
                      .filter(Boolean)
                      .join(" ");
                    return name || customer.email || "Client";
                  }}
                  onChange={(_, val) => setSelectedCustomer(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Client"
                      required
                      helperText="Sélectionnez le client pour le devis direct"
                    />
                  )}
                />
              )}

              <TextField
                label="Validité (jours)"
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
                onFocus={(e) => e.target.select()}
                helperText="Nombre de jours avant expiration du devis"
                inputProps={{ min: 1, max: 365 }}
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={
            creating ||
            loading ||
            (quoteType === "ticket" && !workOrderId) ||
            (quoteType === "direct" && !selectedCustomer)
          }
        >
          {creating ? "Création..." : "Créer le devis"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
