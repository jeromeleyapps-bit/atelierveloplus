"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createWorkOrder,
  searchWorkOrders,
  markWorkOrderReady,
  listCustomers,
  startWorkOrder,
  setWorkOrderStatus,
  setWorkOrderType,
  getWorkOrderType,
  getCustomerBike,
  listCustomerBikes,
  createCustomerBike,
  deleteWorkOrder,
  mergeWorkOrders,
  type WorkOrder,
  type Customer,
  type WorkOrderType,
  type CustomerBike,
} from "@/lib/api";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableSortLabel,
  TableHead,
  TableRow,
  TableContainer,
  TextField,
  Typography,
  Skeleton,
  Tabs,
  Tab,
  Tooltip,
  TablePagination,
  useMediaQuery,
} from "@mui/material";
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
import type { SelectChangeEvent } from "@mui/material/Select";
import Link from "next/link";
import RequireAuth from "../components/RequireAuth";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ListAltIcon from "@mui/icons-material/ListAlt";

export default function TicketsPage() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [items, setItems] = useState<WorkOrder[]>([]);
  // Démarre en chargement pour un rendu initial identique SSR/CSR
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [bikeId, setBikeId] = useState("");
  const [customerBikes, setCustomerBikes] = useState<CustomerBike[]>([]);
  const [ticketType, setTicketType] = useState<WorkOrderType | "">("");
  // Add bike dialog state
  const [addBikeOpen, setAddBikeOpen] = useState(false);
  const [nbBrand, setNbBrand] = useState("");
  const [nbModel, setNbModel] = useState("");
  const [nbSN, setNbSN] = useState("");
  const [nbColor, setNbColor] = useState("");
  const [nbNotes, setNbNotes] = useState("");
  const [addingBike, setAddingBike] = useState(false);
  const [dense, setDense] = useState<boolean>(false);
  const [colAnchor, setColAnchor] = useState<null | HTMLElement>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "" | "created" | "in_progress" | "ready" | "delivered"
  >("");
  const [query, setQuery] = useState("");
  const [onlyReadyToday, setOnlyReadyToday] = useState(false);
  const [onlyReadyWeek, setOnlyReadyWeek] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [columns, setColumns] = useState({
    id: true,
    customerId: true,
    name: true,
    email: true,
    bike: true,
    type: true,
    status: true,
    hubspot: true,
    actions: true,
  });

  const [sortBy, setSortBy] = useState<"id" | "customer" | "name" | "email" | "bike" | "status" | "hubspot">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  
  // Sélection multiple pour actions groupées
  const [selected, setSelected] = useState<string[]>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await searchWorkOrders({
        status: statusFilter || undefined,
        q: query,
      });
      setItems(data);
      // lazy load enrichments for current page items (type + bike label)
      try {
        const pageItems = data.slice(page * rowsPerPage, (page * rowsPerPage) + rowsPerPage);
        // Work order types
        const ids = pageItems.map((w) => w.id);
        const entries = await Promise.all(ids.map(async (id) => {
          try { const r = await getWorkOrderType(id); return [id, r.type as (WorkOrderType|null)]; } catch { return [id, null] as const; }
        }));
        const tmap: Record<string, WorkOrderType | null> = {};
        for (const [id, t] of entries) tmap[id] = t as any;
        setTypesMap(tmap);

        // Bike labels for visible rows
        const pairs = pageItems.filter((w) => w.customerId && w.bikeId).map((w) => [w.customerId as string, w.bikeId as string] as const);
        const unique = Array.from(new Set(pairs.map((p) => p.join("|")))).map((s) => s.split("|") as [string,string]);
        const bEntries = await Promise.all(unique.map(async ([cid, bid]) => {
          try {
            const b = await getCustomerBike(cid, bid);
            const label = [b.brand, b.model, b.serialNumber ? `SN:${b.serialNumber}` : ""].filter(Boolean).join(" • ") || "Vélo";
            return [bid, label] as const;
          } catch { return [bid, "Vélo"] as const; }
        }));
        const bmap: Record<string,string> = {};
        for (const [bid, label] of bEntries) bmap[bid] = label;
        setBikesMap(bmap);
      } catch {}
    } catch (e) {
      console.error(e);
      alert("Erreur de chargement des tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, query, page, rowsPerPage]);

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPage(0);
  }

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [typesMap, setTypesMap] = useState<Record<string, WorkOrderType | null>>({});
  const [bikesMap, setBikesMap] = useState<Record<string, string>>({});
  const [goPage, setGoPage] = useState<string>("");
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
    // Auto-scroll the table container to top on page change
    if (tableRef.current) {
      try {
        tableRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        tableRef.current.scrollTop = 0;
      }
    }
  };
  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

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

  // Load saved UI state from localStorage on first mount
  useEffect(() => {
    if (initialized) return;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('tickets-ui') : null;
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{ statusFilter: typeof statusFilter; query: string; dense: boolean; onlyReadyToday: boolean; onlyReadyWeek: boolean; columns: typeof columns; sortBy: typeof sortBy; sortDir: typeof sortDir; page: number; rowsPerPage: number }>;
        if (saved.statusFilter !== undefined) setStatusFilter(saved.statusFilter);
        if (saved.query !== undefined) setQuery(saved.query);
        if (saved.dense !== undefined) setDense(saved.dense);
        if (saved.onlyReadyToday !== undefined) setOnlyReadyToday(saved.onlyReadyToday);
        if (saved.onlyReadyWeek !== undefined) setOnlyReadyWeek(saved.onlyReadyWeek);
        if (saved.columns !== undefined) setColumns(saved.columns);
        if (saved.sortBy !== undefined) setSortBy(saved.sortBy);
        if (saved.sortDir !== undefined) setSortDir(saved.sortDir);
        if (typeof saved.page === 'number') setPage(saved.page);
        if (typeof saved.rowsPerPage === 'number') setRowsPerPage(saved.rowsPerPage);
      }
    } catch (e) {
      console.warn('Failed to load UI state', e);
    } finally {
      setInitialized(true);
    }
  }, [initialized]);

  // Persist UI state
  useEffect(() => {
    if (!initialized) return;
    try {
      localStorage.setItem('tickets-ui', JSON.stringify({ statusFilter, query, dense, onlyReadyToday, onlyReadyWeek, columns, sortBy, sortDir, page, rowsPerPage }));
    } catch {}
  }, [statusFilter, query, dense, onlyReadyToday, onlyReadyWeek, columns, sortBy, sortDir, page, rowsPerPage, initialized]);

  useEffect(() => {
    if (!initialized) return;
    refresh();
    // Load customers for autocomplete
    (async () => {
      setLoadingCustomers(true);
      try {
        const data = await listCustomers();
        setCustomers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, [refresh, initialized]);

  // Load bikes when a customer is selected
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!customerId) { setCustomerBikes([]); setBikeId(""); return; }
      try {
        const bikes = await listCustomerBikes(customerId);
        if (!alive) return;
        setCustomerBikes(bikes);
      } catch (e) {
        console.warn('failed to load customer bikes', e);
        if (alive) setCustomerBikes([]);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  useEffect(() => {
    // reload whenever status/filter query changes (handled by refresh dependency)
    if (!initialized) return;
    refresh();
  }, [refresh, initialized]);

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
      switch (sortBy) {
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
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sorted.slice(start, end);
  }, [baseList, sortBy, sortDir, page, rowsPerPage]);

  const filteredCount = useMemo(() => baseList.length, [baseList]);

  // Clamp page if out of range when filters change
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredCount / rowsPerPage) - 1);
    if (page > maxPage) setPage(0);
  }, [filteredCount, rowsPerPage]);

  // Reset to first page on filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter, query, onlyReadyToday, onlyReadyWeek, rowsPerPage]);

  function goToPage() {
    const n = parseInt(goPage, 10);
    if (Number.isNaN(n)) return;
    const maxPage = Math.max(1, Math.ceil(filteredCount / rowsPerPage));
    const target = Math.min(maxPage, Math.max(1, n));
    handleChangePage(null as any, target - 1);
  }

  const visibleColSpan = useMemo(() => Object.values(columns).filter(Boolean).length, [columns]);

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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) {
      setToast({ open: true, message: "customerId requis", severity: "error" });
      return;
    }
    setCreating(true);
    try {
      const created = await createWorkOrder({ customerId, bikeId: bikeId || undefined });
      if (ticketType) {
        try { await setWorkOrderType(created.id, ticketType as WorkOrderType); } catch {}
      }
      // Redirect to detail page for streamlined workflow
      window.location.href = `/tickets/${created.id}`;
    } catch (e) {
      console.error(e);
      setToast({
        open: true,
        message: "Erreur de création du ticket",
        severity: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function onReady(id: string) {
    try {
      await markWorkOrderReady(id);
      await refresh();
      setToast({
        open: true,
        message: "Ticket marqué comme prêt (HubSpot synchronisé)",
        severity: "success",
      });
    } catch (e) {
      console.error(e);
      setToast({
        open: true,
        message: "Erreur: impossible de marquer comme prêt",
        severity: "error",
      });
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Tickets atelier">
        {/* Widget 1 : Filtres & Recherche */}
        <SectionCard title="Recherche & Filtres" icon={<SearchIcon color="primary" />}>
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
                <IconButton size="small" onClick={(e) => setColAnchor(e.currentTarget)}>
                  <ViewColumnIcon />
                </IconButton>
              </Tooltip>
              <Menu anchorEl={colAnchor} open={Boolean(colAnchor)} onClose={() => setColAnchor(null)}>
                {[
                  { key: 'id', label: 'ID' },
                  { key: 'customerId', label: 'Client' },
                  { key: 'name', label: 'Nom' },
                  { key: 'email', label: 'Email client' },
                  { key: 'bike', label: 'Vélo' },
                  { key: 'type', label: 'Type' },
                  { key: 'status', label: 'Statut' },
                  { key: 'hubspot', label: 'HubSpot fallback' },
                  { key: 'actions', label: 'Actions' },
                ].map((c) => (
                  <MenuItem key={c.key} onClick={() => setColumns((prev) => ({ ...prev, [c.key]: !prev[c.key as keyof typeof prev] }))}>
                    <Checkbox size="small" checked={columns[c.key as keyof typeof columns]} sx={{ mr: 1 }} />
                    {c.label}
                  </MenuItem>
                ))}
              </Menu>
              <Button onClick={exportCsv} size="small" variant="outlined" startIcon={<FileDownloadIcon />}>Export CSV</Button>
              <FormControlLabel control={<Switch size="small" checked={dense} onChange={(e) => setDense(e.target.checked)} />} label="Compact" />
            </Stack>
          </Stack>
        </SectionCard>

        {/* Widget 2 : Création rapide */}
        <SectionCard title="Nouveau ticket" icon={<AddIcon color="primary" />}>
          <form onSubmit={onCreate}>
            <Stack spacing={2}>
              {/* Ligne 1: Client + Vélo */}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                <Autocomplete
                  options={customers}
                  loading={loadingCustomers}
                  getOptionLabel={(c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email || "Client"}
                  onChange={(_, val) => setCustomerId(val?.id || "")}
                  renderInput={(params) => (
                    <TextField {...params} label="Client *" size="small" placeholder="Rechercher un client..." />
                  )}
                  sx={{ flex: 1, minWidth: 280 }}
                />
                <Autocomplete
                  options={customerBikes}
                  getOptionLabel={(b) => [b.brand, b.model, b.serialNumber ? `SN:${b.serialNumber}` : ""].filter(Boolean).join(" • ") || "Vélo"}
                  value={customerBikes.find(b => b.id === bikeId) || null}
                  onChange={(_, v) => setBikeId(v?.id || "")}
                  disabled={!customerId}
                  renderInput={(params) => (
                    <TextField {...params} label="Vélo (optionnel)" size="small" placeholder={customerId ? "Choisir un vélo" : "Sélectionner d'abord un client"} />
                  )}
                  sx={{ flex: 1, minWidth: 240 }}
                />
                <Button size="small" variant="outlined" disabled={!customerId} onClick={() => setAddBikeOpen(true)}>+ Vélo</Button>
              </Stack>

              {/* Ligne 2: Type + Créer */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
                <ButtonGroup size="small" variant="outlined">
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
                <Button type="submit" variant="contained" size="medium" startIcon={<AddIcon />} disabled={creating || !customerId}>
                  {creating ? "Création..." : "Créer le ticket"}
                </Button>
              </Stack>
            </Stack>
          </form>
        </SectionCard>

        <SectionCard title="Liste des tickets" icon={<ListAltIcon color="primary" />} sx={{ overflow: 'hidden' }}>
          <Box sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2 }}>
              <TablePagination
                component="div"
                count={filteredCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
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
          {selected.length > 0 && (
            <Paper elevation={2} sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: 'action.hover', border: '2px solid', borderColor: 'divider' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 2 }}>
                  {selected.length} ticket{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined" 
                  startIcon={<EditIcon />}
                  onClick={() => {
                    if (selected.length !== 1) {
                      setToast({ open: true, message: 'Sélectionnez un seul ticket', severity: 'error' });
                      return;
                    }
                    window.location.href = `/tickets/${selected[0]}`;
                  }}
                >
                  Modifier
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={async () => {
                    if (selected.length < 2) {
                      setToast({ open: true, message: 'Sélectionnez au moins 2 tickets', severity: 'error' });
                      return;
                    }
                    // Vérifier que tous les tickets ont le même client
                    const tickets = items.filter(t => selected.includes(t.id));
                    const customerIds = [...new Set(tickets.map(t => t.customerId))];
                    if (customerIds.length > 1) {
                      setToast({ open: true, message: 'Les tickets doivent appartenir au même client', severity: 'error' });
                      return;
                    }
                    if (!confirm(`Fusionner ${selected.length} tickets en un seul ?`)) return;
                    
                    try {
                      const merged = await mergeWorkOrders(selected);
                      setToast({ open: true, message: 'Tickets fusionnés', severity: 'success' });
                      setSelected([]);
                      await refresh();
                      window.location.href = `/tickets/${merged.id}`;
                    } catch (e) {
                      setToast({ open: true, message: 'Erreur lors de la fusion', severity: 'error' });
                    }
                  }}
                >
                  Fusionner
                </Button>
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="error"
                  onClick={async () => {
                    if (!confirm(`Supprimer définitivement ${selected.length} ticket(s) ? Cette action est irréversible.`)) return;
                    let successCount = 0;
                    for (const id of selected) {
                      try {
                        await deleteWorkOrder(id);
                        successCount++;
                      } catch (e) {
                        console.error('Delete error:', e);
                      }
                    }
                    setSelected([]);
                    await refresh();
                    setToast({ open: true, message: `${successCount} ticket(s) supprimé(s)`, severity: 'success' });
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

          <TableContainer ref={tableRef} sx={{ maxHeight: 560, borderTop: '1px solid', borderColor: 'divider' }}>
          <Table size={dense ? "small" : "medium"} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < processedItems.length}
                    checked={processedItems.length > 0 && selected.length === processedItems.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(processedItems.map(t => t.id));
                      else setSelected([]);
                    }}
                  />
                </TableCell>
                {columns.id && (
                  <TableCell
                    sortDirection={sortBy === 'id' ? sortDir : false as any}
                    sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 3, minWidth: 180 }}
                  >
                    <TableSortLabel active={sortBy === 'id'} direction={sortBy === 'id' ? sortDir : 'asc'} onClick={() => toggleSort('id')}>ID</TableSortLabel>
                  </TableCell>
                )}
                {columns.customerId && (
                  <TableCell sortDirection={sortBy === 'customer' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'customer'} direction={sortBy === 'customer' ? sortDir : 'asc'} onClick={() => toggleSort('customer')}>Client</TableSortLabel>
                  </TableCell>
                )}
                {columns.name && (
                  <TableCell sortDirection={sortBy === 'name' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'name'} direction={sortBy === 'name' ? sortDir : 'asc'} onClick={() => toggleSort('name')}>Nom</TableSortLabel>
                  </TableCell>
                )}
                {columns.email && (
                  <TableCell sortDirection={sortBy === 'email' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'email'} direction={sortBy === 'email' ? sortDir : 'asc'} onClick={() => toggleSort('email')}>Email client</TableSortLabel>
                  </TableCell>
                )}
                {columns.bike && (
                  <TableCell sortDirection={sortBy === 'bike' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'bike'} direction={sortBy === 'bike' ? sortDir : 'asc'} onClick={() => toggleSort('bike')}>Vélo</TableSortLabel>
                  </TableCell>
                )}
                {columns.type && (
                  <TableCell>
                    Type
                  </TableCell>
                )}
                {columns.status && (
                  <TableCell sortDirection={sortBy === 'status' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'status'} direction={sortBy === 'status' ? sortDir : 'asc'} onClick={() => toggleSort('status')}>Statut</TableSortLabel>
                  </TableCell>
                )}
                {columns.hubspot && (
                  <TableCell sortDirection={sortBy === 'hubspot' ? sortDir : false as any}>
                    <TableSortLabel active={sortBy === 'hubspot'} direction={sortBy === 'hubspot' ? sortDir : 'asc'} onClick={() => toggleSort('hubspot')}>HubSpot fallback</TableSortLabel>
                  </TableCell>
                )}
                {columns.actions && (
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
                      checked={selected.includes(wo.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected([...selected, wo.id]);
                        } else {
                          setSelected(selected.filter(id => id !== wo.id));
                        }
                      }}
                    />
                  </TableCell>
                  {columns.id && (
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 2, width: 140, maxWidth: 140, minWidth: 120 }}>
                      <Tooltip title={wo.id}>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          <Link href={`/tickets/${wo.id}`}>
                            {wo.id ? `${wo.id.slice(0,6)}…${wo.id.slice(-4)}` : "-"}
                          </Link>
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.customerId && (
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Tooltip title={wo.customerId}>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {[wo.customer?.firstName, wo.customer?.lastName].filter(Boolean).join(" ") || wo.customer?.email || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.name && (
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Tooltip title={[wo.customer?.firstName, wo.customer?.lastName].filter(Boolean).join(' ') || '-' }>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {[wo.customer?.firstName, wo.customer?.lastName].filter(Boolean).join(" ") || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.email && (
                    <TableCell sx={{ maxWidth: 240 }}>
                      <Tooltip title={wo.customer?.email || '-' }>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {wo.customer?.email || "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.bike && (
                    <TableCell sx={{ maxWidth: 180 }}>
                      <Tooltip title={wo.bikeId || '-' }>
                        <Box component="span" sx={{ display:'inline-block', maxWidth:'100%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {wo.bikeId ? (bikesMap[wo.bikeId] || "Vélo") : "-"}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.type && (
                    <TableCell>
                      {typesMap[wo.id] ? (
                        <Chip
                          size="small"
                          label={{
                            revision: 'Révision',
                            repair: 'Réparation',
                            maintenance: 'Entretien',
                            upgrade: 'Upgrade',
                          }[typesMap[wo.id] as WorkOrderType]}
                          color={
                            typesMap[wo.id] === 'repair' ? 'warning' :
                            typesMap[wo.id] === 'revision' ? 'info' :
                            typesMap[wo.id] === 'maintenance' ? 'success' :
                            'default'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Chip size="small" label="-" sx={{ fontWeight: 600 }} />
                      )}
                    </TableCell>
                  )}
                  {columns.status && (
                    <TableCell>
                      <Chip size="small" label={wo.status} color={statusColor(wo.status)} sx={statusSx(wo.status)} />
                    </TableCell>
                  )}
                  {columns.hubspot && (
                    <TableCell>
                      {wo.hubspotFallbackAt ? new Date(wo.hubspotFallbackAt).toLocaleString() : '-'}
                    </TableCell>
                  )}
                  {columns.actions && (
                    <TableCell
                      align="right"
                      sx={{ width: { xs: 200, sm: 240, md: 280 }, pr: { xs: 1, sm: 2 }, position: 'sticky', right: 0, bgcolor: 'background.paper', zIndex: 1 }}
                    >
                      <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" sx={{ flexWrap: 'nowrap' }}>
                        <Tooltip title="Démarrer intervention">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<PlayArrowIcon />} aria-label="Démarrer"
                              disabled={wo.status !== "created"}
                              onClick={async () => {
                                try {
                                  await startWorkOrder(wo.id);
                                  await refresh();
                                  setToast({ open: true, message: "Intervention démarrée", severity: "success" });
                                } catch (e) {
                                  console.error(e);
                                  setToast({ open: true, message: "Erreur: démarrage intervention", severity: "error" });
                                }
                              }}>
                              {isSmall ? null : 'Démarrer'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Marquer prêt">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<CheckCircleIcon />} aria-label="Marquer prêt"
                              disabled={wo.status === "ready" || wo.status === "delivered"}
                              onClick={() => onReady(wo.id)}>
                              {isSmall ? null : 'Prêt'}
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Clôturer (livré)">
                          <span>
                            <Button size="small" sx={{ whiteSpace: 'nowrap' }} startIcon={<DoneAllIcon />} aria-label="Clôturer"
                              disabled={wo.status !== "ready"}
                              onClick={async () => {
                                try {
                                  await setWorkOrderStatus(wo.id, "delivered");
                                  await refresh();
                                  setToast({ open: true, message: "Ticket clôturé (livré)", severity: "success" });
                                } catch (e) {
                                  console.error(e);
                                  setToast({ open: true, message: "Erreur: clôture (livré)", severity: "error" });
                                }
                              }}>
                              {isSmall ? null : 'Clôturer'}
                            </Button>
                          </span>
                        </Tooltip>
                        {wo.status === 'delivered' && (
                          <Tooltip title="Réouvrir (retour à créé)">
                            <span>
                              <Button size="small" sx={{ whiteSpace: 'nowrap' }} aria-label="Réouvrir"
                                onClick={async () => {
                                  try {
                                    await setWorkOrderStatus(wo.id, "created");
                                    await refresh();
                                    setToast({ open: true, message: "Ticket réouvert (créé)", severity: "success" });
                                  } catch (e) {
                                    console.error(e);
                                    setToast({ open: true, message: "Erreur: réouverture", severity: "error" });
                                  }
                                }}>
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
                            onClick={async () => {
                              if (!confirm(`Êtes-vous sûr de vouloir supprimer ce ticket ?`)) return;
                              try {
                                await deleteWorkOrder(wo.id);
                                await refresh();
                                setToast({ open: true, message: "Ticket supprimé", severity: "success" });
                              } catch (e) {
                                console.error(e);
                                setToast({ open: true, message: "Erreur: suppression", severity: "error" });
                              }
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
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
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
        </SectionCard>

        <Snackbar
          open={toast.open}
          autoHideDuration={3000}
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setToast((t) => ({ ...t, open: false }))}
            severity={toast.severity}
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
