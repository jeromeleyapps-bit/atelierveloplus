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
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";
import { usePageTheme } from "@/hooks/usePageTheme";

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
  const theme = usePageTheme('quote'); // Violet pour devis
  const [quoteType, setQuoteType] = useState<"ticket" | "direct">("ticket");
  const [workOrderId, setWorkOrderId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [validDays, setValidDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  // Charger les tickets et clients au montage
  useEffect(() => {
    if (open) {
      if (quoteType === "ticket") {
        loadWorkOrders();
      } else {
        loadCustomers();
      }
      loadUserSettings();
      setLines([]); // Reset lines
    }
  }, [open, quoteType]);

  const loadUserSettings = async () => {
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
      console.log("[Devis] isAutoEntrepreneur:", data.isAutoEntrepreneur);
      setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
    } catch (error) {
      console.error("Error loading settings:", error);
      setIsAutoEntrepreneur(false);
    }
  };

  const handleAddLine = (line: LineItem) => {
    setLines([...lines, { ...line, id: `temp-${Date.now()}` }]);
  };

  const handleUpdateLine = (index: number, updates: Partial<LineItem>) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], ...updates };
    setLines(newLines);
  };

  const handleDeleteLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

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
      
      // Ajouter les lignes si devis direct
      if (quoteType === "direct" && lines.length > 0) {
        const token = localStorage.getItem("jwt_token");
        for (const line of lines) {
          await fetch(`/api/workorders/${finalWorkOrderId}/lines`, {
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
              vatRate: line.vatRate,
              duration: line.duration,
              sourceId: line.sourceId,
              notes: line.notes,
            }),
          });
        }
      }
      
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
        📋 Créer un devis
      </DialogTitle>
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

              {/* Prestations et Pièces */}
              {quoteType === "direct" && (
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
          sx={{
            bgcolor: theme.primary,
            '&:hover': {
              bgcolor: theme.primaryDark
            }
          }}
        >
          {creating ? "Création..." : "Créer le devis"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
