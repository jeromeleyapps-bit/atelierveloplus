/**
 * Supplier Catalog Card - Pour rechercher et commander chez les fournisseurs
 */

"use client";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import StorefrontIcon from "@mui/icons-material/Storefront";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import { motion } from "framer-motion";

export interface SupplierCatalogCardProps {
  item: {
    id?: string;
    supplierName: string;
    supplierSku: string;
    name: string;
    priceHT?: number | null;
    availability?: string | null;
    lastCheckedAt?: string | null;
    ean?: string | null;
    inOurCatalog?: boolean; // Si déjà dans notre catalogue
  };
  onAddToCatalog?: () => void;
  onCompare?: () => void;
  onOrder?: () => void;
}

function getAvailabilityInfo(availability?: string | null) {
  const avail = (availability || "").toLowerCase();
  
  if (avail.includes("stock") || avail.includes("disponible")) {
    return {
      icon: <CheckCircleIcon />,
      label: "En stock",
      color: "success" as const,
      bg: "#e8f5e9",
      textColor: "#2e7d32",
    };
  }
  
  if (avail.includes("rupture") || avail.includes("indisponible")) {
    return {
      icon: <ErrorIcon />,
      label: "Rupture",
      color: "error" as const,
      bg: "#ffebee",
      textColor: "#c62828",
    };
  }
  
  return {
    icon: <CheckCircleIcon />,
    label: availability || "À vérifier",
    color: "default" as const,
    bg: "#f5f5f5",
    textColor: "#616161",
  };
}

export default function SupplierCatalogCard({
  item,
  onAddToCatalog,
  onCompare,
  onOrder,
}: SupplierCatalogCardProps) {
  const availInfo = getAvailabilityInfo(item.availability);
  const isInStock = availInfo.color === "success";

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
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          border: isInStock ? "2px solid #4caf50" : "1px solid #e0e0e0",
          boxShadow: isInStock
            ? "0 4px 12px rgba(76, 175, 80, 0.2)"
            : "0 2px 8px rgba(0,0,0,0.1)",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Header avec fournisseur et disponibilité */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
            mb={1.5}
          >
            <Chip
              icon={<StorefrontIcon />}
              label={item.supplierName}
              size="small"
              sx={{
                bgcolor: "#e3f2fd",
                color: "#1565c0",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            />
            <Chip
              icon={availInfo.icon}
              label={availInfo.label}
              size="small"
              color={availInfo.color}
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          {/* Nom du produit */}
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              mb: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: "3rem",
              fontSize: "1rem",
            }}
          >
            {item.name}
          </Typography>

          {/* SKU Fournisseur */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            Réf. fournisseur: {item.supplierSku}
          </Typography>

          {/* EAN si disponible */}
          {item.ean && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1.5 }}
            >
              EAN: {item.ean}
            </Typography>
          )}

          {/* Prix */}
          {item.priceHT != null && (
            <Box sx={{ mb: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="h5" fontWeight={700} color="primary">
                  {item.priceHT.toFixed(2)} €
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  HT
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {(item.priceHT * 1.2).toFixed(2)} € TTC (TVA 20%)
              </Typography>
            </Box>
          )}

          {/* Statut dans notre catalogue */}
          {item.inOurCatalog && (
            <Chip
              label="Déjà dans notre catalogue"
              size="small"
              color="info"
              sx={{ mt: 1 }}
            />
          )}

          {/* Dernière vérification */}
          {item.lastCheckedAt && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Vérifié le{" "}
              {new Date(item.lastCheckedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
        </CardContent>

        {/* Actions */}
        <CardActions sx={{ p: 2, pt: 0, gap: 1, flexWrap: "wrap" }}>
          {!item.inOurCatalog && onAddToCatalog && (
            <Button
              size="small"
              variant="contained"
              startIcon={<ShoppingCartIcon />}
              onClick={onAddToCatalog}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
                flex: 1,
              }}
            >
              Ajouter au catalogue
            </Button>
          )}
          
          {onCompare && (
            <Tooltip title="Comparer les prix">
              <IconButton
                size="small"
                onClick={onCompare}
                sx={{
                  bgcolor: "secondary.main",
                  color: "white",
                  "&:hover": { bgcolor: "secondary.dark" },
                }}
              >
                <CompareArrowsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {onOrder && isInStock && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ShoppingCartIcon />}
              onClick={onOrder}
              color="success"
              sx={{ flex: 1 }}
            >
              Commander
            </Button>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );
}
