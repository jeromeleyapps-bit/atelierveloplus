"use client";

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import AddIcon from '@mui/icons-material/Add';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useBikes } from '@/hooks/useBikes';
import { useBikesUI } from '@/hooks/useBikesUI';
import { useBikesMutations } from '@/hooks/useBikesMutations';
import BikeCard from './BikeCard';
import SellBikeDialog from './SellBikeDialog';
import AddBikeDialog from './AddBikeDialog';
import { getAccountSettings } from '@/lib/api';
import { logger } from '@/lib/logger';

interface BikesTabProps {
  theme?: {
    bg: string;
    border: string;
    text: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
  };
}

export default function BikesTab({ theme }: BikesTabProps) {
  const bikesUI = useBikesUI();
  const { data: bikes, isLoading, error } = useBikes(bikesUI.filters);
  const bikesMutations = useBikesMutations({
    onSuccess: bikesUI.showToast,
    onError: (msg) => bikesUI.showToast(msg, 'error'),
  });

  // Statut auto-entrepreneur
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  // Charger statut AE
  useEffect(() => {
    getAccountSettings().then(settings => {
      setIsAutoEntrepreneur(settings?.isAutoEntrepreneur || false);
    }).catch(err => {
      logger.error('Error loading account settings:', err);
    });
  }, []);

  // Statistiques rapides
  const totalBikes = bikes?.length || 0;
  const newBikes = bikes?.filter(b => b.condition === 'NEW').length || 0;
  const usedBikes = bikes?.filter(b => b.condition !== 'NEW').length || 0;
  const totalValueHT = bikes?.reduce((sum, b) => sum + (b.sellingPriceHT * b.stock), 0) || 0;
  
  // Calculer TVA moyenne pour le total TTC
  const averageVatRate = bikes && bikes.length > 0
    ? bikes.reduce((sum, b) => sum + (b.vatRate || 0.20), 0) / bikes.length
    : 0.20;
  const totalValueTTC = totalValueHT * (1 + averageVatRate);
  
  const inStock = bikes?.filter(b => b.stock > 0).length || 0;

  return (
    <Box>
      {/* En-tête avec stats */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: theme?.primaryLight || '#F5F5DC',
          border: 2,
          borderColor: theme?.border || '#8b7355',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <DirectionsBikeIcon sx={{ fontSize: 32, color: theme?.primary || '#8b7355' }} />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Vélos en Stock
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {totalBikes} vélo{totalBikes > 1 ? 's' : ''} • {inStock} disponible{inStock > 1 ? 's' : ''}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              label={`Neufs: ${newBikes}`}
              color="success"
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Occasions: ${usedBikes}`}
              color="warning"
              size="small"
              variant="outlined"
            />
            <Chip
              label={isAutoEntrepreneur 
                ? `Valeur: ${totalValueTTC.toFixed(0)} € TTC`
                : `Valeur: ${totalValueHT.toFixed(0)} € HT`}
              color="primary"
              size="small"
              variant="outlined"
            />
          </Stack>
        </Stack>
      </Paper>

      {/* Toolbar */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={bikesUI.openAddDialog}
          sx={{
            bgcolor: theme?.primary || '#8b7355',
            '&:hover': { bgcolor: theme?.primaryDark || '#6d5d4b' },
          }}
        >
          Ajouter un vélo
        </Button>

        <Button
          variant="outlined"
          startIcon={<FilterListIcon />}
          onClick={() => {
            // TODO: Ouvrir drawer filtres
            bikesUI.showToast('Filtres à venir', 'info');
          }}
          sx={{
            borderColor: theme?.border || '#8b7355',
            color: theme?.text || '#5d4037',
          }}
        >
          Filtres
        </Button>

        {/* Afficher filtre actif si présent */}
        {bikesUI.filters.type && (
          <Chip
            label={`Type: ${bikesUI.filters.type}`}
            onDelete={() => bikesUI.updateFilters({ type: undefined })}
            color="primary"
          />
        )}
        {bikesUI.filters.condition && (
          <Chip
            label={`État: ${bikesUI.filters.condition}`}
            onDelete={() => bikesUI.updateFilters({ condition: undefined })}
            color="primary"
          />
        )}
        {bikesUI.filters.brand && (
          <Chip
            label={`Marque: ${bikesUI.filters.brand}`}
            onDelete={() => bikesUI.updateFilters({ brand: undefined })}
            color="primary"
          />
        )}
      </Stack>

      {/* Loading */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: theme?.primary || '#8b7355' }} />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Erreur lors du chargement des vélos : {error.message}
        </Alert>
      )}

      {/* Liste vide */}
      {!isLoading && !error && totalBikes === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            bgcolor: theme?.primaryLight || '#F5F5DC',
            border: 2,
            borderColor: theme?.border || '#8b7355',
            borderStyle: 'dashed',
          }}
        >
          <DirectionsBikeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Aucun vélo en stock
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Ajoutez votre premier vélo à vendre
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={bikesUI.openAddDialog}
            sx={{
              bgcolor: theme?.primary || '#8b7355',
              '&:hover': { bgcolor: theme?.primaryDark || '#6d5d4b' },
            }}
          >
            Ajouter un vélo
          </Button>
        </Paper>
      )}

      {/* Grille vélos */}
      {!isLoading && !error && bikes && bikes.length > 0 && (
        <Grid container spacing={3}>
          {bikes.map((bike) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={bike.id}>
              <BikeCard
                bike={bike}
                onEdit={() => bikesUI.openEditDialog(bike)}
                onSell={() => bikesUI.openSellDialog(bike)}
                onDetails={() => bikesUI.openDetailsDialog(bike)}
                onDelete={() => bikesUI.openDeleteDialog(bike)}
                theme={theme}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <AddBikeDialog
        open={bikesUI.addDialogOpen}
        onClose={bikesUI.closeAddDialog}
        onConfirm={(data) => {
          bikesMutations.create(data);
          bikesUI.closeAddDialog();
        }}
        isCreating={bikesMutations.isCreating}
      />

      <SellBikeDialog
        open={bikesUI.sellDialogOpen}
        bike={bikesUI.selectedBike}
        onClose={bikesUI.closeSellDialog}
        onConfirm={(data) => {
          if (bikesUI.selectedBike) {
            bikesMutations.sell(bikesUI.selectedBike.id, data);
            bikesUI.closeSellDialog();
          }
        }}
        isSelling={bikesMutations.isSelling}
      />

      {/* TODO: Autres dialogs (Edit, Details, Delete) */}
    </Box>
  );
}
