"use client";
/**
 * Onglet Mon Stock - Affichage des pièces en stock
 */

import { useState, useMemo } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import WarningIcon from "@mui/icons-material/Warning";
import CatalogGrid from "../CatalogGrid";
import type { CatalogItem } from "@/lib/api";

interface MyStockTabProps {
  items: CatalogItem[];
  loading?: boolean;
  onEdit: (item: CatalogItem) => void;
  onStock: (item: CatalogItem) => void;
  onAddToTicket: (item: CatalogItem) => void;
  onDelete?: (item: CatalogItem) => void;
}

export default function MyStockTab({
  items,
  loading = false,
  onEdit,
  onStock,
  onAddToTicket,
  onDelete,
}: MyStockTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtrage et tri
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Recherche
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          ('barcode' in item && typeof (item as { barcode?: string }).barcode === 'string' && (item as { barcode: string }).barcode.toLowerCase().includes(q))
      );
    }

    // Catégorie
    if (categoryFilter) {
      result = result.filter((item) => item.category === categoryFilter);
    }

    // Stock bas
    if (lowStockOnly) {
      result = result.filter((item) => item.stockQty <= item.minStock);
    }

    // Tri
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return a.priceTTC - b.priceTTC;
        case "stock":
          return a.stockQty - b.stockQty;
        default:
          return 0;
      }
    });

    return result;
  }, [items, search, categoryFilter, lowStockOnly, sortBy]);

  return (
    <Box>
      {/* Filtres - Ligne 1 : Recherche et contrôles */}
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          size="small"
          placeholder="Rechercher dans Mon Stock..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Trier par</InputLabel>
          <Select
            value={sortBy}
            label="Trier par"
            onChange={(e) => setSortBy(e.target.value as 'name' | 'stock' | 'price')}
          >
            <MenuItem value="name">Nom</MenuItem>
            <MenuItem value="price">Prix</MenuItem>
            <MenuItem value="stock">Stock</MenuItem>
          </Select>
        </FormControl>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="grid">
            <ViewModuleIcon />
          </ToggleButton>
          <ToggleButton value="list">
            <ViewListIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Filtres - Ligne 2 : Catégories */}
      <Stack direction="row" spacing={1} mb={3} flexWrap="wrap" gap={1}>
        <Chip
          label="Tous"
          color={categoryFilter === "" ? "primary" : "default"}
          variant={categoryFilter === "" ? "filled" : "outlined"}
          onClick={() => setCategoryFilter("")}
        />
        <Chip
          label="Pièces"
          color={categoryFilter === "PIECES" ? "primary" : "default"}
          variant={categoryFilter === "PIECES" ? "filled" : "outlined"}
          onClick={() => setCategoryFilter("PIECES")}
        />
        <Chip
          label="Équipements"
          color={categoryFilter === "EQUIPEMENTS" ? "primary" : "default"}
          variant={categoryFilter === "EQUIPEMENTS" ? "filled" : "outlined"}
          onClick={() => setCategoryFilter("EQUIPEMENTS")}
        />
        <Chip
          label="Autres"
          color={categoryFilter === "AUTRES" ? "primary" : "default"}
          variant={categoryFilter === "AUTRES" ? "filled" : "outlined"}
          onClick={() => setCategoryFilter("AUTRES")}
        />
        <Chip
          icon={<WarningIcon />}
          label="Stock bas"
          color={lowStockOnly ? "warning" : "default"}
          variant={lowStockOnly ? "filled" : "outlined"}
          onClick={() => setLowStockOnly(!lowStockOnly)}
        />
      </Stack>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Grille */}
      {viewMode === "grid" ? (
        <CatalogGrid
          items={filteredItems}
          onEdit={onEdit}
          onStock={onStock}
          onOffers={onAddToTicket}
          onDelete={onDelete}
        />
      ) : (
        <Box sx={{ p: 3, textAlign: "center", bgcolor: "background.paper" }}>
          Vue liste à implémenter
        </Box>
      )}
    </Box>
  );
}
