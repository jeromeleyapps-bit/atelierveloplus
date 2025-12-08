"use client";

// ✅ Hooks personnalisés
import { useBikeSearch } from '@/hooks/useBikeSearch';
import { useBikeHistoryUI } from '@/hooks/useBikeHistoryUI';
import { useBikeHistoryData } from '@/hooks/useBikeHistoryData';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';

import Collapse from '@mui/material/Collapse';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Autocomplete from '@mui/material/Autocomplete';

import RequireAuth from "@/app/components/RequireAuth";
import Container from "@mui/material/Container";
import PedalBikeIcon from "@mui/icons-material/PedalBike";
import SearchIcon from "@mui/icons-material/Search";
import DirectionsBikeIcon from "@mui/icons-material/DirectionsBike";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import BuildIcon from "@mui/icons-material/Build";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import InfoIcon from "@mui/icons-material/Info";

export default function BikeHistoryPage() {
  // ✅ Hooks personnalisés
  const bikeSearch = useBikeSearch();
  const bikeUI = useBikeHistoryUI();
  const bikeHistoryData = useBikeHistoryData(bikeUI.selectedBike);

  // Alias locaux
  const searchQuery = bikeUI.searchQuery;
  const setSearchQuery = bikeUI.setSearchQuery;
  const _searching = bikeSearch.searching;
  const searchResults = bikeSearch.searchResults;
  const setSearchResults = bikeSearch.setSearchResults;
  const autocompleteOptions = bikeSearch.autocompleteOptions;
  const setAutocompleteOptions = bikeSearch.setAutocompleteOptions;
  const loadingAutocomplete = bikeSearch.loadingAutocomplete;
  const handleSearch = bikeSearch.handleSearch;
  const handleAutocompleteSearch = bikeSearch.handleAutocompleteSearch;
  const selectedBike = bikeUI.selectedBike;
  const setSelectedBike = bikeUI.setSelectedBike;
  const bikeHistory = bikeHistoryData.bikeHistory;
  const loadingHistory = bikeHistoryData.loadingHistory;
  const expandedInterventions = bikeUI.expandedInterventions;
  const toggleIntervention = bikeUI.toggleIntervention;

  function loadBikeHistory(bikeId: string) {
    setSelectedBike(bikeId);
  }

  // Thème bleu pour vélos
  const theme = {
    bg: '#E3F2FD',
    border: '#42A5F5',
    text: '#1565C0',
    primary: '#42A5F5',
    primaryDark: '#1E88E5',
    primaryLight: '#E3F2FD',
  };

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Bleu */}
        <Box
          sx={{
            bgcolor: theme.bg,
            borderBottom: 2,
            borderColor: theme.border,
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" spacing={2}>
              <PedalBikeIcon sx={{ fontSize: 40, color: theme.text }} />
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                  🚲 Historique des Vélos
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Recherche et suivi des interventions
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="xl">
        <Stack spacing={3}>
          {/* Recherche */}
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <SearchIcon color="primary" />
              <Typography variant="h6">Rechercher un client</Typography>
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Autocomplete
                freeSolo
                options={autocompleteOptions}
                loading={loadingAutocomplete}
                value={searchQuery}
                onInputChange={(_, newValue) => {
                  setSearchQuery(newValue);
                  if (newValue.length >= 2) {
                    handleAutocompleteSearch(newValue);
                  } else {
                    setAutocompleteOptions([]);
                  }
                }}
                onChange={(_, value) => {
                  if (typeof value === 'object' && value !== null) {
                    setSearchResults([value.value]);
                  } else if (typeof value === 'string') {
                    handleSearch(value);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Nom, prénom, email ou téléphone du client..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {loadingAutocomplete ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch(searchQuery);
                      }
                    }}
                  />
                )}
              />
            </Box>
          </Paper>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Résultats ({searchResults.length})
              </Typography>
              <Stack spacing={2}>
                {searchResults.map((customer) => (
                  <Card key={customer.id} variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <PersonIcon color="primary" />
                        <Box flex={1}>
                          <Typography variant="h6">
                            {customer.firstName} {customer.lastName}
                          </Typography>
                          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                            {customer.email && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <EmailIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {customer.email}
                                </Typography>
                              </Stack>
                            )}
                            {customer.phone && (
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <PhoneIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {customer.phone}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </Box>
                      </Stack>

                      {customer.bikes.length === 0 ? (
                        <Alert severity="info">Aucun vélo enregistré</Alert>
                      ) : (
                        <Grid container spacing={2}>
                          {customer.bikes.map((bike: { id: string; brand?: string; model?: string; serialNumber?: string; tireSize?: string; wheelSize?: string; interventionsCount?: number; lastIntervention?: { createdAt: string } }) => (
                            <Grid item xs={12} md={6} key={bike.id}>
                              <Card
                                variant="outlined"
                                sx={{
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    boxShadow: 2,
                                    borderColor: "#1976d2",
                                  },
                                  bgcolor: selectedBike === bike.id ? "action.selected" : "background.paper",
                                }}
                                onClick={() => loadBikeHistory(bike.id)}
                              >
                                <CardContent>
                                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                    <DirectionsBikeIcon color="primary" />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {bike.brand || "Marque inconnue"} {bike.model || ""}
                                    </Typography>
                                  </Stack>
                                  {bike.tireSize && (
                                    <Typography variant="body2" color="text.secondary">
                                      🛞 Pneus: {bike.tireSize}
                                    </Typography>
                                  )}
                                  {bike.wheelSize && (
                                    <Typography variant="body2" color="text.secondary">
                                      ⚙️ Roues: {bike.wheelSize}
                                    </Typography>
                                  )}
                                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                    <Chip
                                      size="small"
                                      label={`${bike.interventionsCount} intervention${bike.interventionsCount > 1 ? "s" : ""}`}
                                      color="primary"
                                      variant="outlined"
                                    />
                                    {bike.lastIntervention && (
                                      <Chip
                                        size="small"
                                        label={`Dernière: ${new Date(bike.lastIntervention.createdAt).toLocaleDateString()}`}
                                        variant="outlined"
                                      />
                                    )}
                                  </Stack>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Paper>
          )}

          {/* Historique du vélo sélectionné */}
          {loadingHistory && (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Chargement de l&apos;historique...</Typography>
            </Paper>
          )}

          {bikeHistory && !loadingHistory && (
            <Paper sx={{ p: 3 }}>
              {/* En-tête vélo */}
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <DirectionsBikeIcon color="primary" fontSize="large" />
                <Box flex={1}>
                  <Typography variant="h5">
                    {bikeHistory.bike.brand || "Marque inconnue"} {bikeHistory.bike.model || ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Client: {bikeHistory.customer.firstName} {bikeHistory.customer.lastName}
                  </Typography>
                </Box>
                <Chip
                  label={`${bikeHistory.stats.totalInterventions} intervention${bikeHistory.stats.totalInterventions > 1 ? "s" : ""}`}
                  color="primary"
                />
              </Stack>

              {/* Spécifications techniques */}
              <Card variant="outlined" sx={{ mb: 3, bgcolor: "info.50" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <InfoIcon color="info" />
                    <Typography variant="h6">Spécifications Techniques</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    {bikeHistory.bike.tireSize && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Pneus
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.tireSize}
                        </Typography>
                      </Grid>
                    )}
                    {bikeHistory.bike.wheelSize && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Roues
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.wheelSize}
                        </Typography>
                      </Grid>
                    )}
                    {bikeHistory.bike.brakeType && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Freins
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.brakeType}
                        </Typography>
                      </Grid>
                    )}
                    {bikeHistory.bike.gearSystem && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Transmission
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.gearSystem}
                        </Typography>
                      </Grid>
                    )}
                    {bikeHistory.bike.frameMaterial && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Cadre
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.frameMaterial}
                        </Typography>
                      </Grid>
                    )}
                    {bikeHistory.bike.frameSize && (
                      <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body2" color="text.secondary">
                          Taille
                        </Typography>
                        <Typography variant="body1" fontWeight={600}>
                          {bikeHistory.bike.frameSize}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Statistiques */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total dépensé
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {bikeHistory.stats.totalSpent.toFixed(2)} €
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Interventions
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {bikeHistory.stats.totalInterventions}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Dernière intervention
                      </Typography>
                      <Typography variant="h6">
                        {bikeHistory.stats.lastIntervention
                          ? new Date(bikeHistory.stats.lastIntervention).toLocaleDateString("fr-FR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Aucune"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              {/* Liste des interventions */}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <HistoryIcon color="primary" />
                <Typography variant="h6">Historique des Interventions</Typography>
              </Stack>

              {bikeHistory.history.length === 0 ? (
                <Alert severity="info">Aucune intervention enregistrée</Alert>
              ) : (
                <Stack spacing={2}>
                  {bikeHistory.history.map((intervention) => (
                    <Card key={intervention.id} variant="outlined">
                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ 
                            mb: 1,
                            cursor: 'pointer',
                            p: 1,
                            borderRadius: 1,
                            '&:hover': {
                              bgcolor: 'action.hover',
                            },
                          }}
                          onClick={() => toggleIntervention(intervention.id)}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <BuildIcon color="primary" />
                            <Typography variant="h6">
                              {new Date(intervention.date).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </Typography>
                            <Chip label={intervention.type} size="small" color="primary" variant="outlined" />
                            <Chip label={intervention.status} size="small" />
                          </Stack>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="h6" color="primary">
                              {intervention.totalCost.toFixed(2)} €
                            </Typography>
                            <Chip 
                              label={expandedInterventions.has(intervention.id) ? "Masquer" : "Voir détails"}
                              size="small"
                              color="primary"
                              icon={expandedInterventions.has(intervention.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            />
                          </Stack>
                        </Stack>

                        <Collapse in={expandedInterventions.has(intervention.id)}>
                          <Divider sx={{ my: 2 }} />
                          
                          {/* Détails main d'œuvre */}
                          {intervention.laborCost > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Main d&apos;œuvre
                              </Typography>
                              <Typography variant="body2">
                                {intervention.estimatedMinutes} minutes à {intervention.hourlyRate} €/h
                                = {intervention.laborCost.toFixed(2)} € HT
                              </Typography>
                            </Box>
                          )}

                          {/* Liste des pièces */}
                          {intervention.parts.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                Pièces utilisées
                              </Typography>
                              <TableContainer>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Description</TableCell>
                                      <TableCell align="right">Qté</TableCell>
                                      <TableCell align="right">PU HT</TableCell>
                                      <TableCell align="right">Total HT</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {intervention.parts.map((part) => (
                                      <TableRow key={part.id}>
                                        <TableCell>
                                          {part.description}
                                          {part.note && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                              {part.note}
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell align="right">{part.qty}</TableCell>
                                        <TableCell align="right">{part.priceHT.toFixed(2)} €</TableCell>
                                        <TableCell align="right">{part.totalHT.toFixed(2)} €</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}

                          {/* Totaux */}
                          <Box sx={{ mt: 2, p: 2, bgcolor: "background.default", borderRadius: 1 }}>
                            <Grid container spacing={2}>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Main d&apos;œuvre
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {intervention.laborCost.toFixed(2)} €
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Pièces
                                </Typography>
                                <Typography variant="body1" fontWeight={600}>
                                  {intervention.partsCost.toFixed(2)} €
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="body2" color="text.secondary">
                                  Total HT
                                </Typography>
                                <Typography variant="h6" color="primary">
                                  {intervention.totalCost.toFixed(2)} €
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Paper>
          )}
        </Stack>
        </Container>
      </Box>
    </RequireAuth>
  );
}
