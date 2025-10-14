"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import PageShell from "@/app/components/PageShell";
import RequireAuth from "@/app/components/RequireAuth";
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

type BikeHistory = {
  id: string;
  date: string;
  status: string;
  type: string;
  estimatedMinutes?: number;
  hourlyRate?: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  parts: Array<{
    id: string;
    description: string;
    qty: number;
    priceHT: number;
    totalHT: number;
    note?: string | null;
  }>;
};

type BikeDetails = {
  id: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  color?: string;
  wheelSize?: string;
  tireSize?: string;
  frameMaterial?: string;
  frameSize?: string;
  brakeType?: string;
  gearSystem?: string;
  notes?: string;
};

type Customer = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

export default function BikeHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedBike, setSelectedBike] = useState<string | null>(null);
  const [bikeHistory, setBikeHistory] = useState<{
    bike: BikeDetails;
    customer: Customer;
    history: BikeHistory[];
    stats: any;
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedInterventions, setExpandedInterventions] = useState<Set<string>>(new Set());

  async function handleSearch() {
    if (!searchQuery || searchQuery.trim().length < 2) {
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/bikes/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.customers || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  }

  async function loadBikeHistory(bikeId: string) {
    setSelectedBike(bikeId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/bikes/${bikeId}/history`);
      const data = await res.json();
      setBikeHistory(data);
    } catch (error) {
      console.error("Load history error:", error);
    } finally {
      setLoadingHistory(false);
    }
  }

  function toggleIntervention(id: string) {
    setExpandedInterventions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  return (
    <RequireAuth>
      <PageShell title="Historique des Vélos">
        <Stack spacing={3}>
          {/* Recherche */}
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <SearchIcon color="primary" />
              <Typography variant="h6">Rechercher un client</Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                placeholder="Nom, prénom, email ou téléphone du client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
              <IconButton
                color="primary"
                onClick={handleSearch}
                disabled={searching || searchQuery.trim().length < 2}
              >
                {searching ? <CircularProgress size={24} /> : <SearchIcon />}
              </IconButton>
            </Stack>
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
                          {customer.bikes.map((bike: any) => (
                            <Grid item xs={12} md={6} key={bike.id}>
                              <Card
                                variant="outlined"
                                sx={{
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  "&:hover": {
                                    boxShadow: 2,
                                    borderColor: "primary.main",
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
              <Typography sx={{ mt: 2 }}>Chargement de l'historique...</Typography>
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
                          sx={{ mb: 1 }}
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
                            <IconButton
                              size="small"
                              onClick={() => toggleIntervention(intervention.id)}
                            >
                              {expandedInterventions.has(intervention.id) ? (
                                <ExpandLessIcon />
                              ) : (
                                <ExpandMoreIcon />
                              )}
                            </IconButton>
                          </Stack>
                        </Stack>

                        <Collapse in={expandedInterventions.has(intervention.id)}>
                          <Divider sx={{ my: 2 }} />
                          
                          {/* Détails main d'œuvre */}
                          {intervention.laborCost > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Main d'œuvre
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
                                  Main d'œuvre
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
      </PageShell>
    </RequireAuth>
  );
}
