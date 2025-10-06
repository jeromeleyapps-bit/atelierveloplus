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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TransformIcon from "@mui/icons-material/Transform";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
                <TableRow key={quote.id} hover>
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
                        href={`/finance/invoices/${quote.id}`}
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
    </Box>
  );
}
