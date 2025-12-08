"use client";
/**
 * Onglet Recherche Globale - Résultats mixtes Stock + Fournisseurs
 */

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';

import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddIcon from "@mui/icons-material/Add";
import type { CatalogItem } from "@/lib/api";
import type { SupplierOffer } from "./SuppliersTab";

interface GlobalSearchTabProps {
  query: string;
  stockResults: CatalogItem[];
  supplierResults: SupplierOffer[];
  onEditStock: (item: CatalogItem) => void;
  onManageStock: (item: CatalogItem) => void;
  onAddToTicket: (item: CatalogItem) => void;
  onAddToStock: (offer: SupplierOffer) => void;
  onOrderSupplier: (offer: SupplierOffer) => void;
  onCreateNew: () => void;
}

export default function GlobalSearchTab({
  query,
  stockResults,
  supplierResults,
  onEditStock,
  onManageStock,
  onAddToTicket,
  onAddToStock,
  onOrderSupplier,
  onCreateNew,
}: GlobalSearchTabProps) {
  if (!query) {
    return (
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Utilisez la recherche ci-dessus pour trouver une pièce
        </Typography>
      </Paper>
    );
  }

  const hasResults = stockResults.length > 0 || supplierResults.length > 0;

  return (
    <Box>
      <Chip
        label={`Recherche: "${query}"`}
        sx={{ mb: 3 }}
        onDelete={() => {}}
      />

      {/* Résultats Mon Stock */}
      {stockResults.length > 0 && (
        <Box mb={4}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={2}
            sx={{ pl: 1 }}
          >
            <CheckCircleIcon color="success" />
            <Typography variant="h6" color="success.main">
              Mon Stock ({stockResults.length})
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {stockResults.map((item) => (
              <Paper
                key={item.id}
                sx={{
                  p: 2,
                  border: "2px solid",
                  borderColor: "success.light",
                  "&:hover": { boxShadow: 3 },
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {item.name}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        SKU: {item.sku || "—"}
                      </Typography>
                      <Chip
                        label={`${item.stockQty} en stock`}
                        size="small"
                        color={
                          item.stockQty <= item.minStock ? "warning" : "success"
                        }
                      />
                    </Stack>
                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      {item.priceTTC.toFixed(2)} € TTC
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.priceHT.toFixed(2)} € HT
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => onEditStock(item)}
                    >
                      Éditer
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<InventoryIcon />}
                      onClick={() => onManageStock(item)}
                    >
                      Stock
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => onAddToTicket(item)}
                    >
                      Ajouter au Ticket
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}

      {/* Résultats Fournisseurs */}
      {supplierResults.length > 0 && (
        <Box mb={4}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            mb={2}
            sx={{ pl: 1 }}
          >
            <StorefrontIcon color="primary" />
            <Typography variant="h6" color="primary">
              Catalogue Fournisseurs ({supplierResults.length})
            </Typography>
          </Stack>

          <Stack spacing={2}>
            {supplierResults.map((offer) => {
              const isInStock = offer.availability
                .toLowerCase()
                .includes("stock");
              return (
                <Paper
                  key={offer.id}
                  sx={{
                    p: 2,
                    border: "2px solid",
                    borderColor: "primary.light",
                    "&:hover": { boxShadow: 3 },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <StorefrontIcon fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>
                          {offer.supplierName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontFamily="monospace"
                        >
                          Réf: {offer.supplierSku}
                        </Typography>
                      </Stack>
                      <Typography variant="h6" gutterBottom>
                        {offer.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={offer.availability}
                          size="small"
                          color={isInStock ? "success" : "error"}
                        />
                        {offer.inOurCatalog && (
                          <Chip
                            label="Déjà au catalogue"
                            size="small"
                            color="info"
                          />
                        )}
                      </Stack>
                      <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                        {offer.priceHT.toFixed(2)} € HT
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(offer.priceHT * 1.2).toFixed(2)} € TTC (prix achat)
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      {!offer.inOurCatalog && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddShoppingCartIcon />}
                          onClick={() => onAddToStock(offer)}
                        >
                          Ajouter à Mon Stock
                        </Button>
                      )}
                      {isInStock && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="success"
                          startIcon={<ShoppingCartIcon />}
                          onClick={() => onOrderSupplier(offer)}
                        >
                          Commander
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Aucun résultat */}
      {!hasResults && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucune pièce trouvée
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Aucune correspondance dans votre stock ni chez les fournisseurs
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateNew}
          >
            Créer une Nouvelle Pièce
          </Button>
        </Paper>
      )}
    </Box>
  );
}
