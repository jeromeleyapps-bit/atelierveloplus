"use client";

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import type { Bike } from '@/hooks/useBikes';

interface BikeCardProps {
  bike: Bike;
  onEdit: () => void;
  onSell: () => void;
  onDetails: () => void;
  onDelete: () => void;
  theme?: {
    bg: string;
    border: string;
    text: string;
    primary: string;
    primaryDark: string;
  };
}

export default function BikeCard({
  bike,
  onEdit,
  onSell,
  onDetails,
  onDelete,
  theme,
}: BikeCardProps) {
  // Helper pour afficher condition
  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case 'NEW':
        return 'Neuf';
      case 'USED_EXCELLENT':
        return 'Occasion - Excellent';
      case 'USED_GOOD':
        return 'Occasion - Bon';
      case 'USED_FAIR':
        return 'Occasion - Correct';
      default:
        return condition;
    }
  };

  // Helper pour afficher type
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'ROAD':
        return '🚴 Route';
      case 'MTB':
        return '🏔️ VTT';
      case 'GRAVEL':
        return '🛤️ Gravel';
      case 'CITY':
        return '🏙️ Ville';
      case 'ELECTRIC':
        return '⚡ Électrique';
      case 'KIDS':
        return '👶 Enfant';
      default:
        return type;
    }
  };

  const conditionColor =
    bike.condition === 'NEW'
      ? 'success'
      : bike.condition === 'USED_EXCELLENT'
      ? 'info'
      : 'warning';

  const priceTC = bike.sellingPriceHT * (1 + bike.vatRate);

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s',
        border: 2,
        borderColor: theme?.border || '#8b7355',
        opacity: bike.active ? 1 : 0.6,
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      {/* Image placeholder */}
      <Box
        sx={{
          height: 160,
          bgcolor: theme?.bg || '#F5F5DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: 2,
          borderColor: theme?.border || '#8b7355',
          position: 'relative',
        }}
      >
        <DirectionsBikeIcon sx={{ fontSize: 80, color: theme?.primary || '#8b7355' }} />
        
        {/* Badge électrique */}
        {bike.isElectric && (
          <Chip
            icon={<ElectricBoltIcon />}
            label="⚡"
            color="info"
            size="small"
            sx={{ position: 'absolute', top: 8, right: 8 }}
          />
        )}

        {/* Badge stock */}
        {bike.stock === 0 && (
          <Chip
            label="Vendu"
            color="error"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8 }}
          />
        )}
        {bike.stock > 0 && bike.stock <= 1 && (
          <Chip
            label={`Stock: ${bike.stock}`}
            color="success"
            size="small"
            sx={{ position: 'absolute', top: 8, left: 8 }}
          />
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Stack spacing={1}>
          {/* Marque + Modèle */}
          <Typography variant="h6" component="div" fontWeight="bold" noWrap>
            {bike.brand}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {bike.model} ({bike.year})
          </Typography>

          {/* Type + Condition */}
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
            <Chip label={getTypeLabel(bike.type)} size="small" variant="outlined" />
            <Chip
              label={getConditionLabel(bike.condition)}
              size="small"
              color={conditionColor}
            />
          </Stack>

          {/* Taille */}
          <Typography variant="body2" color="text.secondary">
            Taille: <strong>{bike.size}</strong>
            {bike.color && ` • ${bike.color}`}
          </Typography>

          {/* Prix */}
          <Box mt={1}>
            <Typography variant="h5" color="primary" fontWeight="bold">
              {priceTC.toFixed(0)} €
            </Typography>
            <Typography variant="caption" color="text.secondary">
              TTC ({bike.sellingPriceHT.toFixed(0)} € HT)
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        {/* Bouton VENDRE principal */}
        <Button
          variant="contained"
          size="small"
          startIcon={<ShoppingCartIcon />}
          onClick={onSell}
          disabled={bike.stock === 0}
          sx={{
            bgcolor: theme?.primary || '#8b7355',
            '&:hover': { bgcolor: theme?.primaryDark || '#6d5d4b' },
          }}
        >
          VENDRE
        </Button>

        {/* Actions secondaires */}
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Détails">
            <IconButton size="small" onClick={onDetails}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Supprimer">
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardActions>
    </Card>
  );
}
