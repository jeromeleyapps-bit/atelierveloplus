"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// ✅ Hooks personnalisés pour une meilleure organisation
import { useTicketsData } from '@/hooks/useTicketsData';
import { useTicketsUI } from '@/hooks/useTicketsUI';
import { useTicketsMutations } from '@/hooks/useTicketsMutations';
import { useTableState } from '@/hooks/useTableState';
import { useRepairTimer } from '@/contexts/RepairTimerContext';
import { formatTicketNumber } from '@/lib/ticket-number';
import {
  createWorkOrder,
  setWorkOrderType,
  listCustomerBikes,
  createCustomerBike,
  mergeWorkOrders,
  type WorkOrder,
  type WorkOrderType,
  type CustomerBike,
} from "@/lib/api";
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';

import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableContainer from '@mui/material/TableContainer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Tooltip from '@mui/material/Tooltip';
import TablePagination from '@mui/material/TablePagination';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from "@mui/material/styles";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { usePageTheme } from "@/hooks/usePageTheme";
import Container from "@mui/material/Container";
import RefreshIcon from "@mui/icons-material/Refresh";
import { logger } from '@/lib/logger';

export default function TicketsPage() {
  const router = useRouter();
  const muiTheme = useTheme();
  const isSmall = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const theme = usePageTheme('ticket'); // Thème bleu pour tickets
  
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [customerBikes, setCustomerBikes] = useState<CustomerBike[]>([]);
  const [ticketType, setTicketType] = useState<WorkOrderType | "">("");
  // Add bike dialog state
  const [addBikeOpen, setAddBikeOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [nbBrand, setNbBrand] = useState("");
  const [nbModel, setNbModel] = useState("");
  const [nbSN, setNbSN] = useState("");
  const [nbColor, setNbColor] = useState("");
  const [nbNotes, setNbNotes] = useState("");
  const [addingBike, setAddingBike] = useState(false);

  // ✅ Hooks personnalisés
  const ticketsUI = useTicketsUI();
  const denseMode = ticketsUI.dense;
  const setDenseMode = ticketsUI.setDense;
  const columnsConfig = ticketsUI.columns;
  const setColumnsConfig = ticketsUI.setColumns;
  const colMenuAnchor = ticketsUI.colAnchor;
  const setColMenuAnchor = ticketsUI.setColAnchor;
  const toastState = ticketsUI.toast;
  const showToastMessage = ticketsUI.showToast;
  
  const ticketsTableState = useTableState<"id" | "customer" | "name" | "email" | "bike" | "status" | "hubspot">('tickets', 'id');
  const tablePage = ticketsTableState.page;
  const setTablePage = ticketsTableState.setPage;
  const tableRowsPerPage = ticketsTableState.rowsPerPage;
  const setTableRowsPerPage = ticketsTableState.setRowsPerPage;
  const tableSortBy = ticketsTableState.sortBy;
  const tableSortDir = ticketsTableState.sortDir;
  const tableSelected = ticketsTableState.selected;
  const setTableSelected = ticketsTableState.setSelected;
  const tableToggleSort = ticketsTableState.toggleSort;
  
  const ticketsData = useTicketsData();
  const items = ticketsData.items;
  const loading = ticketsData.isLoading;
  const customers = ticketsData.customers;
  const loadingCustomers = ticketsData.isLoadingCustomers;
  const statusFilter = ticketsData.statusFilter;
  const setStatusFilter = ticketsData.setStatusFilter;
  const query = ticketsData.query;
  const setQuery = ticketsData.setQuery;
  const onlyReadyToday = ticketsData.onlyReadyToday;
  const setOnlyReadyToday = ticketsData.setOnlyReadyToday;
  const onlyReadyWeek = ticketsData.onlyReadyWeek;
  const setOnlyReadyWeek = ticketsData.setOnlyReadyWeek;
  const refresh = ticketsData.refetch;
  
  const { startRepair } = useRepairTimer();
  
  const ticketsMutations = useTicketsMutations({
    onSuccess: showToastMessage,
    onError: showToastMessage,
    onStartSuccess: (ticketId: string) => {
      // Démarrer le chronomètre
      startRepair(ticketId);
    },
  });

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [goPage, setGoPage] = useState<string>("");
  const handleChangePage = (_: unknown, newPage: number) => {
    setTablePage(newPage);
    // Auto-scroll the table container to top on tablePage change
    if (tableRef.current) {
      try {
        tableRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        tableRef.current.scrollTop = 0;
      }
    }
  };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTableRowsPerPage(parseInt(e.target.value, 10));
    setTablePage(0);
  };

  // Traduction des statuts en français
  function statusLabel(status: string): string {
    switch (status) {
      case "created": return "Créé";
      case "in_progress": return "En cours";
      case "ready": return "Prêt";
      case "completed": return "Terminé";
      case "delivered": return "Livré";
      case "cancelled": return "Annulé";
      default: return status;
    }
  }

  function statusColor(
    status: string,
  ): "default" | "success" | "warning" | "info" | "error" {
    switch (status) {
      case "created":
        return "info";
      case "in_progress":
        return "warning";
      case "ready":
        return "success";
      case "delivered":
        return "default";
      default:
        return "default";
    }
  }

  function statusSx(status: string) {
    switch (status) {
      case "created":
        return { bgcolor: 'info.light', color: 'info.contrastText', fontWeight: 600 } as const;
      case "in_progress":
        return { bgcolor: 'warning.light', color: 'warning.contrastText', fontWeight: 600 } as const;
      case "ready":
        return { bgcolor: 'success.light', color: 'success.contrastText', fontWeight: 700 } as const;
      case "delivered":
        return { bgcolor: 'grey.300', color: 'text.primary', fontWeight: 600 } as const;
      default:
        return {} as const;
    }
  }

  // Load bikes when customer selected
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!customerId) { setCustomerBikes([]); setBikeId(""); return; }
      try {
        const bikes = await listCustomerBikes(customerId);
        if (!alive) return;
        setCustomerBikes(bikes);
      } catch (e) {
        logger.warn('failed to load customer bikes', e);
        if (alive) setCustomerBikes([]);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  type WorkOrderExt = WorkOrder & {
    inProgressAt?: string | null;
    readyAt?: string | null;
    customer?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  };

  const baseList = useMemo(() => {
    const todayOk = (d?: string | null) => {
      if (!d) return false;
      const dt = new Date(d);
      const now = new Date();
      return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate();
    };
    const weekOk = (d?: string | null) => {
      if (!d) return false;
      const dt = new Date(d);
      const now = new Date();
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7; // 0=Mon ... 6=Sun
      const monday = new Date(now);
      monday.setHours(0,0,0,0);
      monday.setDate(now.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      return dt >= monday && dt <= sunday;
    };
    let list = items as WorkOrderExt[];
    if (onlyReadyToday) list = list.filter((w) => todayOk(w.readyAt ?? null));
    if (onlyReadyWeek) list = list.filter((w) => weekOk(w.readyAt ?? null));
    return list;
  }, [items, onlyReadyToday, onlyReadyWeek]);

  const processedItems = useMemo(() => {
    const list = baseList;

    const getValue = (w: WorkOrderExt) => {
      switch (tableSortBy) {
        case 'id': return w.id;
        case 'customer': return w.customerId;
        case 'name': return ([w.customer?.firstName, w.customer?.lastName].filter(Boolean).join(' ') || '');
        case 'email': return w.customer?.email || '';
        case 'bike': return w.bikeId || '';
        case 'status': return w.status;
        case 'hubspot': return w.hubspotFallbackAt || '';
        default: return '';
      }
    };

    const sorted = [...list].sort((a,b) => {
      const av = getValue(a) ?? '';
      const bv = getValue(b) ?? '';
      if (av < bv) return tableSortDir === 'asc' ? -1 : 1;
      if (av > bv) return tableSortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const start = tablePage * tableRowsPerPage;
    const end = start + tableRowsPerPage;
    return sorted.slice(start, end);
  }, [baseList, tableSortBy, tableSortDir, tablePage, tableRowsPerPage]);

  const filteredCount = useMemo(() => baseList.length, [baseList]);

  // Clamp tablePage if out of range when filters change
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredCount / tableRowsPerPage) - 1);
    if (tablePage > maxPage) setTablePage(0);
  }, [filteredCount, tableRowsPerPage, tablePage, setTablePage]);

  // Reset to first tablePage on filter changes
  useEffect(() => {
    setTablePage(0);
  }, [statusFilter, query, onlyReadyToday, onlyReadyWeek, tableRowsPerPage, setTablePage]);

  function goToPage() {
    const n = parseInt(goPage, 10);
    if (Number.isNaN(n)) return;
    const maxPage = Math.max(1, Math.ceil(filteredCount / tableRowsPerPage));
    const target = Math.min(maxPage, Math.max(1, n));
    handleChangePage(null, target - 1);
  }

  const visibleColSpan = useMemo(() => Object.values(columnsConfig).filter(Boolean).length, [columnsConfig]);

  function exportCsv() {
    const headers = [
      "id",
      "customerId",
      "customer.firstName",
      "customer.lastName",
      "customer.email",
      "bikeId",
      "status",
      "createdAt",
      "inProgressAt",
      "readyAt",
      "hubspotFallbackAt",
    ];
    const rows = items.map((wo) => {
      const w = wo as WorkOrderExt;
      return [
        w.id,
        w.customerId,
        w.customer?.firstName || "",
        w.customer?.lastName || "",
        w.customer?.email || "",
        w.bikeId || "",
        w.status,
        w.createdAt,
        w.inProgressAt || "",
        w.readyAt || "",
        w.hubspotFallbackAt || "",
      ];
    });
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onCreate(e?: React.FormEvent | React.MouseEvent) {
    if (e) e.preventDefault();
    if (!customerId) {
      showToastMessage("customerId requis", "error");
      return;
    }
    
    logger.info('[Ticket Creation] Creating ticket with:', { customerId, bikeId, ticketType });
    
    setCreating(true);
    try {
      const created = await createWorkOrder({ customerId, bikeId: bikeId || undefined });
      
      logger.info('[Ticket Creation] Ticket created:', created);
      
      if (ticketType) {
        try { 
          await setWorkOrderType(created.id, ticketType as WorkOrderType); 
          logger.info('[Ticket Creation] Type set:', ticketType);
        } catch (err) {
          logger.error('[Ticket Creation] Error setting type:', err);
        }
      }
      
      // Rafraîchir la liste des tickets pour voir le nouveau
      await refresh();
      
      // Fermer le dialog
      setCreateDialogOpen(false);
      
      // Reset form
      setCustomerId("");
      setBikeId("");
      setTicketType("");
      
      // Redirect to detail page for streamlined workflow
      router.push(`/tickets/${created.id}`);
    } catch (e) {
      logger.error('[Ticket Creation] Error:', e);
      showToastMessage("Erreur de création du ticket", "error");
    } finally {
      setCreating(false);
    }
  }

  // Function to add a new bike to customer
  async function handleAddBike() {
    if (!customerId) {
      showToastMessage("Sélectionnez d'abord un client", "error");
      return;
    }
    if (!nbBrand.trim() || !nbModel.trim()) {
      showToastMessage("Marque et modèle requis", "error");
      return;
    }
    setAddingBike(true);
    try {
      const newBike = await createCustomerBike(customerId, {
        brand: nbBrand.trim(),
        model: nbModel.trim(),
        serialNumber: nbSN.trim() || undefined,
        color: nbColor.trim() || undefined,
        notes: nbNotes.trim() || undefined,
      });
      // Refresh customer bikes list
      const bikes = await listCustomerBikes(customerId);
      setCustomerBikes(bikes);
      // Auto-select the new bike
      setBikeId(newBike.id);
      // Close dialog and reset form
      setAddBikeOpen(false);
      setNbBrand("");
      setNbModel("");
      setNbSN("");
      setNbColor("");
      setNbNotes("");
      showToastMessage("Vélo ajouté avec succès", "success");
    } catch (e) {
      logger.error(e);
      showToastMessage("Erreur lors de l'ajout du vélo", "error");
    } finally {
      setAddingBike(false);
    }
  }

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Header Moderne Bleu */}
        <Box
          sx={{
            bgcolor: theme.primaryLight,
            borderBottom: 2,
            borderColor: theme.primary,
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentIcon sx={{ fontSize: 40, color: theme.primary }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} color={theme.text}>
                    🔧 Tickets Atelier
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion des réparations et interventions
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => refresh()}
                  disabled={loading}
                  sx={{
                    borderColor: theme.primary,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Actualiser
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                  sx={{
                    bgcolor: theme.primary,
                    '&:hover': {
                      bgcolor: theme.primaryDark,
                    },
                  }}
                >
                  Nouveau Ticket
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl">
        {/* Filtres & Recherche */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, border: 2, borderColor: theme.border, bgcolor: theme.background }}>
          <Stack spacing={2}>
            {/* Ligne 1: Recherche + Tabs statut */}
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                placeholder="Rechercher (id, client, email, vélo)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                sx={{ flex: 1, minWidth: 260 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <Tabs
                value={statusFilter || ""}
                onChange={(_, v) => setStatusFilter(v as typeof statusFilter)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab value="" label="Tous" />
                <Tab value="created" label="Créés" />
                <Tab value="in_progress" label="En cours" />
                <Tab value="ready" label="Prêts" />
                <Tab value="delivered" label="Livrés" />
              </Tabs>
            </Stack>

            {/* Ligne 2: Filtres rapides + Options */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Chip
                label="Prêts aujourd'hui"
                color={onlyReadyToday ? 'primary' : 'default'}
                onClick={() => setOnlyReadyToday((v) => !v)}
                variant={onlyReadyToday ? 'filled' : 'outlined'}
              />
              <Chip
                label="Cette semaine"
                color={onlyReadyWeek ? 'primary' : 'default'}
                onClick={() => setOnlyReadyWeek((v) => !v)}
                variant={onlyReadyWeek ? 'filled' : 'outlined'}
              />
              <Box flex={1} />
              <Tooltip title="Colonnes visibles">
                <IconButton size="small" onClick={(e) => setColMenuAnchor(e.currentTarget)}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={colMenuAnchor} open={Boolean(colMenuAnchor)} onClose={() => setColMenuAnchor(null)}>
                {[
                  { key: 'id', label: 'N° Ticket' },
                  { key: 'name', label: 'Nom client' },
                  { key: 'CustomerBike', label: 'Vélo' },
                  { key: 'type', label: 'Type réparation' },
                  { key: 'status', label: 'Statut' },
                  { key: 'customerId', label: 'ID Client (technique)' },
                  { key: 'email', label: 'Email client' },
                  { key: 'hubspot', label: 'HubSpot fallback' },
                  { key: 'actions', label: 'Actions' },
                ].map((c) => (
                  <MenuItem key={c.key} onClick={() => setColumnsConfig((prev) => ({ ...prev, [c.key]: !prev[c.key as keyof typeof prev] }))}>
                    <Checkbox size="small" checked={columnsConfig[c.key as keyof typeof columnsConfig]} sx={{ mr: 1 }} />
                    {c.label}
                  </MenuItem>
                ))}
              </Menu>
              <Button onClick={exportCsv} size="small" variant="outlined" startIcon={<FileDownloadIcon />}>Export CSV</Button>
              <FormControlLabel control={<Switch size="small" checked={denseMode} onChange={(e) => setDenseMode(e.target.checked)} />} label="Compact" />
            </Stack>
          </Stack>
        </Paper>

        {/* Liste des tickets */}
        <Paper elevation={0} sx={{ border: 2, borderColor: theme.border, bgcolor: theme.background, overflow: 'hidden' }}>
          <Box sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2 }}>
              <TablePagination
                component="div"
                count={filteredCount}
                page={tablePage}
                onPageChange={handleChangePage}
                rowsPerPage={tableRowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5,10,25,50]}
                labelRowsPerPage="Lignes par page"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
              <Box flex={1} />
              <TextField size="small" label="Aller à la page" value={goPage} onChange={(e) => setGoPage(e.target.value)} sx={{ width: 140 }} onKeyDown={(e) => { if (e.key === 'Enter') goToPage(); }} />
              <Button size="small" variant="outlined" onClick={goToPage}>Aller</Button>
            </Stack>
          </Box>

          {/* Widget d'actions groupées */}
          {tableSelected.length > 0 && (
            <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover', border: '2px solid', borderColor: 'divider' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 2 }}>
                  {tableSelected.length} ticket{tableSelected.length > 1 ? 's' : ''} sélectionné{tableSelected.length > 1 ? 's' : ''}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<EditIcon />}
                  onClick={() => {
                    if (tableSelected.length !== 1) {
                      showToastMessage('Sélectionnez un seul ticket', 'error');
                      return;
                    }
                    router.push(`/tickets/${tableSelected[0]}`);
                  }}
                >
                  Modifier
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={async () => {
                    if (tableSelected.length < 2) {
                      showToastMessage('Sélectionnez au moins 2 tickets', 'error');
                      return;
                    }
                    // Vérifier que tous les tickets ont le même client
                    const tickets = items.filter(t => tableSelected.includes(t.id));
                    const customerIds = [...new Set(tickets.map(t => t.customerId))];
                    if (customerIds.length > 1) {
                      showToastMessage('Les tickets doivent appartenir au même client', 'error');
                      return;
                    }
                    if (!confirm(`Fusionner ${tableSelected.length} tickets en un seul ?`)) return;
                    
                    try {
                      const merged = await mergeWorkOrders(tableSelected);
                      showToastMessage('Tickets fusionnés', 'success');
                      setTableSelected([]);
                      await refresh();
                      router.push(`/tickets/${merged.id}`);
                    } catch (_e) {
                      showToastMessage('Erreur lors de la fusion', 'error');
                    }
                  }}
                >
                  Fusionner
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error"
                  disabled={ticketsMutations.isBulkDeleting}
                  onClick={() => {
                    if (!confirm(`Supprimer définitivement ${tableSelected.length} ticket(s) ? Cette action est irréversible.`)) return;
                    ticketsMutations.bulkDelete(tableSelected);
                    setTableSelected([]);
                  }}
                >
                  Supprimer
                </Button>
                <Box flex={1} />
                <Button 
                  size="small" 
                  onClick={() => setTableSelected([])}
                >
                  Annuler sélection
                </Button>
              </Stack>
            </Paper>
          )}

          <TableContainer ref={tableRef} sx={{ maxHeight: 560, borderTop: '1px solid', borderColor: 'divider' }}>
          <Table size={denseMode ? "small" : "medium"} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={tableSelected.length > 0 && tableSelected.length < processedItems.length}
                    checked={processedItems.length > 0 && tableSelected.length === processedItems.length}
                    onChange={(e) => {
                      if (e.target.checked) setTableSelected(processedItems.map(t => t.id));
                      else setTableSelected([]);
                    }}
                  />
                </TableCell>
                {columnsConfig.id && (
                  <TableCell
                    sortDirection={tableSortBy === 'id' ? tableSortDir : false}
                    sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3, minWidth: 180 }}
                  >
                    <TableSortLabel active={tableSortBy === 'id'} direction={tableSortBy === 'id' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('id')}>N° Ticket</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.name && (
                  <TableCell sortDirection={tableSortBy === 'name' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'name'} direction={tableSortBy === 'name' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('name')}>Nom client</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.CustomerBike && (
                  <TableCell sortDirection={tableSortBy === 'bike' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'bike'} direction={tableSortBy === 'bike' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('bike')}>Vélo</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.type && (
                  <TableCell>
                    Type réparation
                  </TableCell>
                )}
                {columnsConfig.customerId && (
                  <TableCell sortDirection={tableSortBy === 'customer' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'customer'} direction={tableSortBy === 'customer' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('customer')}>ID Client</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.email && (
                  <TableCell sortDirection={tableSortBy === 'email' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'email'} direction={tableSortBy === 'email' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('email')}>Email client</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.status && (
                  <TableCell sortDirection={tableSortBy === 'status' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'status'} direction={tableSortBy === 'status' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('status')}>Statut</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.hubspot && (
                  <TableCell sortDirection={tableSortBy === 'hubspot' ? tableSortDir : false}>
                    <TableSortLabel active={tableSortBy === 'hubspot'} direction={tableSortBy === 'hubspot' ? tableSortDir : 'asc'} onClick={() => tableToggleSort('hubspot')}>HubSpot fallback</TableSortLabel>
                  </TableCell>
                )}
                {columnsConfig.actions && (
                  <TableCell
                    align="right"
                    sx={{ width: { xs: 200, sm: 240, md: 280 }, pr: { xs: 1, sm: 2 }, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 2 }}
                  >
                    Actions
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton width={160} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={140} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={160} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={180} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={120} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={100} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={160} />
                      </TableCell>
                      <TableCell align="right">
                        <Skeleton width={220} />
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!loading && processedItems.map((wo) => (
                <TableRow key={wo.id} hover sx={{ '&:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={tableSelected.includes(wo.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTableSelected([...tableSelected, wo.id]);
                        } else {
                          setTableSelected(tableSelected.filter(id => id !== wo.id));
                        }
                      }}
                    />
                  </TableCell>
                  {/* N° Ticket (format TKT-2025-0001) */}
                  {columnsConfig.id && (
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2, width: 140, maxWidth: 140, minWidth: 120 }}>
                      <Tooltip title={`ID technique: ${wo.id}`}>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <Link href={`/tickets/${wo.id}`} style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                            {wo.id ? formatTicketNumber(wo.id, wo.createdAt) : "-"}
                          </Link>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {/* Nom du client */}
                  {columnsConfig.name && (
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={[wo.Customer?.firstName, wo.Customer?.lastName].filter(Boolean).join(' ') || '-' }>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {[wo.Customer?.firstName, wo.Customer?.lastName].filter(Boolean).join(" ") || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {/* Vélo (marque + modèle) */}
                  {columnsConfig.CustomerBike && (
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Tooltip title={wo.CustomerBike ? `${wo.CustomerBike.brand || ''} ${wo.CustomerBike.model || ''}`.trim() : '-'}>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {wo.CustomerBike ? `${wo.CustomerBike.brand || ''} ${wo.CustomerBike.model || ''}`.trim() || "Vélo" : "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {/* Type de réparation */}
                  {columnsConfig.type && (
                    <TableCell>
                      {wo.type ? (
                        <Chip
                          size="small"
                          label={{
                            revision: 'Révision',
                            repair: 'Réparation',
                            maintenance: 'Entretien',
                            upgrade: 'Upgrade',
                          }[wo.type as WorkOrderType] || wo.type}
                          color={
                            wo.type === 'repair' ? 'warning' :
                            wo.type === 'revision' ? 'info' :
                            wo.type === 'maintenance' ? 'success' :
                            'default'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip size="small" label="-" />
                      )}
                    </TableCell>
                  )}
                  {/* ID Client (technique, masqué par défaut) */}
                  {columnsConfig.customerId && (
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Tooltip title={wo.customerId}>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {[wo.Customer?.firstName, wo.Customer?.lastName].filter(Boolean).join(" ") || wo.Customer?.email || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {/* Email client (masqué par défaut) */}
                  {columnsConfig.email && (
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Tooltip title={wo.Customer?.email || '-' }>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {wo.Customer?.email || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columnsConfig.status && (
                    <TableCell>
                      <Chip size="small" label={statusLabel(wo.status)} color={statusColor(wo.status)} sx={statusSx(wo.status)} />
                    </TableCell>
                  )}
                  {columnsConfig.hubspot && (
                    <TableCell>
                      {wo.hubspotFallbackAt ? new Date(wo.hubspotFallbackAt).toLocaleString() : '-'}
                    </TableCell>
                  )}
                  {columnsConfig.actions && (
                    <TableCell
                      align="right"
                      sx={{ width: { xs: 200, sm: 240, md: 280 }, pr: { xs: 1, sm: 2 }, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                    >
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                        <Tooltip title="Démarrer intervention">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<PlayArrowIcon />} aria-label="Démarrer"
                              disabled={wo.status !== "created" || ticketsMutations.isStarting}
                              onClick={() => ticketsMutations.start(wo.id)}>
                              {isSmall ? null : 'Démarrer'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Marquer prêt">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<CheckCircleIcon />} aria-label="Marquer prêt"
                              disabled={wo.status === "ready" || wo.status === "delivered" || ticketsMutations.isMarkingReady}
                              onClick={() => ticketsMutations.markReady(wo.id)}>
                              {isSmall ? null : 'Prêt'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Clôturer (livré)">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<DoneAllIcon />} aria-label="Clôturer"
                              disabled={wo.status !== "ready" || ticketsMutations.isUpdatingStatus}
                              onClick={() => ticketsMutations.updateStatus(wo.id, "delivered")}>
                              {isSmall ? null : 'Clôturer'}
                            </Button>
                          </span>
                        </Tooltip>
                        {wo.status === 'delivered' && (
                          <Tooltip title="Réouvrir (retour à créé)">
                            <span>
                              <Button size="small" sx={{ whiteSpace: 'nowrap' }} aria-label="Réouvrir"
                                disabled={ticketsMutations.isUpdatingStatus}
                                onClick={() => ticketsMutations.updateStatus(wo.id, "created")}>
                                {isSmall ? null : 'Réouvrir'}
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Modifier">
                          <Link href={`/tickets/${wo.id}`} passHref>
                            <IconButton
                              size="small"
                              aria-label="Modifier"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Link>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Supprimer"
                            disabled={ticketsMutations.isDeleting}
                            onClick={() => {
                              if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ticket ?`)) return;
                              ticketsMutations.remove(wo.id);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColSpan}>
                    <Box py={3} textAlign="center" color="text.secondary">
                      <Typography>Aucun ticket</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </TableContainer>
          <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2 }}>
              <TablePagination
                component="div"
                count={filteredCount}
                page={tablePage}
                onPageChange={handleChangePage}
                rowsPerPage={tableRowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5,10,25,50]}
                labelRowsPerPage="Lignes par page"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
              />
              <Box flex={1} />
              <TextField size="small" label="Aller à la page" value={goPage} onChange={(e) => setGoPage(e.target.value)} sx={{ width: 140 }} onKeyDown={(e) => { if (e.key === 'Enter') goToPage(); }} />
              <Button size="small" variant="outlined" onClick={goToPage}>Aller</Button>
            </Stack>
          </Box>
        </Paper>

        <Snackbar
          open={toastState.open}
          autoHideDuration={3000}
          onClose={ticketsUI.hideToast}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={ticketsUI.hideToast}
            severity={toastState.severity}
            sx={{ width: "100%" }}
          >
            {toastState.message}
          </Alert>
        </Snackbar>

        {/* Dialog Ajout Vélo */}
        <Dialog open={addBikeOpen} onClose={() => !addingBike && setAddBikeOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: theme.primaryLight, color: theme.text }}>
            🚲 Ajouter un Vélo
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <TextField
                label="Marque *"
                value={nbBrand}
                onChange={(e) => setNbBrand(e.target.value)}
                size="small"
                autoFocus
                disabled={addingBike}
              />
              <TextField
                label="Modèle *"
                value={nbModel}
                onChange={(e) => setNbModel(e.target.value)}
                size="small"
                disabled={addingBike}
              />
              <TextField
                label="Numéro de série"
                value={nbSN}
                onChange={(e) => setNbSN(e.target.value)}
                size="small"
                disabled={addingBike}
                helperText="Optionnel"
              />
              <TextField
                label="Couleur"
                value={nbColor}
                onChange={(e) => setNbColor(e.target.value)}
                size="small"
                disabled={addingBike}
                helperText="Optionnel"
              />
              <TextField
                label="Notes"
                value={nbNotes}
                onChange={(e) => setNbNotes(e.target.value)}
                size="small"
                multiline
                rows={2}
                disabled={addingBike}
                helperText="Optionnel"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddBikeOpen(false)} disabled={addingBike}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleAddBike}
              disabled={addingBike || !nbBrand.trim() || !nbModel.trim()}
              sx={{
                bgcolor: theme.primary,
                '&:hover': { bgcolor: theme.primaryDark }
              }}
            >
              {addingBike ? "Ajout..." : "Ajouter le vélo"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Création Ticket */}
        <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ bgcolor: theme.primaryLight, color: theme.text }}>
            🔧 Nouveau Ticket
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={2}>
              {/* Client */}
              <Autocomplete
                options={customers}
                loading={loadingCustomers}
                value={customers.find(c => c.id === customerId) || null}
                getOptionLabel={(c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Client"}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, val) => setCustomerId(val?.id || "")}
                renderInput={(params) => (
                  <TextField {...params} label="Client *" size="small" placeholder="Rechercher un client..." />
                )}
              />
              
              {/* Vélo */}
              <Stack direction="row" spacing={1}>
                <Autocomplete
                  options={customerBikes}
                  getOptionLabel={(b) => [b.brand, b.model, b.serialNumber ? `SN:${b.serialNumber}` : ""].filter(Boolean).join(" • ") || "Vélo"}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  value={customerBikes.find(b => b.id === bikeId) || null}
                  onChange={(_, v) => setBikeId(v?.id || "")}
                  disabled={!customerId}
                  renderInput={(params) => (
                    <TextField {...params} label="Vélo (optionnel)" size="small" placeholder={customerId ? "Choisir un vélo" : "Sélectionner d'abord un client"} />
                  )}
                  sx={{ flex: 1 }}
                />
                <Button size="small" variant="outlined" disabled={!customerId} onClick={() => setAddBikeOpen(true)}>+ Vélo</Button>
              </Stack>

              {/* Type */}
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Type d&apos;intervention</Typography>
                <ButtonGroup size="small" variant="outlined" fullWidth>
                  <Button 
                    onClick={() => setTicketType('revision' as WorkOrderType)}
                    variant={ticketType === 'revision' ? 'contained' : 'outlined'}
                  >
                    Révision
                  </Button>
                  <Button 
                    onClick={() => setTicketType('repair' as WorkOrderType)}
                    variant={ticketType === 'repair' ? 'contained' : 'outlined'}
                  >
                    Réparation
                  </Button>
                  <Button 
                    onClick={() => setTicketType('maintenance' as WorkOrderType)}
                    variant={ticketType === 'maintenance' ? 'contained' : 'outlined'}
                  >
                    Entretien
                  </Button>
                  <Button 
                    onClick={() => setTicketType('upgrade' as WorkOrderType)}
                    variant={ticketType === 'upgrade' ? 'contained' : 'outlined'}
                  >
                    Upgrade
                  </Button>
                </ButtonGroup>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialogOpen(false)}>Annuler</Button>
            <Button 
              variant="contained" 
              onClick={onCreate}
              disabled={creating || !customerId}
              sx={{
                bgcolor: theme.primary,
                '&:hover': { bgcolor: theme.primaryDark }
              }}
            >
              {creating ? "Création..." : "Créer le ticket"}
            </Button>
          </DialogActions>
        </Dialog>
        </Container>
      </Box>
    </RequireAuth>
  );
}
