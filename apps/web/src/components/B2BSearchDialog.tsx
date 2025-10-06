/**
 * B2B Search Dialog Component
 * Allows searching products across multiple suppliers
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Stack,
  LinearProgress,
  Alert,
  Box,
  IconButton,
  Tooltip
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { searchB2B, type B2BSearchResult } from "@/lib/api";

interface B2BSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onAddToCatalog?: (result: B2BSearchResult) => void;
}

export default function B2BSearchDialog({ open, onClose, onAddToCatalog }: B2BSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<B2BSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string; count: number }>>([]);

  async function handleSearch() {
    if (!query || query.trim().length < 2) {
      setError("Veuillez entrer au moins 2 caractères");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await searchB2B(query.trim(), { limit: 30 });
      setResults(response.results);
      setSuppliers(response.suppliers);
      
      if (response.total === 0) {
        setError("Aucun résultat trouvé");
      }
    } catch (err: any) {
      console.error("B2B search error:", err);
      setError(err.message || "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  function getAvailabilityColor(availability: string): "success" | "warning" | "error" | "default" {
    if (availability === "in_stock") return "success";
    if (availability === "on_order") return "warning";
    if (availability === "out_of_stock") return "error";
    return "default";
  }

  function getAvailabilityLabel(availability: string): string {
    if (availability === "in_stock") return "En stock";
    if (availability === "on_order") return "Sur commande";
    if (availability === "out_of_stock") return "Rupture";
    return availability;
  }

  function handleAddToCatalog(result: B2BSearchResult) {
    if (onAddToCatalog) {
      onAddToCatalog(result);
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SearchIcon color="primary" />
          <Typography variant="h6">Recherche Fournisseurs B2B</Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        {/* Search Bar */}
        <TextField
          fullWidth
          placeholder="Ex: shimano deore, pneu 26 pouces, chaîne 11v..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
          autoFocus
        />

        <Button 
          variant="contained" 
          onClick={handleSearch} 
          disabled={loading || query.trim().length < 2}
          fullWidth
          sx={{ mb: 3 }}
        >
          {loading ? "Recherche en cours..." : "Rechercher"}
        </Button>

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Error */}
        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Suppliers Summary */}
        {suppliers.length > 0 && !loading && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Résultats de {suppliers.length} fournisseur(s) :
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {suppliers.map((sup) => (
                <Chip
                  key={sup.id}
                  label={`${sup.name} (${sup.count})`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <Grid container spacing={2}>
            {results.map((result, index) => (
              <Grid item xs={12} sm={6} md={4} key={`${result.supplierId}-${result.externalId}-${index}`}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={result.imageUrl || "/placeholder-product.png"}
                    alt={result.name}
                    sx={{ objectFit: "contain", bgcolor: "grey.100", p: 1 }}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" gutterBottom noWrap title={result.name}>
                      {result.name}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      {result.brand && `${result.brand} • `}
                      {result.reference || "Réf. non disponible"}
                    </Typography>

                    <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                      {result.price.toFixed(2)} €
                      {result.priceHT && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          ({result.priceHT.toFixed(2)} € HT)
                        </Typography>
                      )}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" gap={0.5}>
                      <Chip
                        label={getAvailabilityLabel(result.availability)}
                        size="small"
                        color={getAvailabilityColor(result.availability)}
                      />
                      {result.stock !== undefined && result.stock > 0 && (
                        <Chip
                          label={`Stock: ${result.stock}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {result.deliveryDays && (
                        <Chip
                          icon={<LocalShippingIcon fontSize="small" />}
                          label={`${result.deliveryDays}j`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Fournisseur: {result.supplierName}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<AddShoppingCartIcon />}
                      onClick={() => handleAddToCatalog(result)}
                      fullWidth
                      variant="contained"
                    >
                      Ajouter au catalogue
                    </Button>
                    {result.url && (
                      <Tooltip title="Voir chez le fournisseur">
                        <IconButton
                          size="small"
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Empty State */}
        {!loading && !error && results.length === 0 && query && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              Lancez une recherche pour voir les résultats
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
