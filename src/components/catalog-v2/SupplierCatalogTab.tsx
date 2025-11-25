"use client";

import { useState } from "react";
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CartIcon from '@mui/icons-material/ShoppingCart';
import type { SupplierOffer } from "@/lib/api";
import ImportProgressDialog from "./ImportProgressDialog";
import { logger } from '@/lib/logger';

interface SupplierCatalogTabProps {
  offers: SupplierOffer[];
  loading: boolean;
  onRefresh: () => void;
  onToast: (message: string, severity?: "success" | "error" | "info") => void;
}

export default function SupplierCatalogTab({
  offers,
  loading,
  onRefresh,
  onToast,
}: SupplierCatalogTabProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [addingToStock, setAddingToStock] = useState<string | null>(null);
  
  // Import progress
  const [importProgress, setImportProgress] = useState({
    open: false,
    progress: 0,
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    status: "importing" as "importing" | "complete" | "error",
    error: "",
  });

  async function handleImportCSV(file: File) {
    setImportProgress({
      open: true,
      progress: 0,
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      status: "importing",
      error: "",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/catalog/import-csv-streaming", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.body) {
        throw new Error("Pas de réponse streaming");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);

            if (data.type === "progress" || data.type === "start") {
              setImportProgress((prev) => ({
                ...prev,
                progress: data.processed || 0,
                total: data.total || prev.total,
                created: data.created || 0,
                updated: data.updated || 0,
                skipped: data.skipped || 0,
              }));
            } else if (data.type === "complete") {
              setImportProgress((prev) => ({
                ...prev,
                status: "complete",
                progress: data.processed,
                created: data.created,
                updated: data.updated,
                skipped: data.skipped,
              }));
              onToast(data.message, "success");
              onRefresh();
            } else if (data.type === "error") {
              setImportProgress((prev) => ({
                ...prev,
                status: "error",
                error: data.error,
              }));
              onToast(data.error, "error");
            }
          } catch (e) {
            logger.error("Parse error:", e);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur import";
      logger.error("Import error:", message);
      setImportProgress((prev) => ({
        ...prev,
        status: "error",
        error: message,
      }));
      onToast(message, "error");
    }
  }

  async function handleAddToMyStock(supplierOfferId: string) {
    setAddingToStock(supplierOfferId);
    
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/catalog/items/from-supplier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ supplierOfferId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          onToast("Article déjà dans votre stock", "info");
        } else {
          throw new Error(data.error || "Erreur lors de l'ajout");
        }
      } else {
        onToast("Article ajouté à MON STOCK avec succès", "success");
        onRefresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de l'ajout";
      logger.error("Error adding to stock:", message);
      onToast(message, "error");
    } finally {
      setAddingToStock(null);
    }
  }

  // Filtrage
  const filteredOffers = offers.filter((offer) => {
    const searchLower = search.toLowerCase();
    return (
      offer.name?.toLowerCase().includes(searchLower) ||
      offer.reference?.toLowerCase().includes(searchLower) ||
      offer.category?.toLowerCase().includes(searchLower) ||
      offer.supplierName?.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const paginatedOffers = filteredOffers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Actions + Recherche */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher dans le catalogue fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          component="label"
          sx={{ minWidth: 200 }}
        >
          Import CSV (17k+)
          <input
            type="file"
            hidden
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImportCSV(file);
                e.target.value = "";
              }
            }}
          />
        </Button>
      </Stack>

      {/* Tableau */}
      {filteredOffers.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {search ? "Aucun produit trouvé" : "Catalogue fournisseur vide"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {search ? "Essayez une autre recherche" : "Importez le fichier CSV fournisseur"}
          </Typography>
        </Box>
      ) : (
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell>Référence</TableCell>
                  <TableCell>Nom Produit</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell align="right">Prix HT</TableCell>
                  <TableCell align="center">Stock</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedOffers.map((offer) => (
                  <TableRow key={offer.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {offer.reference || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{offer.name}</Typography>
                    </TableCell>
                    <TableCell>
                      {offer.category ? (
                        <Chip label={offer.category} size="small" variant="outlined" />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {offer.priceHT?.toFixed(2) || "0.00"} €
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={offer.stock || 0}
                        size="small"
                        color={offer.stock && offer.stock > 0 ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <IconButton
                          size="small"
                          color="primary"
                          title="Ajouter à MON STOCK"
                          onClick={() => handleAddToMyStock(offer.id)}
                          disabled={addingToStock === offer.id || !!offer.catalogItemId}
                        >
                          <AddIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="secondary"
                          title="Commander"
                          onClick={() => onToast("Fonctionnalité à venir", "info")}
                        >
                          <CartIcon />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={filteredOffers.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Lignes par page:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
          />
        </Paper>
      )}

      {/* Import Progress Dialog */}
      <ImportProgressDialog
        open={importProgress.open}
        progress={importProgress.progress}
        total={importProgress.total}
        created={importProgress.created}
        updated={importProgress.updated}
        skipped={importProgress.skipped}
        status={importProgress.status}
        error={importProgress.error}
        onClose={() => setImportProgress((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
}
