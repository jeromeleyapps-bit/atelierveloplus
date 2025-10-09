"use client";

import { Typography, Paper, Stack, Box, TextField, Button } from "@mui/material";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import InsightsIcon from "@mui/icons-material/Insights";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { useEffect, useMemo, useState } from "react";
import { getStatsSummary, listCashRegisterEntries } from "@/lib/api";

type Summary = {
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
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0,10);
  });
  const [loading, setLoading] = useState(false);
  const [sum, setSum] = useState<Summary | null>(null);
  const [cashTotal, setCashTotal] = useState<number>(0);
  const [yearlyRevenue, setYearlyRevenue] = useState<number>(0);

  async function load() {
    setLoading(true);
    try {
      const fromIso = fromDate ? new Date(fromDate).toISOString() : undefined;
      const toIso = toDate ? new Date(new Date(toDate).setHours(23,59,59,999)).toISOString() : undefined;
      
      const data = await getStatsSummary({
        from: fromIso,
        to: toIso
      });
      setSum(data as Summary);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    load(); 
    loadCashTotal();
    loadYearlyRevenue();
  }, []);

  async function loadCashTotal() {
    try {
      const data = await listCashRegisterEntries();
      const total = data.reduce((sum: number, entry: any) => sum + entry.amount, 0);
      setCashTotal(total);
    } catch (e) {
      console.error('Failed to load cash total', e);
    }
  }

  async function loadYearlyRevenue() {
    try {
      const year = new Date().getFullYear();
      const fromIso = new Date(year, 0, 1).toISOString();
      const toIso = new Date(year, 11, 31, 23, 59, 59).toISOString();
      
      const data = await getStatsSummary({
        from: fromIso,
        to: toIso
      });
      setYearlyRevenue(data.invoices?.range?.totalAmount ?? 0);
    } catch (e) {
      console.error('Failed to load yearly revenue', e);
    }
  }

  const kpis = useMemo(() => ({
    monthlyRevenue: sum?.invoices.range.totalAmount ?? null,
    ticketsDelivered: sum?.workOrders.deliveredInRange ?? null,
    paidAmount: sum?.invoices.range.paidAmount ?? null,
  }), [sum]);

  return (
    <RequireAuth>
      <PageShell title="Statistiques">
        {/* Période */}
        <SectionCard title="Période" icon={<InsightsIcon color="primary" />}
          actions={<Button variant="outlined" size="small" onClick={load} disabled={loading}>{loading ? 'Chargement...' : 'Mettre à jour'}</Button>}
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
                <Typography variant="h6">{sum?.invoices.range.count ?? '—'}</Typography>
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

        <SectionCard title="Vue d'ensemble" icon={<InsightsIcon color="primary" />}>
          <Typography>
            Cette page affichera les statistiques de votre atelier.
          </Typography>
        </SectionCard>
      </PageShell>
    </RequireAuth>
  );
}
