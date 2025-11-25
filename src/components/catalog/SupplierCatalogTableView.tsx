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
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddBoxIcon from "@mui/icons-material/AddBox";
import type { CatalogItem } from "@/lib/api";

interface ExtendedCatalogItem extends CatalogItem {
  supplierSku?: string;
  description?: string;
}

interface SupplierCatalogTableViewProps {
  items: ExtendedCatalogItem[];
  loading: boolean;
  onEdit: (item: ExtendedCatalogItem) => void;
  onStock: (item: ExtendedCatalogItem) => void;
  onDelete: (item: ExtendedCatalogItem) => void;
  onAdopt?: (item: ExtendedCatalogItem) => void; // Transformer en MON STOCK
}

type OrderBy = "name" | "priceHT" | "stockQty" | "category" | "supplierName";
type Order = "asc" | "desc";

export default function SupplierCatalogTableView({
  items,
  loading,
  onEdit,
  onStock,
  onDelete,
  onAdopt,
}: SupplierCatalogTableViewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [orderBy, setOrderBy] = useState<OrderBy>("name");
  const [order, setOrder] = useState<Order>("asc");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filtrage
  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.name?.toLowerCase().includes(searchLower) ||
      item.sku?.toLowerCase().includes(searchLower) ||
      item.supplierSku?.toLowerCase().includes(searchLower) ||
      item.supplierName?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower); // Recherche dans description complète

    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Tri
  const sortedItems = [...filteredItems].sort((a, b) => {
    let aValue: string | number | null | undefined = a[orderBy];
    let bValue: string | number | null | undefined = b[orderBy];

    // Gérer les valeurs nulles
    if (aValue === null || aValue === undefined) aValue = "";
    if (bValue === null || bValue === undefined) bValue = "";

    // Comparaison
    if (typeof aValue === "string" && typeof bValue === "string") {
      return order === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      return order === "asc" ? aValue - bValue : bValue - aValue;
    }
    return 0;
  });

  // Pagination
  const paginatedItems = sortedItems.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Catégories uniques
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  return (
    <Box>
      {/* Filtres */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Rechercher par nom, SKU, fournisseur..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Catégorie</InputLabel>
            <Select
              value={categoryFilter}
              label="Catégorie"
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="all">Toutes</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            {filteredItems.length} produit{filteredItems.length > 1 ? "s" : ""}
          </Typography>
        </Stack>
      </Paper>

      {/* Tableau */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleRequestSort("name")}
                >
                  Nom
                </TableSortLabel>
              </TableCell>
              <TableCell>Code Produit</TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "supplierName"}
                  direction={orderBy === "supplierName" ? order : "asc"}
                  onClick={() => handleRequestSort("supplierName")}
                >
                  Marque
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === "category"}
                  direction={orderBy === "category" ? order : "asc"}
                  onClick={() => handleRequestSort("category")}
                >
                  Catégorie
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === "priceHT"}
                  direction={orderBy === "priceHT" ? order : "asc"}
                  onClick={() => handleRequestSort("priceHT")}
                >
                  Prix HT
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === "stockQty"}
                  direction={orderBy === "stockQty" ? order : "asc"}
                  onClick={() => handleRequestSort("stockQty")}
                >
                  Stock
                </TableSortLabel>
              </TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Aucun produit trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {item.name || "Sans nom"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Rechercher sur P2R.fr" arrow>
                      <Link
                        href={`https://www.p2r.fr/recherche?q=${encodeURIComponent(item.supplierSku || item.sku || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        <Typography variant="body2" fontWeight={500} color="primary">
                          {item.supplierSku || item.sku || "-"}
                        </Typography>
                      </Link>
                    </Tooltip>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Code P2R
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.supplierName || "Inconnu"}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={item.category || "AUTRES"} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {item.priceHT?.toFixed(2) || "0.00"} €
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={item.stockQty || 0}
                      size="small"
                      color={
                        (item.stockQty || 0) === 0
                          ? "error"
                          : (item.stockQty || 0) < (item.minStock || 5)
                          ? "warning"
                          : "success"
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => onEdit(item)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {onAdopt && (
                      <Tooltip title="Adopter dans MON STOCK (retirer flag fournisseur)">
                        <IconButton size="small" onClick={() => onAdopt(item)} color="primary">
                          <AddBoxIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Gérer stock">
                      <IconButton size="small" onClick={() => onStock(item)}>
                        <InventoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(item)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredItems.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[25, 50, 100, 500]}
        labelRowsPerPage="Lignes par page:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} sur ${count}`
        }
      />
    </Box>
  );
}
