"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import ResponsiveContainer from "@/components/ResponsiveContainer";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

// Composants réutilisables
import CustomerCard from "@/app/components/CustomerCard";
import BikeCard from "@/app/components/BikeCard";
import FinancialSummaryCard from "@/app/components/FinancialSummaryCard";
import LineItemsTable from "@/app/components/LineItemsTable";
import LineItemSelector, { type LineItem } from "@/app/components/LineItemSelector";
import CreateQuoteDialog from "@/app/finance/components/CreateQuoteDialog";
import RequireAuth from "@/app/components/RequireAuth";

// API
import { getWorkOrder, startWorkOrder, type WorkOrder } from "@/lib/api";
import { useRepairTimer } from "@/contexts/RepairTimerContext";
import { useAuth } from "@/app/auth/AuthContext";

// Theme
import { usePageTheme } from "@/hooks/usePageTheme";
import { logger } from '@/lib/logger';

function TicketDetailPageContent() {
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
  const [invoice, setInvoice] = useState<{ id: string; workOrderId?: string; type?: string } | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // Timer de réparation
  const { startRepair } = useRepairTimer();
  const [starting, setStarting] = useState(false);

  // Chargement du ticket
  async function loadTicket() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getWorkOrder(id);
      setWo(data);
    } catch (error) {
      logger.error("Error loading ticket:", error);
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
      logger.error("Error loading lines:", error);
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
      logger.error("Error loading settings:", error);
    }
  }

  // Chargement facture du ticket
  async function loadInvoice() {
    if (!id) return;
    setLoadingInvoice(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/finance/invoices?q=${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const invoices: Array<{ id: string; workOrderId?: string; type?: string }> = await response.json();
        // Trouver facture pour ce workOrder
        const inv = invoices.find((i) => i.workOrderId === id && i.type === 'invoice');
        setInvoice(inv || null);
      }
    } catch (error) {
      logger.error("Error loading invoice:", error);
    } finally {
      setLoadingInvoice(false);
    }
  }

  // Refresh complet
  async function refresh() {
    await Promise.all([loadTicket(), loadLines(), loadUserSettings(), loadInvoice()]);
  }

  const { ready } = useAuth();

  // Attendre que l'authentification soit prête avant de charger les données
  useEffect(() => {
    if (!ready || !id) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh uses stable functions that depend on id (already in deps)
  }, [id, ready]);

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
      logger.error("Error adding line:", error);
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
      logger.error("Error updating line:", error);
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
      logger.error("Error deleting line:", error);
      setToast({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  }

  // Calcul totaux (incluant main d'œuvre)
  function calculateTotals() {
    let totalHT = 0;
    let tva0 = 0;
    let tva10 = 0;
    let tva20 = 0;

    // 1. Calculer la main d'œuvre (facturation par tranches de 30 min)
    let laborCostHT = 0;
    if (wo?.estimatedMinutes && wo?.hourlyRate) {
      // Arrondir au 30 min supérieur
      const roundedMinutes = Math.ceil(wo.estimatedMinutes / 30) * 30;
      laborCostHT = (roundedMinutes / 60) * wo.hourlyRate;
      totalHT += laborCostHT;
      
      // TVA main d'œuvre: 10% (0% si auto-entrepreneur)
      if (!isAutoEntrepreneur) {
        const laborTVA = laborCostHT * 0.1;
        tva10 += laborTVA;
      }
    }

    // 2. Calculer les pièces
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

    return { totalHT, tva0, tva10, tva20, totalTVA, totalTTC, laborCostHT };
  }

  const totals = calculateTotals();

  // Créer ligne virtuelle main d'œuvre pour affichage
  const laborLine: LineItem | null = (wo?.estimatedMinutes && wo?.hourlyRate && totals.laborCostHT > 0) ? {
    id: 'labor-virtual',
    description: `Main d'œuvre - ${wo.estimatedMinutes} minutes`,
    quantity: 1,
    priceHT: totals.laborCostHT,
    vatRate: isAutoEntrepreneur ? 0 : 10, // 10% TVA main d'œuvre (0% si AE)
    type: 'service', // Type "service" pour main d'œuvre (LineItem n'a pas "labor")
  } : null;

  // Combiner main d'œuvre + pièces pour affichage
  const allLines: LineItem[] = laborLine ? [laborLine, ...lines] : lines;

  // Mapper status vers français
  const statusLabels: Record<string, string> = {
    'created': 'Créé',
    'in_progress': 'En Cours',
    'pending': 'En Attente',
    'ready': 'Prêt',
    'completed': 'Terminé',
    'cancelled': 'Annulé',
    'delivered': 'Livré'
  };

  // Nom complet client
  const fullName = wo?.Customer
    ? `${wo.Customer.firstName || ""} ${wo.Customer.lastName || ""}`.trim()
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
      <Box 
        suppressHydrationWarning
        sx={{ 
          bgcolor: theme.background, 
          borderBottom: 2, 
          borderColor: theme.border, 
          px: 3, 
          py: 2 
        }}
      >
        <ResponsiveContainer>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: theme.text }}>
                🔧 Ticket #{id.slice(-8)}
              </Typography>
              <Typography variant="body2" color="text.secondary" suppressHydrationWarning>
                Créé le {wo?.createdAt ? new Date(wo.createdAt).toLocaleDateString("fr-FR") : ""}
                {fullName && ` • ${fullName}`}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              {wo?.status && (
                <Chip
                  label={statusLabels[wo.status] || wo.status}
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
        </ResponsiveContainer>
      </Box>

      {/* Contenu principal */}
      <ResponsiveContainer sx={{ py: 3 }}>
        <Grid container spacing={3}>
          {/* Colonne Gauche - 8/12 */}
          <Grid item xs={12} md={8}>
            {/* Client Card */}
            <CustomerCard
              customer={wo?.Customer || null}
              elevation={0}
            />

            {/* Bike Card */}
            {wo?.CustomerBike && (
              <Box sx={{ mt: 3 }}>
                <BikeCard
                  bike={wo.CustomerBike}
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
                    isAutoEntrepreneur={isAutoEntrepreneur}
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
                    lines={allLines}
                    onUpdateLine={(index, updates) => {
                      // Ne pas permettre la modification de la ligne main d'œuvre virtuelle
                      if (allLines[index]?.id === 'labor-virtual') return;
                      // Ajuster l'index si main d'œuvre présente
                      const realIndex = laborLine ? index - 1 : index;
                      if (realIndex >= 0) handleUpdateLine(realIndex, updates);
                    }}
                    onDeleteLine={(index) => {
                      // Ne pas permettre la suppression de la ligne main d'œuvre virtuelle
                      if (allLines[index]?.id === 'labor-virtual') return;
                      // Ajuster l'index si main d'œuvre présente
                      const realIndex = laborLine ? index - 1 : index;
                      if (realIndex >= 0) handleDeleteLine(realIndex);
                    }}
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
                  {wo?.status === 'created' && (
                    <Button
                      variant="contained"
                      fullWidth
                      color="success"
                      startIcon={<PlayArrowIcon />}
                      disabled={starting}
                      onClick={async () => {
                        setStarting(true);
                        try {
                          await startWorkOrder(id);
                          // Démarrer le chronomètre
                          startRepair(id);
                          // Recharger le ticket pour mettre à jour le status
                          await loadTicket();
                          setToast({ open: true, message: "Réparation démarrée", severity: "success" });
                        } catch (error) {
                          logger.error('Start error:', error);
                          setToast({ open: true, message: "Erreur lors du démarrage", severity: "error" });
                        } finally {
                          setStarting(false);
                        }
                      }}
                      sx={{
                        '&:hover': {
                          bgcolor: 'success.dark'
                        }
                      }}
                    >
                      {starting ? 'Démarrage...' : 'Démarrer la réparation'}
                    </Button>
                  )}
                  {/* Logique conditionnelle: Devis OU Facture selon workflow */}
                  {wo?.estimatedMinutes && wo.estimatedMinutes > 0 ? (
                    // Travail commencé (chrono arrêté) → Facture directement
                    <>
                      <Alert severity="info" sx={{ mb: 1 }}>
                        <strong>Travail commencé</strong> ({wo.estimatedMinutes} min)
                        <br />
                        Créez la facture directement avec la main d&apos;œuvre.
                      </Alert>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<ReceiptIcon />}
                        onClick={async () => {
                      if (invoice) {
                        // Facture existe, rediriger pour éditer
                        router.push(`/finance/invoices/${invoice.id}`);
                      } else {
                        // Créer nouvelle facture
                        try {
                          const token = localStorage.getItem("jwt_token");
                          const res = await fetch("/api/finance/invoices", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({
                              workOrderId: id,
                              pricingMode: "HT_TVA",
                              currency: "EUR",
                              vatRate: 20,
                              laborRate: 60,
                            }),
                          });
                          if (res.ok) {
                            const newInvoice: { id: string } = await res.json();
                            router.push(`/finance/invoices/${newInvoice.id}`);
                          } else {
                            throw new Error("Erreur création facture");
                          }
                        } catch (_error) {
                          setToast({ open: true, message: "Erreur lors de la création", severity: "error" });
                        }
                      }
                    }}
                        disabled={loadingInvoice}
                        sx={{
                          bgcolor: theme.primary,
                          '&:hover': {
                            bgcolor: theme.primaryDark
                          }
                        }}
                      >
                        {loadingInvoice ? 'Chargement...' : invoice ? 'Éditer Facture' : 'Créer Facture'}
                      </Button>
                    </>
                  ) : (
                    // Pas de travail commencé → Devis + Facture
                    <>
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
                        onClick={async () => {
                          if (invoice) {
                            // Facture existe, rediriger pour éditer
                            router.push(`/finance/invoices/${invoice.id}`);
                          } else {
                            // Créer nouvelle facture
                            try {
                              const token = localStorage.getItem("jwt_token");
                              const res = await fetch("/api/finance/invoices", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({
                                  workOrderId: id,
                                  pricingMode: "HT_TVA",
                                  currency: "EUR",
                                  vatRate: 20,
                                  laborRate: 60,
                                }),
                              });
                              if (res.ok) {
                                const newInvoice: { id: string } = await res.json();
                                router.push(`/finance/invoices/${newInvoice.id}`);
                              } else {
                                throw new Error("Erreur création facture");
                              }
                            } catch (_error) {
                              setToast({ open: true, message: "Erreur lors de la création", severity: "error" });
                            }
                          }
                        }}
                        disabled={loadingInvoice}
                        sx={{
                          borderColor: theme.primary,
                          color: theme.text,
                          '&:hover': {
                            borderColor: theme.primaryDark,
                            bgcolor: theme.primaryLight
                          }
                        }}
                      >
                        {loadingInvoice ? 'Chargement...' : invoice ? 'Éditer Facture' : 'Créer Facture'}
                      </Button>
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </ResponsiveContainer>

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

// Wrapper avec protection d'authentification
export default function TicketDetailPageNew() {
  return (
    <RequireAuth>
      <TicketDetailPageContent />
    </RequireAuth>
  );
}
