"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Skeleton,
} from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { useCachedData } from "@/hooks/useCachedData";
import { listInvoices, listCustomers, searchWorkOrders, type WorkOrder, getLowStock, type LowStockItem } from "@/lib/api";
import BuildIcon from "@mui/icons-material/Build";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EuroIcon from "@mui/icons-material/Euro";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ModernStatCard from "@/components/ModernStatCard";

async function fetchLowStockReal(): Promise<LowStockItem[]> {
  try {
    const data = await getLowStock();
    if (!Array.isArray(data)) return [];
    return data
      .filter(i => typeof i.stockQty === 'number' && typeof i.name === 'string')
      .sort((a,b) => (a.stockQty - (a.minStock ?? 0)) - (b.stockQty - (b.minStock ?? 0)))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// Types
type Stats = {
  pendingRepairs: number;
  completedThisMonth: number;
  monthlyRevenue: number;
  activeCustomers: number;
};

type Event = {
  id: string;
  title: string;
  date: string;
  type: string;
};

type Ticket = {
  id: string;
  customer: string;
  status: string;
  createdAt: string;
};

// Stats réelles basées sur API locales
async function fetchStatsReal(): Promise<Stats> {
  // 1) Tickets en attente: created (statuts réels: created, ready)
  const created = await searchWorkOrders({ status: "created" });
  const pendingRepairs = created?.length || 0;

  // 2) Terminés ce mois: ready passés en ready ce mois (filtré sur updatedAt)
  const ready = await searchWorkOrders({ status: "ready" });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const inMonth = (w: WorkOrder) => {
    try { 
      // Utilise updatedAt (date de dernière modification = passage en ready)
      const d = new Date((w as any).updatedAt || w.createdAt); 
      return d >= monthStart && d <= monthEnd; 
    } catch { 
      return false; 
    }
  };
  const completedThisMonth = (ready || []).filter(inMonth).length;

  // 3) Clients actifs: clients avec au moins 1 ticket dans les 6 derniers mois
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  const allWorkOrders = await searchWorkOrders({});
  const recentWorkOrders = (allWorkOrders || []).filter(wo => {
    try {
      const d = new Date(wo.createdAt as any);
      return d >= sixMonthsAgo && wo.customerId;
    } catch {
      return false;
    }
  });
  
  const uniqueCustomerIds = new Set(
    recentWorkOrders.map(wo => wo.customerId).filter(Boolean)
  );
  
  const activeCustomers = uniqueCustomerIds.size;

  // 4) CA mensuel (sera remplacé par paidRevenueMonth calculé ailleurs)
  return { pendingRepairs, completedThisMonth, monthlyRevenue: 0, activeCustomers };
}

async function fetchUpcomingEventsReal(): Promise<Event[]> {
  const start = new Date();
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
  const res = await fetch(`/api/calendar/bookings?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
  if (!res.ok) return [];
  const bookings: Array<{ id: string; name: string; start: string; end: string; status?: string }> = await res.json();
  // Map to event list
  return bookings
    .filter(b => (b.status || 'pending') !== 'cancelled')
    .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 10)
    .map(b => ({ id: b.id, title: `RDV ${b.name}`, date: b.start, type: 'booking' }));
}

async function fetchRecentTicketsReal(): Promise<Ticket[]> {
  const list = await searchWorkOrders({});
  const sorted = [...list].sort((a,b) => {
    const da = new Date(a.createdAt as any).getTime();
    const db = new Date(b.createdAt as any).getTime();
    return db - da;
  }).slice(0, 10);
  return sorted.map(w => {
    const customerName = w.customer ? [w.customer.firstName, w.customer.lastName].filter(Boolean).join(' ') : null;
    return { id: w.id, customer: customerName || w.customer?.email || '-', status: w.status, createdAt: w.createdAt as any };
  });
}

export default function DashboardPage() {
  // Utilisation du cache pour les données avec des valeurs par défaut
  const defaultStats: Stats = {
    pendingRepairs: 0,
    completedThisMonth: 0,
    monthlyRevenue: 0,
    activeCustomers: 0,
  };

  // Récupération des statistiques avec un cache de 5 minutes
  const { data: statsRaw, isLoading: isLoadingStats } = useCachedData<Stats>(
    "dashboard-stats",
    fetchStatsReal,
    {
      ttl: 5 * 60 * 1000, // 5 minutes de cache
    },
  );
  const stats = statsRaw ?? defaultStats;

  // Récupération des événements à venir avec un cache de 10 minutes
  const { data: upcomingEventsRaw, isLoading: isLoadingEvents } = useCachedData<Event[]>(
    "dashboard-events",
    fetchUpcomingEventsReal,
    {
      ttl: 10 * 60 * 1000, // 10 minutes de cache
    },
  );
  const upcomingEvents = upcomingEventsRaw ?? [];

  // Récupération des tickets récents avec un cache de 15 minutes
  const { data: recentTicketsRaw, isLoading: isLoadingTickets } = useCachedData<Ticket[]>(
    "dashboard-tickets",
    fetchRecentTicketsReal,
    {
      ttl: 15 * 60 * 1000, // 15 minutes de cache
    },
  );
  const recentTickets = recentTicketsRaw ?? [];

  // Low stock items (Top 5)
  const { data: lowStockRaw, isLoading: isLoadingLowStock } = useCachedData<LowStockItem[]> (
    "dashboard-low-stock",
    fetchLowStockReal,
    { ttl: 5 * 60 * 1000 }
  );
  const lowStock = lowStockRaw ?? [];

  // CA payé ce mois (depuis factures)
  const [paidRevenueMonth, setPaidRevenueMonth] = React.useState<number | null>(null);
  const [invoiceIssuedCount, setInvoiceIssuedCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    (async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const invoices = await listInvoices({ status: "paid", from: start.toISOString(), to: end.toISOString() });
        const sum = invoices.reduce((acc, i) => acc + (i.totalTTC || 0), 0);
        setPaidRevenueMonth(sum);
      } catch (e) {
        console.warn("Failed to load paid invoices for dashboard", e);
        setPaidRevenueMonth(null);
      }
    })();
  }, []);

  // Compte des factures émises (non payées)
  React.useEffect(() => {
    (async () => {
      try {
        const issued = await listInvoices({ status: 'issued' });
        setInvoiceIssuedCount(issued.length);
      } catch (e) {
        console.warn('Failed to load issued invoices for dashboard', e);
        setInvoiceIssuedCount(null);
      }
    })();
  }, []);

  // État de chargement global
  const isLoading = isLoadingStats || isLoadingEvents || isLoadingTickets || isLoadingLowStock;

  // (refresh function not used for now)

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("fr-FR", options);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "terminé":
        return "success.main";
      case "en cours":
        return "warning.main";
      case "en attente de pièces":
        return "info.main";
      default:
        return "text.primary";
    }
  };

  // Rendu strictement déterministe pendant le chargement pour éviter tout mismatch SSR/CSR
  if (isLoading) {
    return (
      <RequireAuth>
        <PageShell title="Tableau de bord" maxWidth="lg">
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[0, 1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      <Skeleton width={160} height={20} />
                    </Typography>
                    <Typography variant="h4" component="div">
                      <Skeleton width={80} height={36} />
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Skeleton width={120} height={28} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6" component="h2">
                    Prochains rendez-vous
                  </Typography>
                  <Button size="small" disabled>
                    Voir tout
                  </Button>
                </Box>
                <List sx={{ width: "100%", bgcolor: "background.paper" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <ListItem alignItems="flex-start">
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: "grey.400",
                            mt: 1.5,
                            mr: 2,
                          }}
                        />
                        <ListItemText
                          primary={<Skeleton width={200} />}
                          secondary={<Skeleton width={140} />}
                        />
                      </ListItem>
                      {i < 2 && <Divider variant="inset" component="li" />}
                    </div>
                  ))}
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: "100%" }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography variant="h6" component="h2">
                    Derniers tickets
                  </Typography>
                  <Button size="small" disabled>
                    Voir tout
                  </Button>
                </Box>
                <List sx={{ width: "100%", bgcolor: "background.paper" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <ListItem alignItems="flex-start">
                        <ListItemText
                          primary={<Skeleton width={260} />}
                          secondary={<Skeleton width={200} />}
                        />
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          <Skeleton width={100} />
                        </Typography>
                      </ListItem>
                      {i < 2 && <Divider variant="inset" component="li" />}
                    </div>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </PageShell>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderBottom: 2,
            borderColor: '#667eea',
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="lg">
            <Stack direction="row" alignItems="center" spacing={2}>
              <DashboardIcon sx={{ fontSize: 40, color: 'white' }} />
              <Box>
                <Typography variant="h4" fontWeight={700} color="white">
                  📊 Tableau de Bord
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Vue d'ensemble de votre activité
                </Typography>
              </Box>
            </Stack>
          </Container>
        </Box>
        <Container maxWidth="lg">
        {/* Cartes de statistiques (responsive: 1/2/3/4/5 colonnes selon taille écran) */}
        <Box sx={{
          mb: 4,
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { 
            xs: '1fr',                // Mobile: 1 colonne
            sm: '1fr 1fr',            // Tablet: 2 colonnes
            md: 'repeat(3, 1fr)',     // Desktop: 3 colonnes
            lg: 'repeat(4, 1fr)',     // Large: 4 colonnes
            xl: 'repeat(5, 1fr)'      // Extra Large: 5 colonnes
          },
          alignItems: 'stretch',
        }}>
          <Card 
            elevation={0}
            sx={{ 
              height: 180, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#FF9800',
              bgcolor: '#FFF3E0',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#FF9800', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BuildIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#E65100">Réparations en attente</Typography>
              </Box>
              <Typography variant="h3" component="div" fontWeight={700} color="#E65100">{stats.pendingRepairs}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/tickets?status=En cours,En attente")}
                  sx={{ bgcolor: '#FF9800', '&:hover': { bgcolor: '#F57C00' } }}
                >
                  Voir les tickets
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 180, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#66BB6A',
              bgcolor: '#E8F5E9',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#66BB6A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DoneAllIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#2E7D32">Terminés ce mois</Typography>
              </Box>
              <Typography variant="h3" component="div" fontWeight={700} color="#2E7D32">{stats.completedThisMonth}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/tickets?status=Terminé")}
                  sx={{ bgcolor: '#66BB6A', '&:hover': { bgcolor: '#4CAF50' } }}
                >
                  Voir l'historique
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 180, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#42A5F5',
              bgcolor: '#E3F2FD',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#42A5F5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EuroIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#1565C0">CA du mois</Typography>
              </Box>
              <Typography variant="h3" component="div" fontWeight={700} color="#1565C0">
                <span suppressHydrationWarning>{(paidRevenueMonth ?? stats.monthlyRevenue).toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0})}</span>
              </Typography>
              {paidRevenueMonth != null && (
                <Typography variant="caption" color="#1565C0" sx={{ mt: 0.5 }}>Factures payées</Typography>
              )}
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/finance")}
                  sx={{ bgcolor: '#42A5F5', '&:hover': { bgcolor: '#1E88E5' } }}
                >
                  Voir factures
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 180, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#AB47BC',
              bgcolor: '#F3E5F5',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#AB47BC', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReceiptLongIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#6A1B9A">Factures à payer</Typography>
              </Box>
              <Typography variant="h3" component="div" fontWeight={700} color="#6A1B9A">{invoiceIssuedCount ?? '—'}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/finance?status=issued")}
                  sx={{ bgcolor: '#AB47BC', '&:hover': { bgcolor: '#8E24AA' } }}
                >
                  Voir factures
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 180, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#EC407A',
              bgcolor: '#FCE4EC',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: '#EC407A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PeopleAltIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#C2185B">Clients actifs</Typography>
              </Box>
              <Typography variant="h3" component="div" fontWeight={700} color="#C2185B">{stats.activeCustomers}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/customers")}
                  sx={{ bgcolor: '#EC407A', '&:hover': { bgcolor: '#D81B60' } }}
                >
                  Voir clients
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Grid container spacing={3}>
          {/* Alerte stock bas */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                height: "100%",
                border: 3,
                borderColor: '#FF5722',
                bgcolor: '#FBE9E7'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h2" fontWeight={700} color="#BF360C">
                  ⚠️ Alerte stock bas
                </Typography>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => (window.location.href = "/catalog")}
                  sx={{ bgcolor: '#FF5722', '&:hover': { bgcolor: '#E64A19' } }}
                >
                  Catalogue
                </Button>
              </Box>
              <List sx={{ width: "100%", bgcolor: "background.paper" }}>
                {lowStock.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucun article en alerte</Typography>
                ) : (
                  lowStock.map((it, idx) => (
                    <div key={it.id}>
                      <ListItem alignItems="flex-start" sx={{ cursor: 'pointer' }} onClick={() => (window.location.href = `/catalog/items/${encodeURIComponent(it.name)}`)}>
                        <ListItemText
                          primary={it.name}
                          secondary={`Stock: ${it.stockQty} (min ${it.minStock ?? '-'} )`}
                          primaryTypographyProps={{ fontWeight: 'medium' }}
                        />
                      </ListItem>
                      {idx < lowStock.length - 1 && <Divider variant="inset" component="li" />}
                    </div>
                  ))
                )}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                height: "100%",
                border: 3,
                borderColor: '#26C6DA',
                bgcolor: '#E0F7FA'
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2" fontWeight={700} color="#00838F">
                  📅 Prochains rendez-vous
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => (window.location.href = "/calendar")}
                  sx={{ bgcolor: '#26C6DA', '&:hover': { bgcolor: '#00ACC1' } }}
                >
                  Voir tout
                </Button>
              </Box>
              <List sx={{ width: "100%", bgcolor: "background.paper" }}>
                {upcomingEvents.map((event, index) => (
                  <div key={event.id}>
                    <ListItem alignItems="flex-start">
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          bgcolor:
                            event.type === "pickup"
                              ? "success.main"
                              : event.type === "dropoff"
                                ? "primary.main"
                                : "warning.main",
                          mt: 1.5,
                          mr: 2,
                        }}
                      />
                      <ListItemText
                        primary={event.title}
                        secondary={formatDate(event.date)}
                        primaryTypographyProps={{ fontWeight: "medium" }}
                      />
                    </ListItem>
                    {index < upcomingEvents.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </div>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Derniers tickets */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2">
                  Derniers tickets
                </Typography>
                <Button
                  size="small"
                  onClick={() => (window.location.href = "/tickets")}
                >
                  Voir tout
                </Button>
              </Box>
              <List sx={{ width: "100%", bgcolor: "background.paper" }}>
                {recentTickets.map((ticket, index) => (
                  <div key={ticket.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{ cursor: "pointer" }}
                      onClick={() =>
                        (window.location.href = `/tickets/${ticket.id}`)
                      }
                    >
                      <ListItemText
                        primary={`Ticket #${ticket.id} - ${ticket.customer}`}
                        secondary={
                          <span suppressHydrationWarning>
                            {new Date(ticket.createdAt).toLocaleDateString(
                              "fr-FR",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        }
                        primaryTypographyProps={{ fontWeight: "medium" }}
                      />
                      <Typography
                        variant="body2"
                        color={getStatusColor(ticket.status)}
                        sx={{
                          fontWeight: "medium",
                          textTransform: "capitalize",
                          ml: 2,
                        }}
                      >
                        {ticket.status}
                      </Typography>
                    </ListItem>
                    {index < recentTickets.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </div>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
        </Container>
      </Box>
    </RequireAuth>
  );
}
