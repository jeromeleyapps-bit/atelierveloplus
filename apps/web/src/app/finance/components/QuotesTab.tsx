"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Checkbox,
  Snackbar,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TransformIcon from "@mui/icons-material/Transform";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import DeleteIcon from "@mui/icons-material/Delete";
import EmailIcon from "@mui/icons-material/Email";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Link from "next/link";
import { convertQuoteToInvoice, type Invoice } from "@/lib/api";
import CreateQuoteDialog from "./CreateQuoteDialog";

interface QuotesTabProps {
  quotes: Invoice[];
  onRefresh: () => void;
}

export default function QuotesTab({ quotes, onRefresh }: QuotesTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" }>({ open: false, message: "", severity: "success" });

  const handleConvert = async (quoteId: string) => {
    if (!confirm("Convertir ce devis en facture ?")) return;

    setConverting(quoteId);
    try {
      const result = await convertQuoteToInvoice(quoteId);
      alert("Facture créée avec succès !");
      window.location.href = `/finance/invoices/${result.invoice.id}`;
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setConverting(null);
    }
  };

  const getStatusLabel = (quote: Invoice) => {
    if (quote.convertedAt) return "Converti";
    if (quote.status === "draft") return "Brouillon";
    if (quote.status === "issued") return "Envoyé";
    return quote.status;
  };

  const getStatusColor = (quote: Invoice): "success" | "warning" | "default" | "info" => {
    if (quote.convertedAt) return "success";
    if (quote.status === "draft") return "warning";
    if (quote.status === "issued") return "info";
    return "default";
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5">Devis</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Créer un devis
        </Button>
      </Stack>

      {/* Bandeau d'actions groupées */}
      {selected.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'action.hover', border: '2px solid', borderColor: 'divider' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 2 }}>
              {selected.length} devis sélectionné{selected.length > 1 ? 's' : ''}
            </Typography>
            <Button 
              size="small" 
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => {
                selected.forEach(id => {
                  window.open(`/api/finance/invoices/${id}/pdf`, '_blank');
                });
              }}
            >
              Télécharger PDF
            </Button>
            <Button 
              size="small" 
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={async () => {
                for (const id of selected) {
                  try {
                    await fetch(`/api/finance/invoices/${id}/email`, { method: 'POST' });
                  } catch (e) {
                    console.error('Email error:', e);
                  }
                }
                setToast({ open: true, message: `${selected.length} devis envoyé${selected.length > 1 ? 's' : ''}`, severity: 'success' });
              }}
            >
              Envoyer par email
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="error"
              startIcon={<DeleteIcon />}
              onClick={async () => {
                if (!confirm(`Supprimer définitivement ${selected.length} devis ? Cette action est irréversible.`)) return;
                let successCount = 0;
                const userId = window.localStorage.getItem("auth:userId");
                for (const id of selected) {
                  try {
                    const res = await fetch(`/api/finance/invoices/${id}`, { 
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': userId || '',
                      }
                    });
                    if (res.ok) successCount++;
                  } catch (e) {
                    console.error('Delete error:', e);
                  }
                }
                setToast({ open: true, message: `${successCount} devis supprimé${successCount > 1 ? 's' : ''}`, severity: 'success' });
                setSelected([]);
                onRefresh();
              }}
            >
              Supprimer
            </Button>
            <Button 
              size="small" 
              variant="text"
              onClick={() => setSelected([])}
            >
              Annuler sélection
            </Button>
          </Stack>
        </Paper>
      )}

      {quotes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Aucun devis
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Créez votre premier devis pour commencer
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Créer un devis
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < quotes.length}
                    checked={quotes.length > 0 && selected.length === quotes.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(quotes.map(q => q.id)); else setSelected([]);
                    }}
                  />
                </TableCell>
                <TableCell>Numéro</TableCell>
                <TableCell>Date création</TableCell>
                <TableCell>Valide jusqu'au</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Montant TTC</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id} hover selected={selected.includes(quote.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected.includes(quote.id)}
                      onChange={(e) => {
                        setSelected((prev) => e.target.checked ? Array.from(new Set([...prev, quote.id])) : prev.filter(id => id !== quote.id));
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {quote.number || "Brouillon"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {quote.validUntil ? (
                      <Typography
                        variant="body2"
                        color={
                          new Date(quote.validUntil) < new Date()
                            ? "error"
                            : "text.primary"
                        }
                      >
                        {new Date(quote.validUntil).toLocaleDateString("fr-FR")}
                      </Typography>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={getStatusLabel(quote)}
                      color={getStatusColor(quote)}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {quote.totalTTC.toFixed(2)} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="outlined"
                        component={Link}
                        href={`/finance/quotes/${quote.id}`}
                        startIcon={<OpenInNewIcon />}
                      >
                        Voir
                      </Button>
                      {!quote.convertedAt && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<TransformIcon />}
                          onClick={() => handleConvert(quote.id)}
                          disabled={converting === quote.id}
                        >
                          {converting === quote.id ? "..." : "Convertir"}
                        </Button>
                      )}
                      {quote.convertedAt && quote.convertedToId && (
                        <Button
                          size="small"
                          variant="text"
                          component={Link}
                          href={`/finance/invoices/${quote.convertedToId}`}
                        >
                          Voir facture
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CreateQuoteDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={(quoteId) => {
          setCreateDialogOpen(false);
          onRefresh();
        }}
      />

      <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
