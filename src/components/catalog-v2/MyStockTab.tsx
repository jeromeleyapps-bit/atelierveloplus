"use client";

import { useState, useEffect } from "react";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import type { CatalogItem } from "@/lib/api";
import { logger } from '@/lib/logger';

interface MyStockTabProps {
  items: CatalogItem[];
  loading: boolean;
  onRefresh: () => void;
  onToast: (message: string, severity?: "success" | "error" | "info") => void;
}

export default function MyStockTab({ items, loading, onRefresh, onToast }: MyStockTabProps) {
  const [search, setSearch] = useState("");

  // Écouter les mises à jour de stock en temps réel (via CustomEvent)
  useEffect(() => {
    const handleStockUpdate = (event: Event) => {
      const update = (event as CustomEvent).detail;
      logger.info('[MYSTOCK] Stock update received:', update);
      // Rafraîchir automatiquement le catalogue
      onRefresh();
      // Toast notification
      onToast(`Stock mis à jour: ${update.name} (${update.quantityChange > 0 ? '+' : ''}${update.quantityChange})`, 'info');
    };

    window.addEventListener('stockUpdated', handleStockUpdate);
    logger.info('[MYSTOCK] Listener stockUpdated installé');

    return () => {
      window.removeEventListener('stockUpdated', handleStockUpdate);
      logger.info('[MYSTOCK] Listener stockUpdated désinstallé');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Pas de dépendances - installer une seule fois

  // Filtrage
  const filteredItems = items.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.sku?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats + Recherche */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Rechercher par nom, référence ou catégorie..."
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
        <Chip
          label={`${filteredItems.length} produit${filteredItems.length > 1 ? 's' : ''}`}
          color="primary"
          variant="outlined"
        />
      </Stack>

      {/* Grille produits */}
      <Grid container spacing={3}>
        {/* Tuile CatalogSnap */}
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card
            elevation={3}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              border: 2,
              borderColor: "primary.main",
              bgcolor: "primary.50",
            }}
          >
            {/* Icon */}
            <Box
              sx={{
                height: 160,
                bgcolor: "primary.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="h1" sx={{ fontSize: 80 }}>
                📱
              </Typography>
            </Box>

            <CardContent sx={{ flexGrow: 1 }}>
              <Chip
                label="NOUVEAU"
                size="small"
                color="primary"
                sx={{ mb: 1, fontWeight: 700 }}
              />

              <Typography variant="h6" gutterBottom color="primary" fontWeight={700}>
                CatalogSnap
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                CatalogSnap est une application de scan de codes-barres EAN pour gérer vos stocks.
              </Typography>

              <Typography variant="caption" color="primary" fontWeight={600}>
                Bientôt disponible sur le Play Store
              </Typography>
            </CardContent>

            <CardActions>
              <Button
                fullWidth
                variant="contained"
                component="label"
                startIcon={<AddIcon />}
              >
                Importer CSV Scanner
                <input
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      logger.info('[CATALOGSNAP] File selected:', file.name, file.size);
                      // IIFE pour async
                      (async () => {
                        try {
                          logger.info('[CATALOGSNAP] Starting upload...');
                          const formData = new FormData();
                          formData.append("file", file);
                          const token = localStorage.getItem("jwt_token");
                          logger.info('[CATALOGSNAP] Token:', token ? 'present' : 'missing');
                          
                          const response = await fetch("/api/catalog/import-catalogsnap", {
                            method: "POST",
                            headers: token ? { Authorization: `Bearer ${token}` } : {},
                            body: formData,
                          });
                          
                          logger.info('[CATALOGSNAP] Response status:', response.status);
                          const result = await response.json();
                          logger.info('[CATALOGSNAP] Result:', result);
                          
                          if (response.ok) {
                            onToast(result.message, "success");
                            onRefresh();
                          } else {
                            onToast(result.error || "Erreur import", "error");
                          }
                        } catch (error) {
                          const message = error instanceof Error ? error.message : "Erreur import";
                          logger.error('[CATALOGSNAP] Error:', message);
                          onToast(message, "error");
                        }
                      })();
                      e.target.value = "";
                    }
                  }}
                />
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Produits existants */}
        {filteredItems.length === 0 && !search ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun produit en stock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ajoutez votre premier produit ou importez depuis CatalogSnap
              </Typography>
            </Box>
          </Grid>
        ) : search && filteredItems.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Aucun produit trouvé
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Essayez une autre recherche
              </Typography>
            </Box>
          </Grid>
        ) : (
          filteredItems.map((item) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card elevation={2} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {/* Image placeholder */}
                <Box
                  sx={{
                    height: 160,
                    bgcolor: "grey.200",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h4" color="text.secondary">
                    📦
                  </Typography>
                </Box>

                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Catégorie */}
                  {item.category && (
                    <Chip
                      label={item.category}
                      size="small"
                      sx={{ mb: 1 }}
                      color="primary"
                      variant="outlined"
                    />
                  )}

                  {/* Nom */}
                  <Typography variant="h6" gutterBottom noWrap title={item.name}>
                    {item.name}
                  </Typography>

                  {/* Référence */}
                  {item.sku && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Réf: {item.sku}
                    </Typography>
                  )}

                  {/* Stock */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Stock:
                    </Typography>
                    <Chip
                      label={item.stockQty || 0}
                      size="small"
                      color={
                        !item.stockQty || item.stockQty === 0 
                          ? "error" 
                          : item.stockQty <= 5 
                          ? "warning" 
                          : "success"
                      }
                      icon={
                        !item.stockQty || item.stockQty === 0 
                          ? undefined 
                          : item.stockQty <= 5 
                          ? <span>⚠️</span> 
                          : undefined
                      }
                    />
                  </Stack>

                  {/* Prix */}
                  <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                    {item.priceHT?.toFixed(2) || "0.00"} €
                  </Typography>
                </CardContent>

                <CardActions>
                  <IconButton size="small" color="primary" title="Modifier">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" title="Supprimer">
                    <DeleteIcon />
                  </IconButton>
                  <Button size="small" sx={{ ml: "auto" }}>
                    Ajuster Stock
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Box>
  );
}
