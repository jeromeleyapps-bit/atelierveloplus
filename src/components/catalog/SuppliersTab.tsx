"use client";
/**
 * Onglet Catalogue Fournisseurs - Tableau compact
 */

import { useState, useMemo } from "react";
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import StorefrontIcon from "@mui/icons-material/Storefront";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export interface SupplierOffer {
  id: string;
  supplierId?: string;
  supplierName: string;
  supplierSku: string;
  supplierWebsite?: string;
  name: string;
  priceHT: number;
  availability: string;
  ean?: string;
  lastCheckedAt?: string;
  inOurCatalog?: boolean;
}

interface SuppliersTabProps {
  offers: SupplierOffer[];
  loading?: boolean;
  onAddToStock: (offer: SupplierOffer) => void;
  onOrder: (offer: SupplierOffer) => void;
  onDeleteOffer?: (offer: SupplierOffer) => void;
  onPurgeOffers?: (supplierId?: string) => void;
}

export default function SuppliersTab({
  offers,
  loading = false,
  onAddToStock,
  onOrder,
  onDeleteOffer,
  onPurgeOffers,
}: SuppliersTabProps) {
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("");

  // Filtrage
  const filteredOffers = useMemo(() => {
    let result = [...offers];

    // Recherche
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (offer) =>
          offer.name.toLowerCase().includes(q) ||
          offer.supplierSku.toLowerCase().includes(q) ||
          offer.ean?.toLowerCase().includes(q)
      );
    }

    // Fournisseur
    if (supplierFilter) {
      result = result.filter((offer) => offer.supplierName === supplierFilter);
    }

    return result;
  }, [offers, search, supplierFilter]);

  // Liste unique des fournisseurs
  const suppliers = useMemo(() => {
    return Array.from(new Set(offers.map((o) => o.supplierName)));
  }, [offers]);

  function getAvailabilityChip(availability: string) {
    const avail = availability.toLowerCase();
    if (avail.includes("stock") || avail.includes("disponible")) {
      return <Chip label="En stock" size="small" color="success" />;
    }
    if (avail.includes("rupture") || avail.includes("indisponible")) {
      return <Chip label="Rupture" size="small" color="error" />;
    }
    return <Chip label={availability} size="small" />;
  }

  return (
    <Box>
      {/* Filtres + Actions */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" gap={1} alignItems="center">
        {/* Recherche */}
        <TextField
          size="small"
          placeholder="Rechercher par nom, réf, EAN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 300 }}
        />

        {/* Fournisseurs */}
        <Stack direction="row" spacing={1}>
          <Chip
            label="Tous"
            color={supplierFilter === "" ? "primary" : "default"}
            variant={supplierFilter === "" ? "filled" : "outlined"}
            onClick={() => setSupplierFilter("")}
          />
          {suppliers.map((supplier) => (
            <Chip
              key={supplier}
              label={supplier}
              color={supplierFilter === supplier ? "primary" : "default"}
              variant={supplierFilter === supplier ? "filled" : "outlined"}
              onClick={() => setSupplierFilter(supplier)}
            />
          ))}
        </Stack>

        {/* Purge actions */}
        {onPurgeOffers && (
          <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={() => {
                if (confirm('Vider toutes les offres B2B ?')) onPurgeOffers();
              }}
            >
              Vider Offres
            </Button>
            {supplierFilter && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => {
                  if (confirm(`Vider les offres du fournisseur ${supplierFilter} ?`)) onPurgeOffers?.(offers.find(o => o.supplierName===supplierFilter)?.supplierId);
                }}
              >
                Vider ce fournisseur
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tableau */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fournisseur</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell align="right">Prix HT</TableCell>
              <TableCell>Disponibilité</TableCell>
              <TableCell>EAN</TableCell>
              <TableCell>Site</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOffers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    {loading
                      ? "Chargement..."
                      : "Aucune offre fournisseur trouvée"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOffers.map((offer) => (
                <TableRow key={offer.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StorefrontIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={600}>
                        {offer.supplierName}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {offer.supplierSku}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{offer.name}</Typography>
                    {offer.inOurCatalog && (
                      <Chip
                        label="Déjà au catalogue"
                        size="small"
                        color="info"
                        sx={{ mt: 0.5 }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {offer.priceHT.toFixed(2)} €
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(offer.priceHT * 1.2).toFixed(2)} € TTC
                    </Typography>
                  </TableCell>
                  <TableCell>{getAvailabilityChip(offer.availability)}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {offer.ean || "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {offer.supplierWebsite ? (
                      <Tooltip title="Ouvrir le site fournisseur">
                        <IconButton
                          size="small"
                          onClick={() => window.open(offer.supplierWebsite, '_blank')}
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      {!offer.inOurCatalog && (
                        <Tooltip title="Ajouter à mon stock">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => onAddToStock(offer)}
                          >
                            <AddShoppingCartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {offer.availability.toLowerCase().includes("stock") && (
                        <Tooltip title="Commander">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onOrder(offer)}
                          >
                            <ShoppingCartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {onDeleteOffer && (
                        <Tooltip title="Supprimer l'offre">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              if (confirm('Supprimer cette offre ?')) onDeleteOffer(offer);
                            }}
                          >
                            ✖
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stats */}
      {filteredOffers.length > 0 && (
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {filteredOffers.length} offre{filteredOffers.length > 1 ? "s" : ""}{" "}
            •{" "}
            {
              filteredOffers.filter((o) =>
                o.availability.toLowerCase().includes("stock")
              ).length
            }{" "}
            en stock
          </Typography>
        </Box>
      )}
    </Box>
  );
}
