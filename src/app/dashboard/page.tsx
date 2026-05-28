"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthContext";
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
// RequireAuth géré par dashboard/layout.tsx

import ResponsiveContainer from "@/components/ResponsiveContainer";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { useCachedData } from "@/hooks/useCachedData";
import { useDashboardRevenue } from "@/hooks/useDashboardRevenue";
import { listInvoices, searchWorkOrders, type WorkOrder, getLowStock, type LowStockItem } from "@/lib/api";
import { formatTicketNumber, formatCustomerNumber } from "@/lib/ticket-number";
import BuildIcon from "@mui/icons-material/Build";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EuroIcon from "@mui/icons-material/Euro";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import OnboardingWizard from "../components/OnboardingWizard";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

type LatestInvoice = {
  id: string;
  number: string | null;
  customer: string;
  customerId?: string;
  totalTTC: number;
  status: string;
  issueDate: string | null;
};

type BikeNewsItem = {
  title: string;
  link: string;
  source: string;
  category: string;
  pubDate: string;
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
      const d = new Date((w as { updatedAt?: string | Date }).updatedAt || w.createdAt); 
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
      const d = new Date(wo.createdAt);
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
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return db - da;
  }).slice(0, 10);
  return sorted.map(w => {
    const customerName = w.customer ? [w.customer.firstName, w.customer.lastName].filter(Boolean).join(' ') : null;
    return { id: w.id, customer: customerName || w.customer?.email || '-', status: w.status, createdAt: w.createdAt as string };
  });
}

async function fetchLatestInvoiceReal(): Promise<LatestInvoice | null> {
  try {
    const invoices = await listInvoices({ status: 'issued' });
    if (!invoices || invoices.length === 0) return null;
    
    const sorted = [...invoices].sort((a, b) => {
      const da = a.issueDate ? new Date(a.issueDate).getTime() : 0;
      const db = b.issueDate ? new Date(b.issueDate).getTime() : 0;
      return db - da;
    });
    
    const latest = sorted[0] as { 
      id: string; 
      number?: string; 
      customerName?: string; // Nom déjà formaté par l'API
      customerId?: string;
      totalTTC?: number;
      status?: string;
      issueDate?: string | Date;
    };
    
    // Utiliser customerName fourni par l'API, sinon "Client non renseigné"
    const displayName = latest.customerName || 'Client non renseigné';
    
    return {
      id: latest.id,
      number: latest.number || null,
      customer: displayName,
      customerId: latest.customerId,
      totalTTC: latest.totalTTC || 0,
      status: latest.status || 'issued',
      issueDate: latest.issueDate instanceof Date ? latest.issueDate.toISOString() : latest.issueDate,
    };
  } catch (error) {
    logger.error('Erreur récupération dernière facture:', error);
    return null;
  }
}

// Composant interne avec tout le contenu du dashboard
function DashboardContent({ user }: { user: { id: string; email?: string; shopName?: string } }) {
  const router = useRouter();
  
  // État wizard onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [_checkingSettings, setCheckingSettings] = useState(true);

  // Vérifier si l'onboarding est nécessaire
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const token = localStorage.getItem("jwt_token");
        const response = await fetch("/api/account/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const settings = await response.json();
          // Option C: Wizard s'affiche TOUJOURS si shopName vide
          // Formulaire register = email+password UNIQUEMENT
          // Wizard = configuration complète (6 étapes)
          if (!settings.shopName) {
            setShowOnboarding(true);
          }
        }
      } catch (e) {
        logger.error("Error checking onboarding:", e);
      } finally {
        setCheckingSettings(false);
      }
    }
    
    checkOnboarding();
  }, []);

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
      enabled: !!user, // Ne charger que si authentifié
    },
  );
  const stats = statsRaw ?? defaultStats;

  // Récupération des événements à venir avec un cache de 10 minutes
  const { data: upcomingEventsRaw, isLoading: isLoadingEvents } = useCachedData<Event[]>(
    "dashboard-events",
    fetchUpcomingEventsReal,
    {
      ttl: 10 * 60 * 1000, // 10 minutes de cache
      enabled: !!user, // Ne charger que si authentifié
    },
  );
  const upcomingEvents = upcomingEventsRaw ?? [];

  // Récupération des tickets récents avec un cache de 15 minutes
  const { data: recentTicketsRaw, isLoading: isLoadingTickets } = useCachedData<Ticket[]>(
    "dashboard-tickets",
    fetchRecentTicketsReal,
    {
      ttl: 15 * 60 * 1000, // 15 minutes de cache
      enabled: !!user, // Ne charger que si authentifié
    },
  );
  const recentTickets = recentTicketsRaw ?? [];

  // Dernière facture émise avec un cache de 5 minutes
  const [latestInvoice, setLatestInvoice] = useState<LatestInvoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(true);
  const [bikeNews, setBikeNews] = useState<BikeNewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);

  // Fonction pour charger les actualités vélo (stable avec useCallback)
  const fetchBikeNews = useCallback(() => {
    fetch('/api/news/bike-feeds')
      .then(res => res.json())
      .then(data => {
        setBikeNews(data.items || []);
        setIsLoadingNews(false);
      })
      .catch(() => setIsLoadingNews(false));
  }, []);

  // Vérifier si l'onboarding est nécessaire
  useEffect(() => {
    async function checkOnboarding() {
      try {
        const token = localStorage.getItem("jwt_token");
        const response = await fetch("/api/account/settings", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const settings = await response.json();
          // Option C: Wizard s'affiche TOUJOURS si shopName vide
          // Formulaire register = email+password UNIQUEMENT
          // Wizard = configuration complète (6 étapes)
          if (!settings.shopName) {
            setShowOnboarding(true);
          }
        }
      } catch (e) {
        logger.error("Error checking onboarding:", e);
      } finally {
        setCheckingSettings(false);
      }
    }
    
    checkOnboarding();
    
    // Charger dernière facture
    fetchLatestInvoiceReal()
      .then(data => {
        setLatestInvoice(data);
        setIsLoadingInvoice(false);
      })
      .catch(() => setIsLoadingInvoice(false));
    
    // Charger actualités vélo au montage
    fetchBikeNews();
  }, [fetchBikeNews]);

  // Rafraîchissement automatique des actualités toutes les heures
  useEffect(() => {
    const interval = setInterval(() => {
      logger.info('[Dashboard] Auto-refresh bike news');
      fetchBikeNews();
    }, 60 * 60 * 1000); // 1 heure (3600000 ms)

    return () => clearInterval(interval);
  }, [fetchBikeNews]);

  // Low stock items (Top 5)
  const { data: lowStockRaw, isLoading: isLoadingLowStock } = useCachedData<LowStockItem[]> (
    "dashboard-low-stock",
    fetchLowStockReal,
    { ttl: 5 * 60 * 1000, enabled: !!user }
  );
  const lowStock = lowStockRaw ?? [];

  // ✅ Hook personnalisé pour revenue et invoices count/amount
  const { paidRevenueMonth, invoiceIssuedCount: _invoiceIssuedCount, invoiceIssuedAmount, isLoading: isLoadingRevenue } = useDashboardRevenue();

  // État de chargement global
  const isLoading = isLoadingStats || isLoadingEvents || isLoadingTickets || isLoadingLowStock || isLoadingRevenue;

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
      case "in_progress": // Support ancien format anglais
        return "warning.main";
      case "en attente de pièces":
        return "info.main";
      default:
        return "text.primary";
    }
  };

  const translateStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "in_progress":
        return "En cours";
      case "created":
        return "Créé";
      case "ready":
        return "Prêt";
      case "completed":
        return "Terminé";
      default:
        return status;
    }
  };

  // Rendu strictement déterministe pendant le chargement pour éviter tout mismatch SSR/CSR
  if (isLoading) {
    return (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
          {/* Header Moderne Gradient */}
          <Box
            sx={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderBottom: 2,
              borderColor: '#3b82f6',
              py: 3,
              mb: 3,
            }}
          >
            <ResponsiveContainer sx={{ py: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <DashboardIcon sx={{ fontSize: 40, color: 'white' }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} color="white">
                    📊 Tableau de Bord
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                    Vue d{"'"}ensemble de votre activité
                  </Typography>
                </Box>
              </Stack>
            </ResponsiveContainer>
          </Box>
          <ResponsiveContainer>
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
          </ResponsiveContainer>
        </Box>
    );
  }

  return (
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderBottom: 2,
            borderColor: '#3b82f6',
            py: 3,
            mb: 3,
          }}
        >
          <ResponsiveContainer sx={{ py: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <DashboardIcon sx={{ fontSize: 40, color: 'white' }} />
              <Box>
                <Typography variant="h4" fontWeight={700} color="white">
                  📊 Tableau de Bord
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  Vue d{"'"}ensemble de votre activité
                </Typography>
              </Box>
            </Stack>
          </ResponsiveContainer>
        </Box>
        <ResponsiveContainer>
        {/* TEST INFRASTRUCTURE - Phase 3 - Decommente si besoin debug */}
        {/* <TestInfrastructure /> */}
        
        {/* Cartes de statistiques (responsive: 1/2/3/4/5 colonnes selon taille écran) */}
        <Box sx={{
          mb: 4,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { 
            xs: '1fr',                // Mobile: 1 colonne
            sm: 'repeat(2, 1fr)',     // Tablet: 2 colonnes
            md: 'repeat(3, 1fr)',     // Desktop: 3 colonnes
            lg: 'repeat(5, 1fr)',     // Large: 5 colonnes sur une ligne
            xl: 'repeat(5, 1fr)'      // Extra Large: 5 colonnes
          },
          alignItems: 'stretch',
        }}>
          <Card 
            elevation={0}
            sx={{ 
              height: 140, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#06b6d4',
              bgcolor: '#cffafe',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#06b6d4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BuildIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#0e7490">Réparations en attente</Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight={700} color="#0e7490">{stats.pendingRepairs}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => router.push("/tickets?status=En cours,En attente")}
                  sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' } }}
                >
                  Voir les tickets
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 140, 
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
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#66BB6A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DoneAllIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#2E7D32">Terminés ce mois</Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight={700} color="#2E7D32">{stats.completedThisMonth}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => router.push("/tickets?status=Terminé")}
                  sx={{ bgcolor: '#66BB6A', '&:hover': { bgcolor: '#4CAF50' } }}
                >
                  Voir l{"'"}historique
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 140, 
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
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#42A5F5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <EuroIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#1565C0">CA du mois</Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight={700} color="#1565C0">
                <span suppressHydrationWarning>{paidRevenueMonth.toLocaleString('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0})}</span>
              </Typography>
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
              height: 140, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#10b981',
              bgcolor: '#d1fae5',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ReceiptLongIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#047857">En attente d{"'"}encaissement</Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight={700} color="#047857">{invoiceIssuedAmount.toLocaleString('fr-FR', {style:'currency',currency:'EUR',minimumFractionDigits:0})}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => router.push("/finance?status=issued")}
                  sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                >
                  Voir factures
                </Button>
              </Box>
            </CardContent>
          </Card>

          <Card 
            elevation={0}
            sx={{ 
              height: 140, 
              display: 'flex', 
              flexDirection: 'column', 
              border: 3,
              borderColor: '#0ea5e9',
              bgcolor: '#e0f2fe',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)' }
            }}
          >
            <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PeopleAltIcon />
                </Box>
                <Typography variant="subtitle2" fontWeight={600} color="#0369a1">Clients actifs</Typography>
              </Box>
              <Typography variant="h4" component="div" fontWeight={700} color="#0369a1">{stats.activeCustomers}</Typography>
              <Box sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  variant="contained"
                  onClick={() => router.push("/customers")}
                  sx={{ bgcolor: '#0ea5e9', '&:hover': { bgcolor: '#0284c7' } }}
                >
                  Voir clients
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Grid container spacing={3}>
          {/* Alerte stock bas - Toujours visible pour équilibre visuel */}
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
                  onClick={() => router.push("/catalog")}
                  sx={{ bgcolor: '#FF5722', '&:hover': { bgcolor: '#E64A19' } }}
                >
                  Catalogue
                </Button>
              </Box>
              <Box
                sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1
                }}
              >
                {lowStock.length === 0 ? (
                  <Box sx={{ p: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight="medium" color="text.secondary">
                      ✅ Aucun article en alerte - Stock OK
                    </Typography>
                  </Box>
                ) : (
                  lowStock.map((it, idx) => (
                    <div key={it.id}>
                      <Box
                        sx={{ 
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          p: 1.5,
                          '&:hover': { bgcolor: 'action.hover' },
                          borderRadius: 1
                        }}
                        onClick={() => router.push(`/catalog?search=${encodeURIComponent(it.name)}`)}
                      >
                        <Box>
                          <Typography variant="subtitle1" fontWeight="medium">
                            {it.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Stock: {it.stockQty} (min {it.minStock ?? '-'})
                          </Typography>
                        </Box>
                      </Box>
                      {idx < lowStock.length - 1 && <Divider sx={{ my: 1 }} />}
                    </div>
                  ))
                )}
              </Box>
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
                  onClick={() => router.push("/admin/calendar")}
                  sx={{ bgcolor: '#26C6DA', '&:hover': { bgcolor: '#00ACC1' } }}
                >
                  Voir tout
                </Button>
              </Box>
              <Box
                sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1
                }}
              >
                {upcomingEvents.map((event, index) => (
                  <div key={event.id}>
                    <Box
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        p: 1.5,
                        borderRadius: 1
                      }}
                    >
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
                          mt: 0.5,
                          mr: 2,
                          flexShrink: 0
                        }}
                      />
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {event.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(event.date)}
                        </Typography>
                      </Box>
                    </Box>
                    {index < upcomingEvents.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </div>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Derniers tickets */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                height: "100%",
                border: 3,
                borderColor: '#9C27B0',
                bgcolor: '#F3E5F5'
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2" fontWeight={700} color="#6A1B9A">
                  Derniers tickets
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => (window.location.href = "/tickets")}
                  sx={{ bgcolor: '#9C27B0', '&:hover': { bgcolor: '#7B1FA2' } }}
                >
                  Voir tout
                </Button>
              </Box>
              <Box
                sx={{ 
                  p: 2, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1
                }}
              >
                {recentTickets.map((ticket, index) => (
                  <div key={ticket.id}>
                    <Box
                      sx={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        p: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 1
                      }}
                      onClick={() => (window.location.href = `/tickets/${ticket.id}`)}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          Ticket #{formatTicketNumber(ticket.id, ticket.createdAt)} - {ticket.customer}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
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
                        </Typography>
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: ticket.status.toLowerCase() === 'in_progress' || ticket.status.toLowerCase() === 'en cours' ? '#fef3c7' : '#e0e7ff',
                          color: ticket.status.toLowerCase() === 'in_progress' || ticket.status.toLowerCase() === 'en cours' ? '#92400e' : '#3730a3',
                          fontWeight: 600,
                        }}
                      >
                        {translateStatus(ticket.status)}
                      </Typography>
                    </Box>
                    {index < recentTickets.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </div>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Dernière facture émise */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                height: "100%",
                border: 3,
                borderColor: '#4CAF50',
                bgcolor: '#E8F5E9'
              }}
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" component="h2" fontWeight={700} color="#2E7D32">
                  Dernière facture émise
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => (window.location.href = "/finance")}
                  sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
                >
                  Voir tout
                </Button>
              </Box>
              {isLoadingInvoice ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chargement...
                  </Typography>
                </Box>
              ) : latestInvoice ? (
                <Box
                  sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => (window.location.href = `/finance/invoices/${latestInvoice.id}`)}
                >
                  <Stack spacing={1.5}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight="medium">
                        {latestInvoice.number || `Facture #${latestInvoice.id.slice(-8)}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: '#d1fae5',
                          color: '#047857',
                          fontWeight: 600,
                        }}
                      >
                        Émise
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Client: {latestInvoice.customer}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        <span suppressHydrationWarning>
                          {latestInvoice.totalTTC.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <span suppressHydrationWarning>
                          {latestInvoice.issueDate
                            ? new Date(latestInvoice.issueDate).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucune facture émise
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Actualités Vélo - Full width */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3,
                border: 3,
                borderColor: '#673AB7',
                bgcolor: '#EDE7F6'
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" component="h2" fontWeight={700} color="#4527A0">
                  📰 Actualités Vélo
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Derniers articles des magazines spécialisés
                </Typography>
              </Box>
              
              {isLoadingNews ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} variant="text" height={30} />
                  ))}
                </Stack>
              ) : bikeNews.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                  Aucune actualité disponible pour le moment
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {bikeNews.map((news, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 1.5,
                        borderRadius: 1,
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: '#F5F5F5',
                          transform: 'translateX(4px)'
                        }
                      }}
                      onClick={() => window.open(news.link, '_blank')}
                    >
                      <Box
                        sx={{
                          minWidth: 120,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: '#673AB7',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textAlign: 'center'
                        }}
                      >
                        {news.source}
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          flex: 1,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {news.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80, textAlign: 'right' }}>
                        {news.category}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
        </ResponsiveContainer>

        {/* Wizard Onboarding */}
        <OnboardingWizard
          open={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            // Recharger la page pour afficher les nouvelles données
            window.location.reload();
          }}
        />
      </Box>
  );
}

// Composant principal exporté avec protection auth
export default function DashboardPage() {
  const router = useRouter();
  const { ready, user } = useAuth();
  
  // PROTECTION: Redirect si pas authentifié
  useEffect(() => {
    if (ready && !user) {
      router.replace('/auth/login');
    }
  }, [ready, user, router]);
  
  // Afficher loader pendant vérification auth
  if (!ready) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <Typography>Vérification authentification...</Typography>
      </Box>
    );
  }
  
  // Ne rien rendre si pas authentifié (redirect en cours)
  if (!user) {
    return null;
  }
  
  // Rendre le contenu du dashboard UNIQUEMENT si authentifié
  return <DashboardContent user={user} />;
}
