"use client";

// ✅ Hooks personnalisés
import { useStatsData } from '@/hooks/useStatsData';
import { useStatsUI } from '@/hooks/useStatsUI';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import PageContainer from "@/components/ResponsiveContainer";
import RequireAuth from "../components/RequireAuth";

import SectionCard from "../components/SectionCard";
import BarChartIcon from "@mui/icons-material/BarChart";
import InsightsIcon from "@mui/icons-material/Insights";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
// ✅ OPTIMISATION: Lazy loading Recharts pour réduire bundle initial
// Note: Recharts utilise des exports nommés, donc on garde l'import direct
// Le lazy loading sera implémenté au niveau du composant parent si nécessaire
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type _Summary = {
  invoices: {
    totalCount: number;
    issuedCount: number;
    paidCount: number;
    totalAmount: number;
    range: { from: string | null; to: string | null; count: number; totalAmount: number; paidAmount: number };
  };
  workOrders: { deliveredInRange: number };
};

export default function StatsPage() {
  // ✅ Hooks personnalisés
  const statsUI = useStatsUI();
  const fromDate = statsUI.fromDate;
  const setFromDate = statsUI.setFromDate;
  const toDate = statsUI.toDate;
  const setToDate = statsUI.setToDate;

  const statsData = useStatsData({ fromDate, toDate });
  const summary = statsData.summary;
  const loading = statsData.isLoading;
  const cashTotal = statsData.cashTotal;
  const yearlyRevenue = statsData.yearlyRevenue;
  const monthlyData = statsData.monthlyData;
  const ticketsByStatus = statsData.ticketsByStatus;
  const kpis = statsData.kpis;

  // Thème bleu pour statistiques
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
          <PageContainer>
            <Stack direction="row" alignItems="center" spacing={2}>
              <BarChartIcon sx={{ fontSize: 40, color: theme.text }} />
              <Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                  📊 Statistiques
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Analyse des performances
                </Typography>
              </Box>
            </Stack>
          </PageContainer>
        </Box>
        <PageContainer>
        {/* Période */}
        <SectionCard title="Période" icon={<InsightsIcon color="primary" />}
          actions={<Button variant="outlined" size="small" onClick={() => statsData.refetchSummary()} disabled={loading}>{loading ? 'Chargement...' : 'Mettre à jour'}</Button>}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField size="small" label="Du" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="Au" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </SectionCard>

        {/* KPI cards - Ligne 1 : Opérationnels */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'info.light', color: 'info.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QueryStatsIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Tickets clôturés (période)</Typography>
                <Typography variant="h6">{kpis.ticketsDelivered != null ? kpis.ticketsDelivered : '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'warning.light', color: 'warning.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReceiptLongIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Factures émises (période)</Typography>
                <Typography variant="h6">{summary?.invoices?.range?.count ?? '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'success.light', color: 'success.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaidIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Factures payées (période)</Typography>
                <Typography variant="h6">{kpis.paidAmount != null ? `${kpis.paidAmount.toFixed(2)} EUR` : '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'secondary.light', color: 'secondary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PointOfSaleIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Caisse Espèces</Typography>
                <Typography variant="h6">{cashTotal.toFixed(2)} EUR</Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>

        {/* KPI cards - Ligne 2 : Chiffres d'affaires */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InsightsIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">CA Période sélectionnée</Typography>
                <Typography variant="h6">{kpis.monthlyRevenue != null ? `${kpis.monthlyRevenue.toFixed(2)} EUR` : '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 3, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'error.light', color: 'error.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InsightsIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">CA Année {new Date().getFullYear()}</Typography>
                <Typography variant="h6">{yearlyRevenue.toFixed(2)} EUR</Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>

        {/* Graphiques */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Graphique CA Mensuel */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>CA Mensuel (12 derniers mois)</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#42A5F5" strokeWidth={2} name="CA (€)" />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Graphique Tickets par Statut */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>Tickets par Statut</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={ticketsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        </PageContainer>
      </Box>
    </RequireAuth>
  );
}
