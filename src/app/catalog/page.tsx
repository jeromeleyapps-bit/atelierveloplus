"use client";

/**
 * Page Landing Catalogue - 3 Tuiles
 * Règle #1 DRY : Hook réutilisable useCatalogStats
 * Règle #4 Cohérence : Même pattern navigation (router.push)
 */

import { useRouter } from "next/navigation";
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InventoryIcon from "@mui/icons-material/Inventory";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import BuildIcon from "@mui/icons-material/Build";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CategoryIcon from "@mui/icons-material/Category";
import RequireAuth from "../components/RequireAuth";
import { useCatalogStats } from "@/hooks/useCatalogStats";

// Règle #3 : Pas de valeurs hardcodées - Thème centralisé
const CATALOG_THEME = {
  pieces: {
    bg: '#F5F5DC',
    border: '#8b7355',
    primary: '#8b7355',
    icon: InventoryIcon,
  },
  bikes: {
    bg: '#E3F2FD',
    border: '#1976D2',
    primary: '#1976D2',
    icon: PedalBikeIcon,
  },
  services: {
    bg: '#E8F5E9',
    border: '#4CAF50',
    primary: '#4CAF50',
    icon: BuildIcon,
  },
};

export default function CatalogLandingPage() {
  const router = useRouter();
  const { data: stats, isLoading, error } = useCatalogStats();

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Bannière */}
        <Box
          sx={{
            bgcolor: '#F5F5DC',
            borderBottom: 2,
            borderColor: '#8b7355',
            py: 3,
            mb: 4,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" spacing={2}>
              <CategoryIcon sx={{ fontSize: 48, color: '#5d4037' }} />
              <Box>
                <Typography variant="h3" fontWeight={700} sx={{ color: '#5d4037' }}>
                  📦 Catalogue Général
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Gestion des pièces, vélos et prestations
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pb: 6 }}>
          {/* Loading */}
          {isLoading && (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress size={60} />
            </Box>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Erreur lors du chargement des statistiques : {error.message}
            </Alert>
          )}

          {/* 3 TUILES */}
          {stats && (
            <Grid container spacing={4}>
              {/* TUILE 1 : PIÈCES & ACCESSOIRES */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={4}
                  sx={{
                    minHeight: 420,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: 3,
                    borderColor: CATALOG_THEME.pieces.border,
                    bgcolor: CATALOG_THEME.pieces.bg,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                    },
                  }}
                  onClick={() => router.push('/catalog/pieces')}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <InventoryIcon 
                      sx={{ 
                        fontSize: 80, 
                        color: CATALOG_THEME.pieces.primary, 
                        mb: 2 
                      }} 
                    />
                    
                    <Typography variant="h5" gutterBottom fontWeight="bold" color={CATALOG_THEME.pieces.primary}>
                      Pièces & Accessoires
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      Stock, fournisseurs, offres B2B
                    </Typography>
                    
                    <Stack spacing={1.5} mb={3} sx={{ minHeight: 180 }}>
                      <Chip 
                        label={`Mon Stock: ${stats.piecesCount} pièces`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.pieces.border }}
                      />
                      <Chip 
                        label={`Fournisseurs: ${stats.piecesSupplierCount}`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.pieces.border }}
                      />
                      <Chip 
                        label={`Offres B2B: ${stats.b2bOffersCount}`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.pieces.border }}
                      />
                      <Chip 
                        label={`Valeur: ${Math.round(stats.piecesValueHT)} € HT`} 
                        sx={{ 
                          bgcolor: CATALOG_THEME.pieces.primary, 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                      {stats.piecesLowStock > 0 && (
                        <Chip 
                          label={`⚠️ ${stats.piecesLowStock} sous seuil`} 
                          color="warning"
                          size="small"
                        />
                      )}
                    </Stack>

                    <Button
                      variant="contained"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: CATALOG_THEME.pieces.primary,
                        '&:hover': { bgcolor: '#6d5d4b' },
                      }}
                    >
                      Gérer les pièces
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* TUILE 2 : VÉLOS EN VENTE */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={4}
                  sx={{
                    minHeight: 420,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: 3,
                    borderColor: CATALOG_THEME.bikes.border,
                    bgcolor: CATALOG_THEME.bikes.bg,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                    },
                  }}
                  onClick={() => router.push('/catalog/bikes')}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <PedalBikeIcon 
                      sx={{ 
                        fontSize: 80, 
                        color: CATALOG_THEME.bikes.primary, 
                        mb: 2 
                      }} 
                    />
                    
                    <Typography variant="h5" gutterBottom fontWeight="bold" color={CATALOG_THEME.bikes.primary}>
                      Vélos en Vente
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      Neufs, occasions, électriques
                    </Typography>
                    
                    <Stack spacing={1.5} mb={3} sx={{ minHeight: 180 }}>
                      <Chip 
                        label={`En stock: ${stats.bikesCount} vélos`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.bikes.border }}
                      />
                      <Chip 
                        label={`Neufs: ${stats.bikesNew} • Occasions: ${stats.bikesUsed}`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.bikes.border }}
                      />
                      <Chip 
                        label={`⚡ Électriques: ${stats.bikesElectric}`} 
                        color="info"
                        size="small"
                      />
                      <Chip 
                        label={`Valeur: ${Math.round(stats.bikesValueHT)} € HT`} 
                        sx={{ 
                          bgcolor: CATALOG_THEME.bikes.primary, 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                      {stats.bikesInStock === 0 && (
                        <Chip 
                          label="⚠️ Aucun disponible" 
                          color="warning"
                          size="small"
                        />
                      )}
                    </Stack>

                    <Button
                      variant="contained"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: CATALOG_THEME.bikes.primary,
                        '&:hover': { bgcolor: '#1565C0' },
                      }}
                    >
                      Gérer les vélos
                    </Button>
                  </CardContent>
                </Card>
              </Grid>

              {/* TUILE 3 : PRESTATIONS & SERVICES */}
              <Grid item xs={12} md={4}>
                <Card
                  elevation={4}
                  sx={{
                    minHeight: 420,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: 3,
                    borderColor: CATALOG_THEME.services.border,
                    bgcolor: CATALOG_THEME.services.bg,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                    },
                  }}
                  onClick={() => router.push('/catalog/services')}
                >
                  <CardContent sx={{ textAlign: 'center', p: 4, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <BuildIcon 
                      sx={{ 
                        fontSize: 80, 
                        color: CATALOG_THEME.services.primary, 
                        mb: 2 
                      }} 
                    />
                    
                    <Typography variant="h5" gutterBottom fontWeight="bold" color={CATALOG_THEME.services.primary}>
                      Prestations & Services
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" mb={3}>
                      Tarifs, réparations, entretiens
                    </Typography>
                    
                    <Stack spacing={1.5} mb={3} sx={{ minHeight: 180 }}>
                      <Chip 
                        label={`Total: ${stats.servicesCount} prestations`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.services.border }}
                      />
                      <Chip 
                        label={`Actives: ${stats.servicesActive}`} 
                        color="success"
                        variant="outlined"
                      />
                      <Chip 
                        label={`Catégories: ${stats.servicesCategories}`} 
                        variant="outlined"
                        sx={{ borderColor: CATALOG_THEME.services.border }}
                      />
                      {stats.servicesLastUpdate && (
                        <Typography variant="caption" color="text.secondary">
                          MAJ : {new Date(stats.servicesLastUpdate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Stack>

                    <Button
                      variant="contained"
                      fullWidth
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: CATALOG_THEME.services.primary,
                        '&:hover': { bgcolor: '#388E3C' },
                      }}
                    >
                      Gérer les services
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>
    </RequireAuth>
  );
}
