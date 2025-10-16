"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Container,
  Grid,
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";

// Composants réutilisables
import CustomerCard from "@/app/components/CustomerCard";
import BikeCard from "@/app/components/BikeCard";
import FinancialSummaryCard from "@/app/components/FinancialSummaryCard";
import LineItemsTable from "@/app/components/LineItemsTable";
import LineItemSelector, { type LineItem } from "@/app/components/LineItemSelector";
import CreateQuoteDialog from "@/app/finance/components/CreateQuoteDialog";

// API
import { getWorkOrder, type WorkOrder } from "@/lib/api";

// Theme
import { usePageTheme } from "@/hooks/usePageTheme";

export default function TicketDetailPageNew() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const theme = usePageTheme('ticket');

  // États principaux
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // Chargement du ticket
  async function loadTicket() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getWorkOrder(id);
      setWo(data);
    } catch (error) {
      console.error("Error loading ticket:", error);
      setToast({
        open: true,
        message: "Erreur de chargement du ticket",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // Chargement des lignes
  async function loadLines() {
    if (!id) return;
    setLoadingLines(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        const linesArray = Array.isArray(data) ? data : (data.lines || []);
        setLines(linesArray);
      }
    } catch (error) {
      console.error("Error loading lines:", error);
    } finally {
      setLoadingLines(false);
    }
  }

  // Chargement paramètres utilisateur
  async function loadUserSettings() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/account/settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  // Refresh complet
  async function refresh() {
    await Promise.all([loadTicket(), loadLines(), loadUserSettings()]);
  }

  useEffect(() => {
    if (id) {
      refresh();
    }
  }, [id]);

  // Gestion lignes
  async function handleAddLine(line: LineItem) {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines`, {
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

      if (response.ok) {
        await loadLines();
        setToast({ open: true, message: "Ligne ajoutée", severity: "success" });
      } else {
        throw new Error("Failed to add line");
      }
    } catch (error) {
      console.error("Error adding line:", error);
      setToast({ open: true, message: "Erreur lors de l'ajout", severity: "error" });
    }
  }

  async function handleUpdateLine(index: number, updates: Partial<LineItem>) {
    const line = lines[index];
    if (!line.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadLines();
      } else {
        throw new Error("Failed to update line");
      }
    } catch (error) {
      console.error("Error updating line:", error);
      setToast({ open: true, message: "Erreur lors de la modification", severity: "error" });
    }
  }

  async function handleDeleteLine(index: number) {
    const line = lines[index];
    if (!line.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        await loadLines();
        setToast({ open: true, message: "Ligne supprimée", severity: "success" });
      } else {
        throw new Error("Failed to delete line");
      }
    } catch (error) {
      console.error("Error deleting line:", error);
      setToast({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  }

  // Calcul totaux
  function calculateTotals() {
    let totalHT = 0;
    let tva0 = 0;
    let tva10 = 0;
    let tva20 = 0;

    lines.forEach(line => {
      const lineHT = line.priceHT * line.quantity;
      totalHT += lineHT;

      if (isAutoEntrepreneur) {
        // Pas de TVA pour auto-entrepreneur
        return;
      }

      const lineTVA = lineHT * (line.vatRate / 100);
      if (line.vatRate === 0) tva0 += lineTVA;
      else if (line.vatRate === 10) tva10 += lineTVA;
      else if (line.vatRate === 20) tva20 += lineTVA;
    });

    const totalTVA = tva0 + tva10 + tva20;
    const totalTTC = totalHT + totalTVA;

    return { totalHT, tva0, tva10, tva20, totalTVA, totalTTC };
  }

  const totals = calculateTotals();

  // Nom complet client
  const fullName = wo?.customer
    ? `${wo.customer.firstName || ""} ${wo.customer.lastName || ""}`.trim()
    : "";

  if (loading && !wo) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      {/* Header moderne avec thème */}
      <Box sx={{ 
        bgcolor: theme.background, 
        borderBottom: 2, 
        borderColor: theme.border, 
        px: 3, 
        py: 2 
      }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: theme.text }}>
                🔧 Ticket #{id.slice(-8)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Créé le {wo?.createdAt ? new Date(wo.createdAt).toLocaleDateString("fr-FR") : ""}
                {fullName && ` • ${fullName}`}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              {wo?.status && (
                <Chip
                  label={wo.status}
                  sx={{
                    bgcolor: theme.primary,
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                  size="medium"
                />
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={refresh}
                sx={{
                  borderColor: theme.primary,
                  color: theme.text,
                  '&:hover': {
                    borderColor: theme.primaryDark,
                    bgcolor: theme.primaryLight
                  }
                }}
              >
                Actualiser
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => router.push('/tickets')}
                sx={{
                  borderColor: theme.primary,
                  color: theme.text,
                  '&:hover': {
                    borderColor: theme.primaryDark,
                    bgcolor: theme.primaryLight
                  }
                }}
              >
                Retour
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Contenu principal */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Colonne Gauche - 8/12 */}
          <Grid item xs={12} md={8}>
            {/* Client Card */}
            <CustomerCard
              customer={wo?.customer || null}
              elevation={0}
            />

            {/* Bike Card */}
            {wo?.bike && (
              <Box sx={{ mt: 3 }}>
                <BikeCard
                  bike={wo.bike}
                  elevation={0}
                />
              </Box>
            )}

            {/* Prestations et Pièces */}
            <Card elevation={0} sx={{ mt: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
              <CardHeader
                title="Prestations et Pièces"
                action={
                  <LineItemSelector
                    onAddLine={handleAddLine}
                    bikeType={undefined}
                  />
                }
              />
              <CardContent>
                {loadingLines ? (
                  <Box sx={{ textAlign: "center", py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <LineItemsTable
                    lines={lines}
                    onUpdateLine={handleUpdateLine}
                    onDeleteLine={handleDeleteLine}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Colonne Droite - 4/12 */}
          <Grid item xs={12} md={4}>
            {/* Résumé Financier */}
            <FinancialSummaryCard
              totals={totals}
              isAutoEntrepreneur={isAutoEntrepreneur}
              elevation={0}
              highlighted={true}
            />

            {/* Actions rapides */}
            <Card elevation={0} sx={{ mt: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
              <CardHeader title="Actions" />
              <CardContent>
                <Stack spacing={2}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<DescriptionIcon />}
                    onClick={() => setQuoteDialogOpen(true)}
                    sx={{
                      bgcolor: theme.primary,
                      '&:hover': {
                        bgcolor: theme.primaryDark
                      }
                    }}
                  >
                    Créer un Devis
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<ReceiptIcon />}
                    onClick={() => {
                      // TODO: Implémenter création facture
                      setToast({ open: true, message: "Fonctionnalité à venir", severity: "info" });
                    }}
                    sx={{
                      borderColor: theme.primary,
                      color: theme.text,
                      '&:hover': {
                        borderColor: theme.primaryDark,
                        bgcolor: theme.primaryLight
                      }
                    }}
                  >
                    Créer Facture
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Toast notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Dialog Création Devis */}
      <CreateQuoteDialog
        open={quoteDialogOpen}
        onClose={() => setQuoteDialogOpen(false)}
        onSuccess={(quoteId) => {
          setQuoteDialogOpen(false);
          setToast({
            open: true,
            message: "Devis créé avec succès !",
            severity: "success"
          });
          // Rediriger vers le devis
          router.push(`/finance/quotes/${quoteId}`);
        }}
      />
    </>
  );
}
