"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
  TablePagination,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import EuroIcon from "@mui/icons-material/Euro";
import PaidIcon from "@mui/icons-material/Paid";
import DescriptionIcon from "@mui/icons-material/Description";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import { listInvoices, createInvoice, payInvoice, listCustomers, createCustomer, createWorkOrder, type Invoice, type PricingMode, type Customer } from "@/lib/api";
import CreateQuoteDialog from "./components/CreateQuoteDialog";
import QuotesTab from "./components/QuotesTab";
import CreditsTab from "./components/CreditsTab";

export const dynamic = 'force-dynamic';

function FinanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // Filter status accepted by listInvoices (exclude 'part_paid')
  const [status, setStatus] = useState<"" | "draft" | "issued" | "paid" | "cancelled">("");
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<"issueDate" | "number" | "status" | "totalTTC">("issueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<string>("card");
  const [payAt, setPayAt] = useState<string>(() => new Date().toISOString().slice(0,16));
  // Bulk selection
  const [selected, setSelected] = useState<string[]>([]);
  // Direct sale form
  const [directRef, setDirectRef] = useState("direct");
  const [directMode, setDirectMode] = useState<PricingMode>("HT_TVA");
  const [directVat, setDirectVat] = useState<number>(20);
  const [directLabor, setDirectLabor] = useState<number>(60);
  // Customer selection for direct sale
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustOpen, setNewCustOpen] = useState(false);
  const [newCust, setNewCust] = useState<Partial<Customer>>({ firstName: "", lastName: "", email: "", phone: "" });
  // Revenue filters
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  });
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10);
  });
  const [paidInvoices, setPaidInvoices] = useState<Invoice[] | null>(null);
  // Auto-entrepreneur flag (from local storage or future settings)
  const [aeFlag, setAeFlag] = useState<boolean>(false);
  // Document type tabs
  const [documentType, setDocumentType] = useState<"quotes" | "invoices" | "credits">("invoices");
  const [createQuoteDialogOpen, setCreateQuoteDialogOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await listInvoices({ q: query || undefined, status: status || undefined });
      setItems(data);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur de chargement des factures", severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function sendInvoiceEmail(id: string) {
    try {
      const res = await fetch(`/api/finance/invoices/${id}/email`, { method: 'POST' });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'email_failed');
      }
      setToast({ open: true, message: 'Facture envoyée par email', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: envoi email', severity: 'error' });
    }
  }

  function openPay(inv: Invoice) {
    setPayTarget(inv);
    setPayMethod("card");
    setPayAt(new Date().toISOString().slice(0,16));
    setPayOpen(true);
  }

  function openBulkPay() {
    if (selected.length === 0) return;
    setPayTarget(null);
    setPayMethod("card");
    setPayAt(new Date().toISOString().slice(0,16));
    setPayOpen(true);
  }

  async function submitPay() {
    try {
      if (payTarget) {
        await payInvoice(payTarget.id, { paidAt: new Date(payAt).toISOString(), method: payMethod });
      } else if (selected.length > 0) {
        for (const id of selected) {
          await payInvoice(id, { paidAt: new Date(payAt).toISOString(), method: payMethod });
        }
      } else {
        return;
      }
      setPayOpen(false);
      setSelected([]);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: marquage payé', severity: 'error' });
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Appliquer le filtre statut depuis l'URL (ex: /finance?status=issued)
  useEffect(() => {
    try {
      const p = searchParams?.get('status');
      if (!p) return;
      const allowed = new Set(["draft","issued","paid","cancelled"]);
      if (allowed.has(p)) {
        setStatus(p as any);
      }
    } catch {}
  }, [searchParams]);

  // Load AE flag from localStorage (fallback until settings API exists)
  useEffect(() => {
    try {
      const v = localStorage.getItem('shop_ae');
      const isAe = v === '1' || v === 'true';
      setAeFlag(isAe);
      if (isAe) setDirectMode('AE_TTC');
    } catch {}
  }, []);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir("asc"); }
  }

  const processed = useMemo(() => {
    // Filtrer par type de document
    const filtered = items.filter(inv => {
      if (documentType === "quotes") return inv.type === "quote";
      if (documentType === "credits") return inv.type === "credit";
      return inv.type === "invoice" || !inv.type; // Par défaut: factures
    });
    
    const sorted = [...filtered].sort((a, b) => {
      const av = (a as any)[sortBy] ?? "";
      const bv = (b as any)[sortBy] ?? "";
      return av < bv ? (sortDir === "asc" ? -1 : 1) : av > bv ? (sortDir === "asc" ? 1 : -1) : 0;
    });
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sorted.slice(start, end);
  }, [items, sortBy, sortDir, page, rowsPerPage, documentType]);

  const totalTTC = useMemo(() => items.reduce((s, i) => s + (i.totalTTC || 0), 0), [items]);
  const issuedCount = useMemo(() => items.filter(i => i.status === 'issued').length, [items]);
  const paidCount = useMemo(() => items.filter(i => i.status === 'paid').length, [items]);
  const paidTotals = useMemo(() => {
    if (!paidInvoices) return { total: 0, direct: 0, atelier: 0 };
    let total = 0, direct = 0, atelier = 0;
    for (const inv of paidInvoices) {
      const v = inv.totalTTC || 0;
      total += v;
      const isDirect = !inv.workOrderId || inv.workOrderId.toLowerCase().startsWith("direct");
      if (isDirect) direct += v; else atelier += v;
    }
    return { total, direct, atelier };
  }, [paidInvoices]);

  async function calcRevenue() {
    try {
      const fromIso = fromDate ? new Date(fromDate).toISOString() : undefined;
      const toIso = toDate ? new Date(new Date(toDate).setHours(23,59,59,999)).toISOString() : undefined;
      const list = await listInvoices({ status: 'paid', from: fromIso!, to: toIso! });
      setPaidInvoices(list);
    } catch (e) {
      console.error(e);
      setPaidInvoices(null);
      setToast({ open: true, message: 'Erreur: calcul CA', severity: 'error' });
    }
  }

  function exportPaidCsv() {
    if (!paidInvoices || paidInvoices.length === 0) return;
    const headers = [
      'date', 'number', 'workOrderId', 'pricingMode', 'vatRate', 'status', 'totalTTC', 'currency'
    ];
    const rows = paidInvoices.map(inv => [
      inv.issueDate || '',
      inv.number || '',
      inv.workOrderId || '',
      inv.pricingMode,
      String(inv.vatRate),
      inv.status,
      String(inv.totalTTC ?? 0),
      inv.currency
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paid_invoices_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function createDirectInvoice() {
    try {
      const pricingMode: PricingMode = aeFlag ? 'AE_TTC' : directMode;
      const vat = pricingMode === 'AE_TTC' ? 0 : directVat;
      // Always create a local Work Order to link the invoice properly
      const wo = await createWorkOrder({
        customerId: selectedCustomer?.id || undefined,
        bikeId: undefined,
        dueAt: undefined,
      });
      const inv = await createInvoice({ workOrderId: wo.id, pricingMode, currency: "EUR", vatRate: vat, laborRate: directLabor });
      router.push((`/finance/invoices/${inv.id}` as Route));
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: création facture directe", severity: "error" });
    }
  }

  // Load customers (simple: fetch all then filter client-side by query)
  useEffect(() => {
    (async () => {
      try {
        const list = await listCustomers();
        let opts = list;
        const n = customerQuery.trim().toLowerCase();
        if (n) {
          opts = list.filter(c =>
            (c.firstName || '').toLowerCase().includes(n) ||
            (c.lastName || '').toLowerCase().includes(n) ||
            (c.email || '').toLowerCase().includes(n) ||
            (c.phone || '').toLowerCase().includes(n)
          );
        }
        setCustomerOptions(opts.slice(0, 50));
      } catch (e) { console.error(e); }
    })();
  }, [customerQuery]);

  return (
        <PageShell title="Factures" maxWidth="lg">
        <Tabs 
          value={documentType} 
          onChange={(_, val) => setDocumentType(val)}
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="quotes" label="Devis" icon={<DescriptionIcon />} iconPosition="start" />
          <Tab value="invoices" label="Factures" icon={<ReceiptIcon />} iconPosition="start" />
          <Tab value="credits" label="Avoirs" icon={<CreditCardIcon />} iconPosition="start" />
        </Tabs>

        {/* Onglet Devis - Interface simplifiée */}
        {documentType === "quotes" && (
          <QuotesTab
            quotes={items.filter(inv => inv.type === "quote")}
            onRefresh={refresh}
          />
        )}

        {/* Onglet Avoirs - Interface simplifiée */}
        {documentType === "credits" && (
          <CreditsTab
            credits={items.filter(inv => inv.type === "credit")}
            paidInvoices={items.filter(inv => inv.type === "invoice" && inv.status === "paid")}
            onRefresh={refresh}
          />
        )}

        {/* Onglet Factures - Interface complète */}
        {documentType === "invoices" && (
        <>
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2, position: { md: 'sticky' }, top: { md: 64 }, zIndex: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptLongIcon color="primary" />
              <Typography variant="h6" sx={{ mr: 1 }}>Factures</Typography>
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center" sx={{ width: { xs: "100%", md: "auto" } }}>
              <TextField
                size="small"
                placeholder="Rechercher (n°, client, ticket)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ minWidth: 320, width: { xs: '100%', md: 480 } }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />
              <Button variant="outlined" size="small" onClick={refresh} startIcon={<RefreshIcon />} sx={{ minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}>Actualiser</Button>
              <TextField
                size="small"
                select
                label="Statut"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Tous</MenuItem>
                <MenuItem value="draft">Brouillon</MenuItem>
                <MenuItem value="issued">Émise</MenuItem>
                <MenuItem value="paid">Payée</MenuItem>
                <MenuItem value="cancelled">Annulée</MenuItem>
              </TextField>
              <Button variant="contained" size="small" onClick={createDirectInvoice} sx={{ minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}>Nouvelle facture</Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">Total financier TTC (liste): <b>{totalTTC.toFixed(2)} EUR</b></Typography>
            <Box flex={1} />
            <Button size="small" variant="outlined" disabled={selected.length===0} onClick={openBulkPay} sx={{ minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}>Marquer payées ({selected.length})</Button>
          </Stack>
        </Paper>

        {/* KPIs résumé - vraies cartes */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
          <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.light', color: 'primary.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <EuroIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Total TTC (liste courante)</Typography>
                <Typography variant="h6">{totalTTC.toFixed(2)} EUR</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'info.light', color: 'info.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ReceiptLongIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Factures émises</Typography>
                <Typography variant="h6">{issuedCount}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'success.light', color: 'success.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaidIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Factures payées</Typography>
                <Typography variant="h6">{paidCount}</Typography>
              </Box>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'success.light', color: 'success.contrastText', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaidIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Montant payé (période)</Typography>
                <Typography variant="h6">{paidInvoices ? `${(paidTotals.total).toFixed(2)} EUR` : '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>

        {/* CA payé (période) */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <TrendingUpIcon color="primary" />
            <Typography variant="h6">Chiffre d&apos;affaires (payé)</Typography>
          </Stack>
          {/* Ligne 1: période */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 1 }}>
            <TextField size="small" label="Du" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="Au" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
          {/* Ligne 2: actions */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Button size="small" variant="outlined" onClick={calcRevenue}>Calculer</Button>
            <Box flex={1} />
            <Button size="small" onClick={exportPaidCsv} disabled={!paidInvoices || paidInvoices.length===0}>Exporter CSV</Button>
          </Stack>
          {paidInvoices && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <Chip label={`Total: ${paidTotals.total.toFixed(2)} EUR`} color="primary" />
              <Chip label={`Atelier: ${paidTotals.atelier.toFixed(2)} EUR`} />
              <Chip label={`Vente directe: ${paidTotals.direct.toFixed(2)} EUR`} />
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Basé sur factures payées</Typography>
            </Stack>
          )}
        </Paper>

        {/* Ventes directes (création facture sans ticket) */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <PointOfSaleIcon color="primary" />
            <Typography variant="h6">Vente directe</Typography>
          </Stack>
          {/* Ligne 1: client + nouveau + référence */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 1, flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
            <Autocomplete
              size="small"
              options={customerOptions}
              value={selectedCustomer}
              getOptionLabel={(c) => `${c.firstName || ''} ${c.lastName || ''} ${c.email ? `· ${c.email}` : ''}`.trim() || c.id}
              onChange={(_, v) => setSelectedCustomer(v)}
              onInputChange={(_, v) => setCustomerQuery(v)}
              filterOptions={(x) => x}
              sx={{ minWidth: 360, width: { xs: '100%', md: 420 } }}
              renderInput={(params) => <TextField {...params} label="Client (optionnel)" />}
            />
            <Button size="small" variant="outlined" onClick={() => setNewCustOpen(true)} sx={{ minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}>Nouveau client</Button>
            <TextField size="small" label="Référence" value={directRef} onChange={(e) => setDirectRef(e.target.value)} sx={{ minWidth: 200, width: { xs: '100%', md: 240 } }} />
          </Stack>
          {/* Ligne 2: mode + TVA + taux MO + créer */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
            <TextField size="small" select label="Mode" value={directMode} onChange={(e) => setDirectMode(e.target.value as PricingMode)} sx={{ minWidth: 160 }}>
              <MenuItem value="HT_TVA">HT + TVA</MenuItem>
              <MenuItem value="AE_TTC">AE (TTC)</MenuItem>
            </TextField>
            {directMode === 'HT_TVA' && (
              <TextField size="small" label="TVA (%)" type="number" value={directVat} onChange={(e) => setDirectVat(Number(e.target.value))} sx={{ width: 120 }} />
            )}
            <TextField size="small" label="Taux MO (€/h)" type="number" value={directLabor} onChange={(e) => setDirectLabor(Number(e.target.value))} sx={{ width: 150 }} />
            <Button variant="contained" size="small" onClick={createDirectInvoice} sx={{ minWidth: 0, px: 1.5, whiteSpace: 'nowrap' }}>Créer facture directe</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Astuce: une fois créée, ajoute les pièces/équipements/vélos depuis l&apos;écran de facture.
          </Typography>
        </Paper>

        <Paper elevation={1} sx={{ borderRadius: 2 }}>
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length>0 && selected.length<processed.length}
                      checked={processed.length>0 && selected.length===processed.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelected(processed.map(p=>p.id)); else setSelected([]);
                      }}
                    />
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'issueDate' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'issueDate'} direction={sortBy === 'issueDate' ? sortDir : 'asc'} onClick={() => toggleSort('issueDate')}>Date</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'number' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'number'} direction={sortBy === 'number' ? sortDir : 'asc'} onClick={() => toggleSort('number')}>N°</TableSortLabel>
                  </TableCell>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>TVA</TableCell>
                  <TableCell sortDirection={sortBy === 'status' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => toggleSort('status')}>Statut</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'totalTTC' ? sortDir : false as any} align="right">
                    <TableSortLabel active={sortBy === 'totalTTC'} direction={sortBy === 'totalTTC' ? sortDir : 'asc'} onClick={() => toggleSort('totalTTC')}>Total TTC</TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell padding="checkbox"><Skeleton width={24} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={160} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={60} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell align="right"><Skeleton width={80} /></TableCell>
                    <TableCell align="right"><Skeleton width={60} /></TableCell>
                  </TableRow>
                ))}
                {!loading && processed.map((inv) => (
                  <TableRow key={inv.id} hover selected={selected.includes(inv.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selected.includes(inv.id)}
                        onChange={(e) => {
                          setSelected((prev) => e.target.checked ? Array.from(new Set([...prev, inv.id])) : prev.filter(id => id!==inv.id));
                        }}
                      />
                    </TableCell>
                    <TableCell suppressHydrationWarning>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{inv.number || '-'}</TableCell>
                    <TableCell><Link href={`/tickets/${inv.workOrderId}`}>{inv.workOrderId}</Link></TableCell>
                    <TableCell>{inv.customerName || '-'}</TableCell>
                    <TableCell>{inv.pricingMode === 'AE_TTC' ? 'AE (TTC)' : 'HT + TVA'}</TableCell>
                    <TableCell>{inv.vatRate}%</TableCell>
                    <TableCell>
                      <Chip size="small" label={inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'issued' ? 'info' : inv.status === 'cancelled' ? 'default' : 'warning'} />
                    </TableCell>
                    <TableCell align="right">{inv.totalTTC.toFixed(2)} {inv.currency}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {inv.status !== 'paid' && (
                          <Button size="small" variant="outlined" onClick={() => openPay(inv)} sx={{ minWidth: 0, px: 1, whiteSpace: 'nowrap' }}>Payée</Button>
                        )}
                        <Button size="small" component="a" href={`/api/finance/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer" sx={{ minWidth: 0, px: 1, whiteSpace: 'nowrap' }}>PDF</Button>
                        <Button size="small" onClick={() => sendInvoiceEmail(inv.id)} sx={{ minWidth: 0, px: 1, whiteSpace: 'nowrap' }}>Envoyer</Button>
                        <Tooltip title="Ouvrir">
                          <Link href={{ pathname: `/finance/invoices/${inv.id}` } as unknown as Route}>
                            <IconButton>
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Link>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Box py={3} textAlign="center" color="text.secondary">
                        <Typography>Aucune facture</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={items.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Paper>

        <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>

        <Dialog open={payOpen} onClose={() => setPayOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Marquer comme payée</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="pay-method" size="small" select label="Méthode" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                <MenuItem value="card">Carte</MenuItem>
                <MenuItem value="cash">Espèces</MenuItem>
                <MenuItem value="bank">Virement</MenuItem>
                <MenuItem value="check">Chèque</MenuItem>
                <MenuItem value="other">Autre</MenuItem>
              </TextField>
              <TextField id="pay-at" size="small" type="datetime-local" label="Date paiement" value={payAt} onChange={(e) => setPayAt(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPayOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={submitPay}>Valider</Button>
          </DialogActions>
        </Dialog>

        {/* Nouveau client */}
        <Dialog open={newCustOpen} onClose={() => setNewCustOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField id="cust-first" size="small" label="Prénom" value={newCust.firstName || ''} onChange={(e) => setNewCust((c) => ({ ...(c as any), firstName: e.target.value }))} />
              <TextField id="cust-last" size="small" label="Nom" value={newCust.lastName || ''} onChange={(e) => setNewCust((c) => ({ ...(c as any), lastName: e.target.value }))} />
              <TextField id="cust-email" size="small" label="Email" type="email" value={newCust.email || ''} onChange={(e) => setNewCust((c) => ({ ...(c as any), email: e.target.value }))} />
              <TextField id="cust-phone" size="small" label="Téléphone" value={newCust.phone || ''} onChange={(e) => setNewCust((c) => ({ ...(c as any), phone: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewCustOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={async () => {
              try {
                const created = await createCustomer({
                  email: (newCust.email || undefined) as any,
                  firstName: (newCust.firstName || undefined) as any,
                  lastName: (newCust.lastName || undefined) as any,
                  phone: (newCust.phone || undefined) as any,
                });
                setSelectedCustomer(created as any);
                setNewCustOpen(false);
              } catch (e) { console.error(e); setToast({ open: true, message: 'Erreur: création client', severity: 'error' }); }
            }}>Créer</Button>
          </DialogActions>
        </Dialog>

        <CreateQuoteDialog
          open={createQuoteDialogOpen}
          onClose={() => setCreateQuoteDialogOpen(false)}
          onSuccess={(quoteId) => {
            setCreateQuoteDialogOpen(false);
            refresh();
          }}
        />
        </>
        )}
        </PageShell>
  );
}

export default function FinancePage() {
  return (
    <RequireAuth>
      <Suspense fallback={<div style={{ padding: 16 }}>Chargement…</div>}>
        <FinanceContent />
      </Suspense>
    </RequireAuth>
  );
}
