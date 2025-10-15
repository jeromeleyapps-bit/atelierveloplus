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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EmailIcon from "@mui/icons-material/Email";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

// Composants réutilisables
import CustomerCard from "@/app/components/CustomerCard";
import BikeCard from "@/app/components/BikeCard";
import FinancialSummaryCard from "@/app/components/FinancialSummaryCard";

// Theme
import { usePageTheme } from "@/hooks/usePageTheme";
import { type PageTheme } from "@/lib/theme-colors";

// API
import { getInvoice, convertQuoteToInvoice, type Invoice, type InvoiceLine } from "@/lib/api";

export const dynamic = 'force-dynamic';

export default function InvoiceDetailPageNew() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // États principaux
  const [inv, setInv] = useState<(Invoice & { lines: InvoiceLine[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // Déterminer le type de document
  const documentType = inv?.type === "quote" ? "Devis" : inv?.type === "credit" ? "Avoir" : "Facture";
  const documentIcon = inv?.type === "quote" ? "📋" : inv?.type === "credit" ? "🔄" : "💰";
  const backUrl = inv?.type === "quote" ? "/finance?tab=quotes" : inv?.type === "credit" ? "/finance?tab=credits" : "/finance?tab=invoices";
  const backLabel = inv?.type === "quote" ? "Retour aux devis" : inv?.type === "credit" ? "Retour aux avoirs" : "Retour aux factures";
  
  // Thème de couleur selon le type de document
  const themeType: PageTheme = inv?.type === "quote" ? "quote" : inv?.type === "credit" ? "credit" : "invoice";
  const theme = usePageTheme(themeType);

  // Chargement du document
  async function loadInvoice() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getInvoice(id);
      setInv(data as any);
    } catch (error) {
      console.error("Error loading invoice:", error);
      setToast({
        open: true,
        message: "Erreur de chargement",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  // Convertir devis en facture
  async function handleConvertToInvoice() {
    if (!inv || inv.type !== 'quote') return;
    if (!confirm('Convertir ce devis en facture ? Le devis sera marqué comme converti.')) return;
    
    setConverting(true);
    try {
      const result = await convertQuoteToInvoice(id);
      setToast({
        open: true,
        message: 'Devis converti en facture avec succès !',
        severity: 'success'
      });
      // Rediriger vers la nouvelle facture
      setTimeout(() => {
        router.push(`/finance/invoices/${result.invoice.id}`);
      }, 1000);
    } catch (error: any) {
      console.error('Error converting quote:', error);
      setToast({
        open: true,
        message: error.message || 'Erreur lors de la conversion',
        severity: 'error'
      });
    } finally {
      setConverting(false);
    }
  }

  // Calcul totaux
  function calculateTotals() {
    if (!inv) return { totalHT: 0, totalTVA: 0, totalTTC: 0 };
    
    const totalHT = (inv.lines || []).reduce((sum, line) => sum + ((line.unitPriceHT || 0) * (line.qty || 0)), 0);
    const totalTVA = (inv.lines || []).reduce((sum, line) => {
      const lineHT = (line.unitPriceHT || 0) * (line.qty || 0);
      return sum + (lineHT * ((line.vatRate || inv.vatRate || 0) / 100));
    }, 0);
    const totalTTC = totalHT + totalTVA;

    return { totalHT, totalTVA, totalTTC };
  }

  const totals = calculateTotals();

  // Client info
  const customer = (inv as any)?.workOrder?.customer || null;
  const bike = (inv as any)?.workOrder?.bike || null;

  if (loading && !inv) {
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
                {documentIcon} {documentType} {inv?.number || "(brouillon)"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {inv?.issueDate ? `Émis le ${new Date(inv.issueDate).toLocaleDateString("fr-FR")}` : "Brouillon"}
                {customer && ` • ${customer.firstName} ${customer.lastName}`}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              {inv?.status && (
                <Chip
                  label={inv.status === 'draft' ? 'Brouillon' : inv.status === 'issued' ? 'Émis' : inv.status === 'paid' ? 'Payé' : inv.status}
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
                onClick={loadInvoice}
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
                onClick={() => router.push(backUrl)}
                sx={{
                  borderColor: theme.primary,
                  color: theme.text,
                  '&:hover': {
                    borderColor: theme.primaryDark,
                    bgcolor: theme.primaryLight
                  }
                }}
              >
                {backLabel}
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
            {customer && (
              <CustomerCard
                customer={customer}
                elevation={0}
              />
            )}

            {/* Bike Card */}
            {bike && (
              <Box sx={{ mt: 3 }}>
                <BikeCard
                  bike={bike}
                  elevation={0}
                />
              </Box>
            )}

            {/* Lignes du document */}
            <Card elevation={0} sx={{ mt: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
              <CardHeader
                title="Lignes"
              />
              <CardContent>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qté</TableCell>
                      <TableCell align="right">Prix HT</TableCell>
                      <TableCell align="right">TVA</TableCell>
                      <TableCell align="right">Total HT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(inv?.lines || []).map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell align="right">{line.qty}</TableCell>
                        <TableCell align="right">{(line.unitPriceHT || 0).toFixed(2)} €</TableCell>
                        <TableCell align="right">{line.vatRate || inv?.vatRate || 0}%</TableCell>
                        <TableCell align="right">{((line.unitPriceHT || 0) * (line.qty || 0)).toFixed(2)} €</TableCell>
                      </TableRow>
                    ))}
                    {(!inv?.lines || inv.lines.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Aucune ligne
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Colonne Droite - 4/12 */}
          <Grid item xs={12} md={4}>
            {/* Résumé Financier */}
            <FinancialSummaryCard
              totals={totals}
              isAutoEntrepreneur={false}
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
                    startIcon={<PictureAsPdfIcon />}
                    onClick={() => window.open(`/api/finance/invoices/${id}/pdf`, '_blank')}
                    sx={{
                      bgcolor: theme.primary,
                      '&:hover': {
                        bgcolor: theme.primaryDark
                      }
                    }}
                  >
                    Télécharger PDF
                  </Button>
                  {inv?.type === 'quote' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ReceiptIcon />}
                      onClick={handleConvertToInvoice}
                      disabled={converting || inv?.convertedAt != null}
                      sx={{
                        bgcolor: '#81C784',
                        '&:hover': {
                          bgcolor: '#66BB6A'
                        }
                      }}
                    >
                      {converting ? 'Conversion...' : inv?.convertedAt ? 'Déjà converti' : 'Convertir en Facture'}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<EmailIcon />}
                    onClick={() => {
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
                    Envoyer par Email
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Informations */}
            <Card elevation={0} sx={{ mt: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
              <CardHeader title="Informations" />
              <CardContent>
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Numéro</Typography>
                    <Typography variant="body2">{inv?.number || "Non attribué"}</Typography>
                  </Box>
                  {inv?.issueDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date d'émission</Typography>
                      <Typography variant="body2">{new Date(inv.issueDate).toLocaleDateString("fr-FR")}</Typography>
                    </Box>
                  )}
                  {inv?.dueDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date d'échéance</Typography>
                      <Typography variant="body2">{new Date(inv.dueDate).toLocaleDateString("fr-FR")}</Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="caption" color="text.secondary">Statut</Typography>
                    <Typography variant="body2">{inv?.status || "Inconnu"}</Typography>
                  </Box>
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
    </>
  );
}
