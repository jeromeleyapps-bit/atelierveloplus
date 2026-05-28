"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTableState } from '@/hooks/useTableState';
import type { Route } from "next";
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import TablePagination from '@mui/material/TablePagination';
import Skeleton from '@mui/material/Skeleton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Checkbox from '@mui/material/Checkbox';

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { formatTicketNumber } from "@/lib/ticket-number";
import EuroIcon from "@mui/icons-material/Euro";
import PaidIcon from "@mui/icons-material/Paid";
import DescriptionIcon from "@mui/icons-material/Description";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ReceiptIcon from "@mui/icons-material/Receipt";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";

import ResponsiveContainer from "@/components/ResponsiveContainer";
import { listInvoices, payInvoice, deleteInvoice, type Invoice } from "@/lib/api";
import CreateQuoteDialog from "./components/CreateQuoteDialog";
import CreateInvoiceDialog from "./components/CreateInvoiceDialog";
import QuotesTab from "./components/QuotesTab";
import CreditsTab from "./components/CreditsTab";
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function FinanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  // Filtres
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "draft" | "issued" | "paid" | "cancelled">("");
  const tabParam = searchParams.get('tab') as "quotes" | "invoices" | "credits" | null;
  const [documentType, setDocumentType] = useState<"quotes" | "invoices" | "credits">(tabParam || "invoices");
  
  // TanStack Query pour les données
  const { data: items = [], isLoading: loading, refetch: refresh } = useQuery({
    queryKey: ['finance', status, query],
    queryFn: () => listInvoices({ 
      q: query || undefined, 
      status: status || undefined 
    }),
  });
  
  // Table state avec hook personnalisé
  const tableState = useTableState<"issueDate" | "number" | "status" | "totalTTC">('finance', 'issueDate');
  const { page, setPage, rowsPerPage, setRowsPerPage, sortBy, setSortBy: _setSortBy, sortDir, setSortDir: _setSortDir, selected, setSelected } = tableState;
  
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" }>({ open: false, message: "", severity: "success" });
  // Pay dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [payMethod, setPayMethod] = useState<string>("card");
  const [payAt, setPayAt] = useState<string>(() => new Date().toISOString().slice(0,16));
  // selected vient de tableState
  // Removed: Direct sale form (now in CreateInvoiceDialog)
  // Removed: Customer selection for direct sale (now in CreateInvoiceDialog)
  // Revenue filters
  const [fromDate, _setFromDate ] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10);
  });
  const [toDate, _setToDate ] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10);
  });
  const [paidInvoices, setPaidInvoices] = useState<Invoice[] | null>(null);
  // Auto-entrepreneur flag (from local storage or future settings)
  const [_aeFlag, setAeFlag] = useState<boolean>(false);
  // documentType déjà initialisé ci-dessus
  const [createQuoteDialogOpen, setCreateQuoteDialogOpen] = useState(false);
  const [createInvoiceDialogOpen, setCreateInvoiceDialogOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CB");
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // refresh disponible via useQuery (refetch)

  async function sendInvoiceEmail(id: string) {
    try {
      const res = await fetch(`/api/finance/invoices/${id}/send-email`, { method: 'POST' });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'email_failed');
      }
      setToast({ open: true, message: 'Facture envoyée par email', severity: 'success' });
    } catch (e) {
      logger.error(e);
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
      // ✅ Invalider TOUS les caches liés aux factures (page + dashboard)
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardRevenue'] });
      await refresh();
    } catch (e) {
      logger.error(e);
      setToast({ open: true, message: 'Erreur: marquage payé', severity: 'error' });
    }
  }

  // useEffect supprimé - useQuery charge automatiquement au mount

  // Appliquer le filtre statut depuis l'URL (ex: /finance?status=issued)
  useEffect(() => {
    try {
      const p = searchParams?.get('status');
      if (!p) return;
      const allowed = new Set(["draft","issued","paid","cancelled"]);
      if (allowed.has(p)) {
        setStatus(p as "" | "draft" | "issued" | "paid" | "cancelled");
      }
    } catch {}
  }, [searchParams]);

  // Load AE flag from localStorage (fallback until settings API exists)
  useEffect(() => {
    try {
      const v = localStorage.getItem('shop_ae');
      const isAe = v === '1' || v === 'true';
      setAeFlag(isAe);
    } catch {}
  }, []);

  // toggleSort déplacé vers tableState.toggleSort

  const processed = useMemo(() => {
    // Filtrer par type de document
    const filtered = items.filter(inv => {
      if (documentType === "quotes") return inv.type === "quote";
      if (documentType === "credits") return inv.type === "credit";
      return inv.type === "invoice" || !inv.type; // Par défaut: factures
    });
    
    const sorted = [...filtered].sort((a, b) => {
      const av = (a as unknown)[sortBy] ?? "";
      const bv = (b as unknown)[sortBy] ?? "";
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

  async function _calcRevenue() {
    try {
      const fromIso = fromDate ? new Date(fromDate).toISOString() : undefined;
      const toIso = toDate ? new Date(new Date(toDate).setHours(23,59,59,999)).toISOString() : undefined;
      const list = await listInvoices({ status: 'paid', from: fromIso!, to: toIso! });
      setPaidInvoices(list);
    } catch (e) {
      logger.error(e);
      setPaidInvoices(null);
      setToast({ open: true, message: 'Erreur: calcul CA', severity: 'error' });
    }
  }

  function _exportPaidCsv() {
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

  // Removed: createDirectInvoice and customer loading (now in CreateInvoiceDialog)

  // Couleurs thématiques harmonisées
  const tabColors = {
    quotes: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
    invoices: { bg: '#d1fae5', border: '#10b981', text: '#047857' },
    credits: { bg: '#cffafe', border: '#06b6d4', text: '#0e7490' },
  };
  const currentTheme = tabColors[documentType];

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne avec Tabs */}
        <Box
          sx={{
            bgcolor: currentTheme.bg,
            borderBottom: 2,
            borderColor: currentTheme.border,
            py: 2,
          }}
        >
          <ResponsiveContainer>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EuroIcon sx={{ fontSize: 40, color: currentTheme.text }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: currentTheme.text }}>
                    💰 Facturation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion des devis, factures et avoirs
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  onClick={() => refresh()} 
                  startIcon={<RefreshIcon />}
                  sx={{
                    borderColor: currentTheme.border,
                    color: currentTheme.text,
                    '&:hover': {
                      borderColor: currentTheme.border,
                      bgcolor: currentTheme.bg,
                    },
                  }}
                >
                  Actualiser
                </Button>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={() => setCreateInvoiceDialogOpen(true)}
                  sx={{
                    bgcolor: currentTheme.border,
                    color: 'white',
                    '&:hover': { bgcolor: currentTheme.text },
                  }}
                >
                  Nouvelle facture
                </Button>
              </Stack>
            </Stack>
            
            {/* Tabs Colorés */}
            <Tabs 
              value={documentType} 
              onChange={(_, val) => setDocumentType(val)}
              sx={{ 
                '& .MuiTab-root': {
                  fontWeight: 600,
                  fontSize: '1rem',
                },
                '& .Mui-selected': {
                  color: `${currentTheme.text} !important`,
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: currentTheme.border,
                  height: 3,
                },
              }}
            >
              <Tab 
                value="quotes" 
                label={`Devis (${items.filter(r => r.type === 'quote').length})`}
                icon={<DescriptionIcon />} 
                iconPosition="start"
                sx={{ color: tabColors.quotes.text }}
              />
              <Tab 
                value="invoices" 
                label={`Factures (${items.filter(r => r.type === 'invoice' || !r.type).length})`}
                icon={<ReceiptIcon />} 
                iconPosition="start"
                sx={{ color: tabColors.invoices.text }}
              />
              <Tab 
                value="credits" 
                label={`Avoirs (${items.filter(r => r.type === 'credit').length})`}
                icon={<CreditCardIcon />} 
                iconPosition="start"
                sx={{ color: tabColors.credits.text }}
              />
            </Tabs>
          </ResponsiveContainer>
        </Box>

        <ResponsiveContainer sx={{ py: 3 }}>

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
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <TextField
              size="small"
              placeholder="Rechercher (n°, client, ticket)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              sx={{ minWidth: 320, flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />
            <TextField
              size="small"
              select
              label="Statut"
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | "draft" | "issued" | "paid" | "cancelled")}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="draft">Brouillon</MenuItem>
              <MenuItem value="issued">Émise</MenuItem>
              <MenuItem value="paid">Payée</MenuItem>
              <MenuItem value="cancelled">Annulée</MenuItem>
            </TextField>
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

        {/* Widget d'actions groupées */}
        {selected.length > 0 && (
          <Paper elevation={2} sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'action.hover', border: '2px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 2 }}>
                {selected.length} facture{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
              </Typography>
              <Button 
                size="small" 
                variant="contained" 
                startIcon={<OpenInNewIcon />}
                onClick={() => {
                  if (selected.length !== 1) {
                    setToast({ open: true, message: 'Sélectionnez une seule facture', severity: 'warning' });
                    return;
                  }
                  router.push(`/finance/invoices/${selected[0]}` as Route);
                }}
              >
                Modifier
              </Button>
              <Button 
                size="small" 
                variant="contained"
                sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                onClick={async () => {
                  const token = localStorage.getItem('jwt_token');
                  let successCount = 0;
                  for (const id of selected) {
                    try {
                      const res = await fetch(`/api/finance/invoices/${id}/issue`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                      });
                      if (res.ok) successCount++;
                    } catch (e) {
                      logger.error('Issue error:', e);
                    }
                  }
                  if (successCount > 0) {
                    setToast({ open: true, message: `${successCount} document(s) émis`, severity: 'success' });
                    refresh();
                  } else {
                    setToast({ open: true, message: 'Erreur lors de l\'émission', severity: 'error' });
                  }
                }}
              >
                Émettre
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                startIcon={<PaidIcon />}
                onClick={openBulkPay}
              >
                Marquer payée{selected.length > 1 ? 's' : ''}
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  if (selected.length !== 1) {
                    setToast({ open: true, message: 'Sélectionnez une seule facture', severity: 'warning' });
                    return;
                  }
                  setAddPaymentOpen(true);
                }}
              >
                Ajouter paiement
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={async () => {
                  if (selected.length !== 1) {
                    setToast({ open: true, message: 'Sélectionnez une seule facture', severity: 'warning' });
                    return;
                  }
                  
                  if (!confirm("Créer un avoir pour cette facture ?")) return;
                  
                  try {
                    const res = await fetch(`/api/finance/invoices/${selected[0]}/credit`, {
                      method: "POST",
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data?.error || "Erreur création avoir");
                    
                    setToast({ open: true, message: 'Avoir créé avec succès !', severity: 'success' });
                    router.push(`/finance/invoices/${data.id}` as Route);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Erreur inconnue';
                    setToast({ open: true, message: `Erreur: ${message}`, severity: 'error' });
                  }
                }}
              >
                Créer avoir
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={async () => {
                  for (const id of selected) {
                    try {
                      await fetch(`/api/finance/invoices/${id}/send-email`, { method: 'POST' });
                    } catch (e) {
                      logger.error('Email error:', e);
                    }
                  }
                  setToast({ open: true, message: `${selected.length} email(s) envoyé(s)`, severity: 'success' });
                }}
              >
                Envoyer par email
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => {
                  selected.forEach(id => {
                    window.open(`/api/finance/invoices/${id}/pdf`, '_blank');
                  });
                }}
              >
                Exporter PDF
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                color="error"
                onClick={async () => {
                  if (!confirm(`Supprimer définitivement ${selected.length} facture(s) ? Cette action est irréversible.`)) return;
                  let successCount = 0;
                  for (const id of selected) {
                    try {
                      await deleteInvoice(id);
                      successCount++;
                    } catch (e) {
                      logger.error('Delete error:', e);
                    }
                  }
                  setSelected([]);
                  // ✅ Invalider TOUS les caches liés aux factures
                  await queryClient.invalidateQueries({ queryKey: ['finance'] });
                  await queryClient.invalidateQueries({ queryKey: ['dashboardRevenue'] });
                  await refresh();
                  setToast({ open: true, message: `${successCount} facture(s) supprimée(s)`, severity: 'success' });
                }}
              >
                Supprimer
              </Button>
              <Box flex={1} />
              <Button 
                size="small" 
                onClick={() => setSelected([])}
              >
                Annuler sélection
              </Button>
            </Stack>
          </Paper>
        )}

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
                  <TableCell sortDirection={sortBy === 'issueDate' ? sortDir : false}>
                    <TableSortLabel active={sortBy === 'issueDate'} direction={sortBy === 'issueDate' ? sortDir : 'asc'} onClick={() => tableState.toggleSort('issueDate')}>Date</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'number' ? sortDir : false}>
                    <TableSortLabel active={sortBy === 'number'} direction={sortBy === 'number' ? sortDir : 'asc'} onClick={() => tableState.toggleSort('number')}>N°</TableSortLabel>
                  </TableCell>
                  <TableCell>Ticket</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>TVA</TableCell>
                  <TableCell sortDirection={sortBy === 'status' ? sortDir : false}>
                    <TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => tableState.toggleSort('status')}>Statut</TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={sortBy === 'totalTTC' ? sortDir : false} align="right">
                    <TableSortLabel active={sortBy === 'totalTTC'} direction={sortBy === 'totalTTC' ? sortDir : 'asc'} onClick={() => tableState.toggleSort('totalTTC')}>Total TTC</TableSortLabel>
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
                          if (e.target.checked) {
                            setSelected(Array.from(new Set([...selected, inv.id])));
                          } else {
                            setSelected(selected.filter(id => id !== inv.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell suppressHydrationWarning>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{inv.number || '-'}</TableCell>
                    <TableCell>
                      {inv.workOrderId ? (
                        <Link href={`/tickets/${inv.workOrderId}`}>
                          {formatTicketNumber(inv.workOrderId, inv.issueDate || new Date())}
                        </Link>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{inv.customerName || '-'}</TableCell>
                    <TableCell>{inv.pricingMode === 'AE_TTC' ? 'AE (TTC)' : 'HT + TVA'}</TableCell>
                    <TableCell>{inv.vatRate}%</TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={
                          inv.status === 'draft' ? 'Brouillon' :
                          inv.status === 'issued' ? 'Émise' :
                          inv.status === 'paid' ? 'Payée' :
                          inv.status === 'cancelled' ? 'Annulée' :
                          inv.status
                        } 
                        color={inv.status === 'paid' ? 'success' : inv.status === 'issued' ? 'info' : inv.status === 'cancelled' ? 'default' : 'warning'} 
                      />
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

        {/* Dialog Ajouter paiement */}
        <Dialog open={addPaymentOpen} onClose={() => setAddPaymentOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Ajouter un paiement</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Montant"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                fullWidth
              />
              <TextField
                select
                label="Méthode"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                fullWidth
              >
                <MenuItem value="CB">Carte bancaire</MenuItem>
                <MenuItem value="especes">Espèces</MenuItem>
                <MenuItem value="cheque">Chèque</MenuItem>
                <MenuItem value="virement">Virement</MenuItem>
              </TextField>
              <TextField
                label="Date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddPaymentOpen(false)}>Annuler</Button>
            <Button
              variant="contained"
              onClick={async () => {
                if (selected.length !== 1) return;
                try {
                  await fetch(`/api/finance/invoices/${selected[0]}/payments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      amount: paymentAmount,
                      method: paymentMethod,
                      paidAt: paymentDate,
                    }),
                  });
                  setAddPaymentOpen(false);
                  setToast({ open: true, message: 'Paiement ajouté', severity: 'success' });
                  await refresh();
                } catch (_e) {
                  setToast({ open: true, message: 'Erreur ajout paiement', severity: 'error' });
                }
              }}
            >
              Ajouter
            </Button>
          </DialogActions>
        </Dialog>

        <CreateInvoiceDialog
          open={createInvoiceDialogOpen}
          onClose={() => setCreateInvoiceDialogOpen(false)}
          onSuccess={(invoiceId) => {
            setCreateInvoiceDialogOpen(false);
            router.push(`/finance/invoices/${invoiceId}` as Route);
          }}
        />
        </>
        )}

        <CreateQuoteDialog
          open={createQuoteDialogOpen}
          onClose={() => setCreateQuoteDialogOpen(false)}
          onSuccess={(_quoteId) => {
            setCreateQuoteDialogOpen(false);
            refresh();
          }}
        />
        </ResponsiveContainer>
      </Box>
    </RequireAuth>
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
