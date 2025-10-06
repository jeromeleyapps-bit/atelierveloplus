"use client";

import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadIcon from "@mui/icons-material/Upload";
import RequireAuth from "@/app/components/RequireAuth";
import PageShell from "@/app/components/PageShell";
import SectionCard from "@/app/components/SectionCard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ListAltIcon from "@mui/icons-material/ListAlt";
import type { CatalogCategory } from "@/lib/catalog";

interface CatalogItem {
  id: string;
  sku?: string | null;
  category: string;
  name: string;
  priceHT: number;
  priceTTC: number;
  vatRate: number;
  active: boolean;
  updatedAt?: string;
}

export default function AdminCatalogPage() {
  const [items, setItems] = React.useState<CatalogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<CatalogCategory | "">("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const [editOpen, setEditOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<Partial<CatalogItem> | null>(null);

  async function load() {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (q) p.set("q", q);
      if (category) p.set("category", String(category));
      p.set("limit", String(rowsPerPage));
      p.set("offset", String(page * rowsPerPage));
      const res = await fetch(`/api/catalog/items?${p.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setTotal(data.total || 0);
        // Auto-seed on first run if empty
        if ((data.total || 0) === 0) {
          // prevent loops if seed fails
          if (!(window as any).__catalogSeedAttempted__) {
            (window as any).__catalogSeedAttempted__ = true;
            try {
              const seedRes = await fetch('/api/catalog/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'fallback' }) });
              if (seedRes.ok) {
                // reload after seed
                await load();
                return;
              }
            } catch (e) { console.error(e); }
          }
        }
      } else {
        console.error(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [q, category, page, rowsPerPage]);

  function openCreate() {
    setCurrent({ sku: "", category: "piece", name: "", priceHT: 0, priceTTC: 0, vatRate: 20, active: true });
    setEditOpen(true);
  }

  function openEdit(row: CatalogItem) {
    setCurrent({ ...row });
    setEditOpen(true);
  }

  async function save() {
    if (!current) return;
    const payload = {
      sku: current.sku || null,
      category: current.category,
      name: current.name,
      priceHT: Number(current.priceHT || 0),
      priceTTC: Number(current.priceTTC || 0),
      vatRate: Number(current.vatRate || 0),
      active: Boolean(current.active),
    };
    if (!current.id) {
      // create
      const res = await fetch(`/api/catalog/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { console.error(await res.text()); return; }
    } else {
      // update
      const res = await fetch(`/api/catalog/items/${current.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { console.error(await res.text()); return; }
    }
    setEditOpen(false);
    await load();
  }

  async function remove(row: CatalogItem) {
    if (!confirm(`Supprimer l'item « ${row.name} » ?`)) return;
    const res = await fetch(`/api/catalog/items/${row.id}`, { method: 'DELETE' });
    if (!res.ok) { console.error(await res.text()); return; }
    await load();
  }

  return (
    <RequireAuth>
      <PageShell title="Admin · Catalogue" maxWidth="lg">
        <SectionCard title="Catalogue" icon={<Inventory2Icon color="primary" />}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
            <TextField size="small" label="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 260 }} />
            <TextField size="small" select label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value as any)} sx={{ minWidth: 180 }}>
              <MenuItem value="">Toutes</MenuItem>
              <MenuItem value="piece">Pièce</MenuItem>
              <MenuItem value="equipement">Équipement</MenuItem>
              <MenuItem value="velo_neuf">Vélo neuf</MenuItem>
              <MenuItem value="velo_occasion">Vélo occasion</MenuItem>
              <MenuItem value="service">Service</MenuItem>
            </TextField>
            <Box flex={1} />
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={async () => {
              try {
                const res = await fetch('/api/catalog/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'fallback' }) });
                if (!res.ok) { console.error(await res.text()); return; }
                await load();
              } catch (e) { console.error(e); }
            }}>Seed fallback</Button>
            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
              Import CSV
              <input type="file" accept=".csv" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const rows = text.split(/\r?\n/).filter(Boolean);
                const header = rows.shift();
                // Expect headers: sku,category,name,priceHT,priceTTC,vatRate,active
                for (const line of rows) {
                  const [sku, category, name, priceHT, priceTTC, vatRate, active] = line.split(',').map((s) => s.replace(/^"|"$/g, ''));
                  if (!name) continue;
                  await fetch('/api/catalog/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: sku || null, category, name, priceHT: Number(priceHT||0), priceTTC: Number(priceTTC||0), vatRate: Number(vatRate||0), active: active !== '0' }) });
                }
                await load();
                e.currentTarget.value = '';
              }} />
            </Button>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={async () => {
              try {
                // fetch all filtered items for export
                const p = new URLSearchParams();
                if (q) p.set('q', q);
                if (category) p.set('category', String(category));
                p.set('limit', '10000');
                p.set('offset', '0');
                const res = await fetch(`/api/catalog/items?${p.toString()}`);
                const data = await res.json();
                if (!res.ok) { console.error(data); return; }
                const rows: CatalogItem[] = data.items || [];
                const headers = ['sku','category','name','priceHT','priceTTC','vatRate','active'];
                const csvRows = rows.map(r => [
                  r.sku ?? '',
                  r.category ?? '',
                  r.name ?? '',
                  String(r.priceHT ?? 0),
                  String(r.priceTTC ?? 0),
                  String(r.vatRate ?? 0),
                  r.active ? '1' : '0',
                ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
                const csv = [headers.join(','), ...csvRows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `catalog_export_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) { console.error(e); }
            }}>Exporter CSV</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nouvel article</Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Liste des articles" icon={<ListAltIcon color="primary" />}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell align="right">PU HT</TableCell>
                  <TableCell align="right">PU TTC</TableCell>
                  <TableCell align="right">TVA (%)</TableCell>
                  <TableCell>Actif</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ '& tr:nth-of-type(odd)': { bgcolor: 'action.hover' } }}>
                {items.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.sku || '-'}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">{row.priceHT.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.priceTTC.toFixed(2)}</TableCell>
                    <TableCell align="right">{row.vatRate}</TableCell>
                    <TableCell>
                      <Chip label={row.active ? 'oui' : 'non'} color={row.active ? 'success' : 'default'} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="lex-end">
                        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => remove(row)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box py={3} textAlign="center" color="text.secondary">Aucun article</Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10,25,50,100]}
          />
        </SectionCard>

        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{current?.id ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" label="SKU" value={current?.sku || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), sku: e.target.value }))} />
              <TextField size="small" select label="Catégorie" value={current?.category || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), category: e.target.value }))}>
                <MenuItem value="piece">Pièce</MenuItem>
                <MenuItem value="equipement">Équipement</MenuItem>
                <MenuItem value="velo_neuf">Vélo neuf</MenuItem>
                <MenuItem value="velo_occasion">Vélo occasion</MenuItem>
                <MenuItem value="service">Service</MenuItem>
              </TextField>
              <TextField size="small" label="Nom" value={current?.name || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), name: e.target.value }))} />
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="PU HT" type="number" value={current?.priceHT ?? 0} onChange={(e) => setCurrent((c) => ({ ...(c as any), priceHT: Number(e.target.value) }))} sx={{ flex: 1 }} />
                <TextField size="small" label="PU TTC" type="number" value={current?.priceTTC ?? 0} onChange={(e) => setCurrent((c) => ({ ...(c as any), priceTTC: Number(e.target.value) }))} sx={{ flex: 1 }} />
                <TextField size="small" label="TVA (%)" type="number" value={current?.vatRate ?? 0} onChange={(e) => setCurrent((c) => ({ ...(c as any), vatRate: Number(e.target.value) }))} sx={{ width: 140 }} />
              </Stack>
              <TextField size="small" select label="Actif" value={current?.active ? '1' : '0'} onChange={(e) => setCurrent((c) => ({ ...(c as any), active: e.target.value === '1' }))}>
                <MenuItem value="1">Oui</MenuItem>
                <MenuItem value="0">Non</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={save}>Enregistrer</Button>
          </DialogActions>
        </Dialog>
      </PageShell>
    </RequireAuth>
  );
}
