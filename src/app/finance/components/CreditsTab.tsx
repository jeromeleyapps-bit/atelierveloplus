"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SearchIcon from "@mui/icons-material/Search";
import Link from "next/link";
import { type Invoice } from "@/lib/api";

interface CreditsTabProps {
  credits: Invoice[];
  paidInvoices: Invoice[];
  onRefresh: () => void;
}

export default function CreditsTab({ credits, paidInvoices, onRefresh: _onRefresh }: CreditsTabProps) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filtrage des factures payées
  const filteredPaidInvoices = useMemo(() => {
    return paidInvoices.filter(invoice => {
      // Filtre par recherche (numéro ou client)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchNumber = invoice.number?.toLowerCase().includes(query);
        const matchCustomer = invoice.customerName?.toLowerCase().includes(query);
        if (!matchNumber && !matchCustomer) return false;
      }

      // Filtre par date
      if (dateFrom && invoice.paidAt) {
        if (new Date(invoice.paidAt) < new Date(dateFrom)) return false;
      }
      if (dateTo && invoice.paidAt) {
        if (new Date(invoice.paidAt) > new Date(dateTo + "T23:59:59")) return false;
      }

      return true;
    });
  }, [paidInvoices, searchQuery, dateFrom, dateTo]);

  const handleCreateCredit = async (invoiceId: string) => {
    if (!confirm("Créer un avoir pour cette facture ?")) return;

    setCreating(invoiceId);
    try {
      const res = await fetch(`/api/finance/invoices/${invoiceId}/credit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur création avoir");
      
      alert("Avoir créé avec succès !");
      router.push(`/finance/invoices/${data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      alert(`Erreur: ${message}`);
    } finally {
      setCreating(null);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Avoirs
      </Typography>

      {/* Section: Factures payées */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Factures payées (éligibles pour avoir)
        </Typography>

        {/* Filtres de recherche */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            size="small"
            placeholder="Rechercher par n° ou client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            size="small"
            label="Du"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: "100%", md: 180 } }}
          />
          <TextField
            size="small"
            label="Au"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ width: { xs: "100%", md: 180 } }}
          />
          {(searchQuery || dateFrom || dateTo) && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setSearchQuery("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Réinitialiser
            </Button>
          )}
        </Stack>

        {paidInvoices.length === 0 ? (
          <Alert severity="info">
            Aucune facture payée. Les avoirs ne peuvent être créés que pour des factures payées.
          </Alert>
        ) : filteredPaidInvoices.length === 0 ? (
          <Alert severity="warning">
            Aucune facture ne correspond à vos critères de recherche.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Date paiement</TableCell>
                  <TableCell align="right">Montant TTC</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPaidInvoices.slice(0, 20).map((invoice) => {
                  const hasCredit = credits.some(c => c.parentId === invoice.id);
                  return (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.number || "Brouillon"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {invoice.customerName || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {invoice.paidAt
                          ? new Date(invoice.paidAt).toLocaleDateString("fr-FR")
                          : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {invoice.totalTTC.toFixed(2)} €
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {hasCredit ? (
                          <Chip size="small" label="Avoir créé" color="success" />
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            startIcon={<AddIcon />}
                            onClick={() => handleCreateCredit(invoice.id)}
                            disabled={creating === invoice.id}
                          >
                            {creating === invoice.id ? "..." : "Créer avoir"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Section: Avoirs créés */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Avoirs créés
        </Typography>
        {credits.length === 0 ? (
          <Alert severity="info">
            Aucun avoir créé. Créez un avoir à partir d&apos;une facture payée ci-dessus.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Numéro</TableCell>
                  <TableCell>Date création</TableCell>
                  <TableCell>Facture d&apos;origine</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="right">Montant TTC</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {credits.map((credit) => {
                  const originalInvoice = paidInvoices.find(inv => inv.id === credit.parentId);
                  return (
                    <TableRow key={credit.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {credit.number || "Brouillon"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(credit.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {originalInvoice ? (
                          <Button
                            size="small"
                            variant="text"
                            component={Link}
                            href={`/finance/invoices/${originalInvoice.id}`}
                          >
                            {originalInvoice.number || "Brouillon"}
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={credit.status === "draft" ? "Brouillon" : credit.status === "issued" ? "Émis" : credit.status}
                          color={credit.status === "issued" ? "success" : "warning"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600} color="error">
                          -{credit.totalTTC.toFixed(2)} €
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          component={Link}
                          href={`/finance/invoices/${credit.id}`}
                          startIcon={<OpenInNewIcon />}
                        >
                          Voir
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
