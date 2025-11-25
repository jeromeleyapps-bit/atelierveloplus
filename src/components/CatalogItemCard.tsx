/**
 * Modern Catalog Item Card
 */

"use client";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import Button from '@mui/material/Button';
import EditIcon from "@mui/icons-material/Edit";
import InventoryIcon from "@mui/icons-material/Inventory";
import StorefrontIcon from "@mui/icons-material/Storefront";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { motion } from "framer-motion";

export interface CatalogItemCardProps {
  item: {
    id: string;
    sku?: string | null;
    name: string;
    category: string;
    priceHT: number;
    priceTTC: number;
    stockQty: number;
    minStock: number;
    supplierName?: string | null;
    purchasePriceHT?: number | null;
  };
  onEdit?: () => void;
  onStock?: () => void;
  onOffers?: () => void;
  onDelete?: () => void;
}

function getCategoryColor(category: string) {
  switch (category) {
    case "PIECES":
      return { bg: "#e3f2fd", color: "#1565c0", label: "Pièces" };
    case "EQUIPEMENTS":
      return { bg: "#f3e5f5", color: "#6a1b9a", label: "Équipements" };
    case "AUTRES":
      return { bg: "#fff3e0", color: "#e65100", label: "Autres" };
    default:
      return { bg: "#f5f5f5", color: "#616161", label: category };
  }
}

export default function CatalogItemCard({
  item,
  onEdit,
  onStock,
  onOffers,
  onDelete,
}: CatalogItemCardProps) {
  const categoryInfo = getCategoryColor(item.category);
  const isLowStock = item.stockQty <= item.minStock;
  const isOutOfStock = item.stockQty === 0;
  const isSupplierItem = !!item.supplierName;
  const margin = item.purchasePriceHT && item.priceHT 
    ? ((item.priceHT - item.purchasePriceHT) / item.purchasePriceHT * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card
        sx={{
          height: "100%",
          minHeight: 280,
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          border: isLowStock ? "2px solid #f44336" : "1px solid #e0e0e0",
          boxShadow: isLowStock
            ? "0 2px 8px rgba(244, 67, 54, 0.15)"
            : "0 1px 4px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 0.5, p: 1.5 }}>
          {/* Header avec catégorie et stock */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={1}
            flexWrap="wrap"
            gap={0.5}
          >
            <Chip
              label={categoryInfo.label}
              size="small"
              sx={{
                bgcolor: categoryInfo.bg,
                color: categoryInfo.color,
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
            {isOutOfStock ? (
              <Chip
                icon={<WarningIcon />}
                label="Rupture"
                size="small"
                color="error"
                sx={{ fontWeight: 600 }}
              />
            ) : isLowStock ? (
              <Chip
                icon={<WarningIcon />}
                label="Stock bas"
                size="small"
                color="warning"
                sx={{ fontWeight: 600 }}
              />
            ) : (
              <Chip
                icon={<CheckCircleIcon />}
                label="En stock"
                size="small"
                color="success"
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>

          {/* Badge Fournisseur */}
          {isSupplierItem && (
            <Chip
              label={`📦 ${item.supplierName}`}
              size="small"
              sx={{
                mb: 1,
                bgcolor: "#fff3e0",
                color: "#e65100",
                fontWeight: 600,
                fontSize: "0.7rem",
              }}
            />
          )}

          {/* Nom du produit */}
          <Typography
            variant="body1"
            fontWeight={600}
            sx={{
              mb: 0.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              minHeight: "1.5rem",
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
            title={item.name}
          >
            {item.name}
          </Typography>

          {/* SKU */}
          {item.sku && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              SKU: {item.sku}
            </Typography>
          )}

          {/* Prix */}
          <Box sx={{ mb: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="baseline">
              <Typography variant="h6" fontWeight={700} color="primary">
                {item.priceTTC.toFixed(2)} €
              </Typography>
              <Typography variant="caption" color="text.secondary">
                TTC
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
              {item.priceHT.toFixed(2)} € HT
            </Typography>
            
            {/* Prix d'achat et marge (si fournisseur) */}
            {isSupplierItem && item.purchasePriceHT && (
              <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem" }}>
                  Achat: {item.purchasePriceHT.toFixed(2)} € HT
                </Typography>
                {margin !== null && (
                  <Chip
                    label={`+${margin.toFixed(0)}%`}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: "0.65rem",
                      bgcolor: margin > 50 ? "#e8f5e9" : "#fff3e0",
                      color: margin > 50 ? "#2e7d32" : "#e65100",
                      fontWeight: 700,
                    }}
                  />
                )}
              </Stack>
            )}
          </Box>

          {/* Stock */}
          <Box
            sx={{
              bgcolor: isLowStock ? "#ffebee" : "#e8f5e9",
              borderRadius: 1.5,
              p: 1,
              border: `1px solid ${isLowStock ? "#ffcdd2" : "#c8e6c9"}`,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.7rem" }}>
                  Stock
                </Typography>
                <Typography
                  variant="body1"
                  fontWeight={700}
                  color={isLowStock ? "error.main" : "success.main"}
                >
                  {item.stockQty}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.7rem" }}>
                  Min.
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {item.minStock}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ 
          mt: "auto",
          p: 1.5, 
          pt: 1.5,
          gap: 0.5,
          borderTop: "1px solid #e0e0e0",
          bgcolor: "background.paper"
        }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{ flex: 1, fontSize: "0.75rem" }}
          >
            Éditer
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<InventoryIcon />}
            onClick={onStock}
            sx={{ flex: 1, fontSize: "0.75rem" }}
          >
            Stock
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<StorefrontIcon />}
            onClick={onOffers}
            sx={{ flex: 1, fontSize: "0.75rem" }}
          >
            +
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => {
              if (!onDelete) return;
              if (confirm("Supprimer cette pièce ? (refusée si référencée)")) onDelete();
            }}
            sx={{ fontSize: "0.75rem" }}
          >
            Supprimer
          </Button>
        </CardActions>
      </Card>
    </motion.div>
  );
}
