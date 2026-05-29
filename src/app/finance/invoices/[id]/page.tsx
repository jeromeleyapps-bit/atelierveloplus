"use client";

// ✅ Hook personnalisé
import { useFinanceDocumentData } from '@/hooks/useFinanceDocumentData';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppSettings } from "@/lib/api";
import AddIcon from "@mui/icons-material/Add";
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

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EmailIcon from "@mui/icons-material/Email";
import PaymentIcon from "@mui/icons-material/Payment";
import StripePaymentDialog from "../../components/StripePaymentDialog";

// Composants réutilisables
import CustomerCard from "@/app/components/CustomerCard";
import BikeCard from "@/app/components/BikeCard";
import FinancialSummaryCard from "@/app/components/FinancialSummaryCard";

// Theme
import { usePageTheme } from "@/hooks/usePageTheme";
import { type PageTheme } from "@/lib/theme-colors";

// API
import { convertQuoteToInvoice, type InvoiceLine } from "@/lib/api";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import LineItemSelector from "@/app/components/LineItemSelector";
import EditInvoiceLineDialog from "@/app/components/EditInvoiceLineDialog";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export default function InvoiceDetailPageNew() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // ✅ Hook personnalisé
  const { document: inv, isLoading: loading, refetch: loadInvoice } = useFinanceDocumentData(id, 'invoice');
  const [converting, setConverting] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [stripePaymentOpen, setStripePaymentOpen] = useState(false);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [editLineDialogOpen, setEditLineDialogOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<InvoiceLine | null>(null);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  // Charger statut AE
  useEffect(() => {
    getAppSettings().then(settings => {
      setIsAutoEntrepreneur(settings?.isAutoEntrepreneur || false);
    });
  }, []);
  const [_newLine, _setNewLine] = useState({
    description: "",
    qty: 1,
    unitPriceHT: 0,
    vatRate: 20,
  });
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


  // Émettre la facture/devis
  async function handleIssue() {
    if (!inv || inv.status !== 'draft') return;
    if (!confirm('Émettre ce document ? Il ne pourra plus être modifié.')) return;
    
    setIssuing(true);
    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(`/api/finance/invoices/${id}/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!res.ok) throw new Error('Erreur lors de l\'émission');
      
      // ✅ FIX: Invalider le cache avant de refetch pour forcer le rechargement
      await queryClient.invalidateQueries({ queryKey: ['financeDocument', 'invoice', id] });
      await loadInvoice(); // Attendre le refetch
      setToast({ open: true, message: 'Document émis avec succès', severity: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur';
      setToast({ open: true, message, severity: 'error' });
    } finally {
      setIssuing(false);
    }
  }

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
    } catch (error) {
      logger.error('Error converting quote:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la conversion';
      setToast({
        open: true,
        message,
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
  const customer = (inv as { workOrder?: { customer?: { firstName?: string; lastName?: string } | null } })?.workOrder?.customer || null;
  const bike = (inv as { workOrder?: { bike?: { brand?: string; model?: string } | null } })?.workOrder?.bike || null;

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
        <ResponsiveContainer>
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
                onClick={() => loadInvoice()}
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
        </ResponsiveContainer>
      </Box>

      {/* Contenu principal */}
      <ResponsiveContainer sx={{ py: 3 }}>
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
                action={
                  inv?.status === "draft" && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => setAddLineDialogOpen(true)}
                      sx={{
                        bgcolor: theme.primary,
                        '&:hover': { bgcolor: theme.primaryDark }
                      }}
                    >
                      Ajouter une ligne
                    </Button>
                  )
                }
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
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(inv?.lines || []).map((line, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{line.description}</TableCell>
                        <TableCell align="right">{line.qty}</TableCell>
                        <TableCell align="right">{(line.unitPriceHT || 0).toFixed(2)} €</TableCell>
                        <TableCell align="right">{line.vatRate != null ? line.vatRate : (inv?.vatRate || 20)}%</TableCell>
                        <TableCell align="right">{((line.unitPriceHT || 0) * (line.qty || 0)).toFixed(2)} €</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedLine(line);
                                setEditLineDialogOpen(true);
                              }}
                              sx={{ color: theme.primary }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (!confirm('Supprimer cette ligne ?')) return;
                                try {
                                  const token = localStorage.getItem('jwt_token');
                                  const res = await fetch(`/api/finance/invoices/${id}/lines/${line.id}`, {
                                    method: 'DELETE',
                                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  });
                                  if (!res.ok) throw new Error('Erreur suppression');
                                  // ✅ FIX: Invalider le cache avant de refetch pour forcer le rechargement
                                  await queryClient.invalidateQueries({ queryKey: ['financeDocument', 'invoice', id] });
                                  await loadInvoice(); // Attendre le refetch
                                  setToast({ open: true, message: 'Ligne supprimée', severity: 'success' });
                                } catch (error) {
                                  logger.error("Error deleting line:", error);
                                  const message = error instanceof Error ? error.message : 'Erreur suppression';
                                  setToast({ open: true, message, severity: 'error' });
                                }
                              }}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!inv?.lines || inv.lines.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
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
              isAutoEntrepreneur={isAutoEntrepreneur}
              elevation={0}
              highlighted={true}
            />

            {/* Actions rapides */}
            <Card elevation={0} sx={{ mt: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
              <CardHeader title="Actions" />
              <CardContent>
                <Stack spacing={2}>
                  {inv?.status === 'draft' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ReceiptIcon />}
                      onClick={handleIssue}
                      disabled={issuing}
                      sx={{
                        bgcolor: '#10b981',
                        color: 'white',
                        '&:hover': {
                          bgcolor: '#059669'
                        }
                      }}
                    >
                      {issuing ? 'Émission...' : 'Émettre'}
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PictureAsPdfIcon />}
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/finance/invoices/${id}/pdf`);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${inv?.type === 'quote' ? 'devis' : 'facture'}-${inv?.number || id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        logger.error('Erreur téléchargement PDF:', error);
                      }
                    }}
                    sx={{
                      bgcolor: theme.primary,
                      '&:hover': {
                        bgcolor: theme.primaryDark
                      }
                    }}
                  >
                    Télécharger PDF
                  </Button>
                  {inv?.type === 'quote' && inv?.status !== 'draft' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ReceiptIcon />}
                      onClick={handleConvertToInvoice}
                      disabled={converting || inv?.convertedAt != null}
                      sx={{
                        bgcolor: '#0ea5e9',
                        '&:hover': {
                          bgcolor: '#0284c7'
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
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('jwt_token');
                        const res = await fetch(`/api/finance/invoices/${id}/send-email`, { 
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                        });
                        if (!res.ok) {
                          const error = await res.json().catch(() => ({}));
                          const message = error.message || error.error || 'Erreur envoi email';
                          throw new Error(message);
                        }
                        setToast({ open: true, message: "Email envoyé avec succès", severity: "success" });
                      } catch (error) {
                        logger.error('Email error:', error);
                        const message = error instanceof Error ? error.message : "Erreur lors de l'envoi";
                        setToast({ open: true, message, severity: "error" });
                      }
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

                  {inv?.status === 'issued' && inv?.type === 'invoice' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PaymentIcon />}
                      onClick={() => setStripePaymentOpen(true)}
                      sx={{
                        bgcolor: '#635bff', // Stripe purple
                        '&:hover': { bgcolor: '#4f46e5' },
                      }}
                    >
                      {inv?.stripePaymentStatus === 'paid' ? 'Paiement Stripe (payée)' : 'Lien de paiement Stripe'}
                    </Button>
                  )}
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
                      <Typography variant="caption" color="text.secondary">Date d&apos;émission</Typography>
                      <Typography variant="body2">{new Date(inv.issueDate).toLocaleDateString("fr-FR")}</Typography>
                    </Box>
                  )}
                  {inv?.dueDate && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Date d&apos;échéance</Typography>
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
      </ResponsiveContainer>

      {/* Dialog Ajout Ligne avec LineItemSelector */}
      <Dialog open={addLineDialogOpen} onClose={() => setAddLineDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: theme.primaryLight, color: theme.text }}>
          Ajouter une ligne
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <LineItemSelector
            isAutoEntrepreneur={isAutoEntrepreneur}
            onAddLine={async (line) => {
              try {
                const token = localStorage.getItem("jwt_token");
                const response = await fetch(`/api/finance/invoices/${id}/lines`, {
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
                    sourceId: line.sourceId,
                    duration: line.duration,
                  }),
                });
                
                if (!response.ok) {
                  throw new Error("Erreur lors de l'ajout de la ligne");
                }
                
                // ✅ FIX: Invalider le cache avant de refetch pour forcer le rechargement
                await queryClient.invalidateQueries({ queryKey: ['financeDocument', 'invoice', id] });
                setAddLineDialogOpen(false);
                await loadInvoice(); // Attendre le refetch
                setToast({ open: true, message: "Ligne ajoutée", severity: "success" });
              } catch (error) {
                logger.error("Error adding line:", error);
                const message = error instanceof Error ? error.message : "Erreur lors de l'ajout";
                setToast({ open: true, message, severity: "error" });
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddLineDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Édition Ligne */}
      <EditInvoiceLineDialog
        open={editLineDialogOpen}
        onClose={() => {
          setEditLineDialogOpen(false);
          setSelectedLine(null);
        }}
        line={selectedLine}
        isAutoEntrepreneur={isAutoEntrepreneur}
        onSave={async (updatedData) => {
          if (!selectedLine) return;
          try {
            const token = localStorage.getItem('jwt_token');
            const res = await fetch(`/api/finance/invoices/${id}/lines/${selectedLine.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error('Erreur mise à jour');
            // ✅ FIX: Invalider le cache avant de refetch pour forcer le rechargement
            await queryClient.invalidateQueries({ queryKey: ['financeDocument', 'invoice', id] });
            await loadInvoice(); // Attendre le refetch
            setToast({ open: true, message: 'Ligne mise à jour', severity: 'success' });
          } catch (error) {
            logger.error("Error updating line:", error);
            const message = error instanceof Error ? error.message : 'Erreur mise à jour';
            setToast({ open: true, message, severity: 'error' });
          }
        }}
      />

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

      {inv && (
        <StripePaymentDialog
          open={stripePaymentOpen}
          invoiceId={inv.id}
          invoiceNumber={inv.number || inv.id}
          customerEmail={inv.WorkOrder?.Customer?.email || null}
          onClose={() => setStripePaymentOpen(false)}
          onPaid={() => {
            setToast({ open: true, message: 'Facture marquée comme payée.', severity: 'success' });
            queryClient.invalidateQueries({ queryKey: ['financeDocument', 'invoice', id] });
          }}
        />
      )}
    </>
  );
}
