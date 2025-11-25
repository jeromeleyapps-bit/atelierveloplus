/**
 * Catalog Grid with Pagination
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
import CatalogItemCard, { CatalogItemCardProps } from "./CatalogItemCard";
import { useState } from "react";

interface CatalogGridProps {
  items: CatalogItemCardProps["item"][];
  onEdit: (item: CatalogItemCardProps["item"]) => void;
  onStock: (item: CatalogItemCardProps["item"]) => void;
  onOffers: (item: CatalogItemCardProps["item"]) => void;
  itemsPerPage?: number;
  onDelete?: (item: CatalogItemCardProps["item"]) => void;
}

export default function CatalogGrid({
  items,
  onEdit,
  onStock,
  onOffers,
  itemsPerPage = 12,
  onDelete,
}: CatalogGridProps) {
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
    setPage(1); // Reset to first page
  };

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
          Essayez de modifier vos filtres ou ajoutez de nouveaux produits
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
        <Typography variant="body2" color="text.secondary">
          {items.length} produit{items.length > 1 ? "s" : ""} • Page {page} sur {totalPages}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Par page</InputLabel>
          <Select value={perPage} label="Par page" onChange={handlePerPageChange}>
            <MenuItem value={12}>12</MenuItem>
            <MenuItem value={24}>24</MenuItem>
            <MenuItem value={48}>48</MenuItem>
            <MenuItem value={96}>96</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Grille de cartes */}
      <Grid container spacing={3}>
        {currentItems.map((item) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
            <CatalogItemCard
              item={item}
              onEdit={() => onEdit(item)}
              onStock={() => onStock(item)}
              onOffers={() => onOffers(item)}
              onDelete={onDelete ? () => onDelete(item) : undefined}
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
