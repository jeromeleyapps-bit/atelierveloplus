/**
 * Supplier Catalog Grid - Grille de recherche fournisseur
 */

"use client";

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import SupplierCatalogCard, { SupplierCatalogCardProps } from "./SupplierCatalogCard";
import { useState } from "react";

interface SupplierCatalogGridProps {
  items: SupplierCatalogCardProps["item"][];
  onAddToCatalog: (item: SupplierCatalogCardProps["item"]) => void;
  onCompare?: (item: SupplierCatalogCardProps["item"]) => void;
  onOrder?: (item: SupplierCatalogCardProps["item"]) => void;
  itemsPerPage?: number;
  loading?: boolean;
}

export default function SupplierCatalogGrid({
  items,
  onAddToCatalog,
  onCompare,
  onOrder,
  itemsPerPage = 12,
  loading = false,
}: SupplierCatalogGridProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(itemsPerPage);

  const totalPages = Math.ceil(items.length / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const currentItems = items.slice(startIndex, endIndex);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPerPage(Number(event.target.value));
    setPage(1);
  };

  // Statistiques
  const inStockCount = items.filter(
    (item) => (item.availability || "").toLowerCase().includes("stock")
  ).length;
  const inOurCatalogCount = items.filter((item) => item.inOurCatalog).length;

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Recherche en cours...
        </Typography>
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 8,
          px: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Aucun produit trouvé
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Essayez une autre recherche ou vérifiez vos filtres
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Info et contrôles */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary">
            {items.length} produit{items.length > 1 ? "s" : ""} trouvé{items.length > 1 ? "s" : ""}
          </Typography>
          <Chip
            label={`${inStockCount} en stock`}
            size="small"
            color="success"
            variant="outlined"
          />
          {inOurCatalogCount > 0 && (
            <Chip
              label={`${inOurCatalogCount} déjà au catalogue`}
              size="small"
              color="info"
              variant="outlined"
            />
          )}
        </Stack>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Par page</InputLabel>
          <Select value={perPage} label="Par page" onChange={handlePerPageChange}>
            <MenuItem value={12}>12</MenuItem>
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={48}>48</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Grille de cartes */}
      <Grid container spacing={3}>
        {currentItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id || `${item.supplierSku}-${index}`}>
            <SupplierCatalogCard
              item={item}
              onAddToCatalog={() => onAddToCatalog(item)}
              onCompare={onCompare ? () => onCompare(item) : undefined}
              onOrder={onOrder ? () => onOrder(item) : undefined}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
