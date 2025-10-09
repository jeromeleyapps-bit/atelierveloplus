"use client";
// Version 2.0 - Nouveau système de prix avec Auto-Entrepreneur

import React from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
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
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import type { CatalogCategory } from "@/lib/catalog";
import { useRouter, useSearchParams } from 'next/navigation';
import { listCatalogItems, createCatalogItem, updateCatalogItem, deleteCatalogItem, getAppSettings, type CatalogItem } from '@/lib/api';


export default function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<CatalogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<CatalogCategory | "">("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = React.useState(false);

  const [editOpen, setEditOpen] = React.useState(false);
  const [current, setCurrent] = React.useState<Partial<CatalogItem> | null>(null);
  
  // Load settings to get isAutoEntrepreneur status
  React.useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await getAppSettings();
      const aeStatus = settings.isAutoEntrepreneur || false;
      setIsAutoEntrepreneur(aeStatus);
      console.log('[ADMIN CATALOG] Auto-Entrepreneur:', aeStatus);
    } catch (e) {
      console.error('[ADMIN CATALOG] Failed to load settings', e);
    }
  }
  
  // Check if we have a barcode from scan page
  React.useEffect(() => {
    const barcode = searchParams.get('barcode');
    if (barcode) {
      // Search for product data first
      searchBarcode(barcode);
    }
  }, [searchParams]);

  async function searchBarcode(barcode: string, searchRetailers: boolean = false) {
    setLoading(true);
    try {
      const url = `/api/catalog/barcode?barcode=${encodeURIComponent(barcode)}${searchRetailers ? '&searchRetailers=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (res.ok && data.found) {
        // Product found
        handleBarcodeScan(barcode, data);
      } else if (res.ok && data.canSearchRetailers && !searchRetailers) {
        // Ask if user wants to search retailers
        const searchOnRetailers = window.confirm(
          'Produit non trouvé dans les bases publiques.\n\n' +
          'Voulez-vous chercher sur les sites spécialisés vélo ?\n' +
          '(Alltricks, Probikeshop, Bike24, Decathlon)\n\n' +
          'Cela prendra quelques secondes supplémentaires.'
        );
        
        if (searchOnRetailers) {
          await searchBarcode(barcode, true);
        } else {
          // User declined, open form with barcode only
          handleBarcodeScan(barcode, null);
        }
      } else {
        // Not found, open form with barcode only
        handleBarcodeScan(barcode, null);
      }
    } catch (err) {
      console.error('Barcode search error:', err);
      // On error, still open form with barcode
      handleBarcodeScan(barcode, null);
    } finally {
      setLoading(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await listCatalogItems({
        q: q || undefined,
        category: category || undefined,
        limit: rowsPerPage,
        offset: page * rowsPerPage
      });
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, [q, category, page, rowsPerPage]);

  function openCreate() {
    const vatRate = isAutoEntrepreneur ? 0 : 20;
    console.log('[ADMIN CATALOG] openCreate - isAE:', isAutoEntrepreneur, '=> TVA:', vatRate + '%');
    setCurrent({ 
      sku: "", 
      category: "piece", 
      name: "", 
      priceHT: 0, 
      priceTTC: 0, 
      vatRate: vatRate, 
      active: true,
      purchasePriceHT: 0,
      purchasePriceTTC: 0,
      supplierVatEnabled: false,
      marginCoeff: 1
    });
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
      purchasePriceHT: Number(current.purchasePriceHT || 0),
      purchasePriceTTC: Number(current.purchasePriceTTC || 0),
      supplierVatEnabled: Boolean(current.supplierVatEnabled),
      marginCoeff: Number(current.marginCoeff || 1),
    };
    if (!current.id) {
      // create
      await createCatalogItem(payload as any);
    } else {
      // update
      await updateCatalogItem(current.id, payload as any);
    }
    setEditOpen(false);
    await load();
  }

  async function remove(row: CatalogItem) {
    if (!confirm(`Supprimer l'item « ${row.name} » ?`)) return;
    try {
      await deleteCatalogItem(row.id);
      await load();
    } catch(e) { console.error(e); }
  }

  function handleBarcodeScan(barcode: string, productData?: any) {
    // Pre-fill form with scanned data
    const newItem: Partial<CatalogItem> = {
      sku: barcode,
      category: productData?.category || "piece",
      name: productData?.name || "",
      priceHT: 0,
      priceTTC: 0,
      vatRate: isAutoEntrepreneur ? 0 : 20,
      active: true,
      purchasePriceHT: 0,
      purchasePriceTTC: 0,
      supplierVatEnabled: false,
      marginCoeff: 1,
    };

    // If we have brand info, prepend it to the name
    if (productData?.brand && productData?.name) {
      newItem.name = `${productData.brand} - ${productData.name}`;
    }

    setCurrent(newItem);
    setEditOpen(true);
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
            <Button variant="outlined" color="secondary" startIcon={<QrCodeScannerIcon />} onClick={() => router.push('/scan')}>Scanner</Button>
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


        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>{current?.id ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
          <DialogContent sx={{ minHeight: 500 }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Informations générales */}
              <TextField size="small" label="SKU" value={current?.sku || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), sku: e.target.value }))} />
              <TextField size="small" select label="Catégorie" value={current?.category || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), category: e.target.value }))}>
                <MenuItem value="piece">Pièce</MenuItem>
                <MenuItem value="equipement">Équipement</MenuItem>
                <MenuItem value="velo_neuf">Vélo neuf</MenuItem>
                <MenuItem value="velo_occasion">Vélo occasion</MenuItem>
                <MenuItem value="service">Service</MenuItem>
              </TextField>
              <TextField size="small" label="Nom" value={current?.name || ''} onChange={(e) => setCurrent((c) => ({ ...(c as any), name: e.target.value }))} />
              
              <Divider><Typography variant="caption" color="text.secondary">PRIX D'ACHAT</Typography></Divider>
              
              {/* Prix d'achat */}
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField 
                  size="small" 
                  label="Prix achat HT" 
                  type="number" 
                  value={current?.purchasePriceHT ?? 0} 
                  onChange={(e) => {
                    const purchaseHT = Number(e.target.value);
                    const supplierVat = current?.supplierVatEnabled || false;
                    const purchaseTTC = supplierVat ? purchaseHT * 1.20 : purchaseHT;
                    const coeff = current?.marginCoeff || 1;
                    const sellHT = purchaseHT * coeff;
                    const sellTTC = sellHT * (isAutoEntrepreneur ? 1.0 : 1.20);
                    setCurrent((c) => ({ 
                      ...(c as any), 
                      purchasePriceHT: purchaseHT,
                      purchasePriceTTC: purchaseTTC,
                      priceHT: sellHT,
                      priceTTC: sellTTC,
                      vatRate: isAutoEntrepreneur ? 0 : 20
                    }));
                  }} 
                  onFocus={(e) => e.target.select()} 
                  sx={{ flex: 1 }} 
                />
                <FormControl component="fieldset">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Checkbox
                      size="small"
                      checked={current?.supplierVatEnabled || false}
                      onChange={(e) => {
                        const supplierVat = e.target.checked;
                        const purchaseHT = current?.purchasePriceHT || 0;
                        const purchaseTTC = supplierVat ? purchaseHT * 1.20 : purchaseHT;
                        setCurrent((c) => ({ 
                          ...(c as any), 
                          supplierVatEnabled: supplierVat,
                          purchasePriceTTC: purchaseTTC
                        }));
                      }}
                    />
                    <Typography variant="caption">TVA fournisseur (20%)</Typography>
                  </Stack>
                </FormControl>
                <TextField 
                  size="small" 
                  label="Prix achat TTC" 
                  type="number" 
                  value={current?.purchasePriceTTC ?? 0}
                  disabled={current?.supplierVatEnabled}
                  onChange={(e) => {
                    if (!current?.supplierVatEnabled) {
                      setCurrent((c) => ({ ...(c as any), purchasePriceTTC: Number(e.target.value) }));
                    }
                  }}
                  onFocus={(e) => e.target.select()} 
                  sx={{ flex: 1 }} 
                  InputProps={{ 
                    style: { 
                      backgroundColor: current?.supplierVatEnabled ? '#f5f5f5' : undefined 
                    } 
                  }}
                />
              </Stack>

              <Divider><Typography variant="caption" color="text.secondary">PRIX DE VENTE {isAutoEntrepreneur && '(Auto-Entrepreneur - TVA 0%)'}</Typography></Divider>
              
              {/* Prix de vente */}
              <Stack direction="row" spacing={1}>
                <TextField 
                  size="small" 
                  label="Coefficient" 
                  type="number" 
                  value={current?.marginCoeff ?? 1} 
                  onChange={(e) => {
                    const coeff = Number(e.target.value);
                    const purchaseHT = current?.purchasePriceHT || 0;
                    const sellHT = purchaseHT * coeff;
                    const sellTTC = sellHT * (isAutoEntrepreneur ? 1.0 : 1.20);
                    setCurrent((c) => ({ 
                      ...(c as any), 
                      marginCoeff: coeff,
                      priceHT: sellHT,
                      priceTTC: sellTTC,
                      vatRate: isAutoEntrepreneur ? 0 : 20
                    }));
                  }} 
                  onFocus={(e) => e.target.select()} 
                  sx={{ width: 140 }} 
                  helperText="×"
                />
                <TextField 
                  size="small" 
                  label="Prix vente HT" 
                  type="number" 
                  value={current?.priceHT ?? 0}
                  disabled
                  sx={{ flex: 1 }} 
                  InputProps={{ style: { backgroundColor: '#f5f5f5' } }}
                />
                <TextField 
                  size="small" 
                  label={`Prix vente TTC (${isAutoEntrepreneur ? '0%' : '+20%'})`}
                  type="number" 
                  value={current?.priceTTC ?? 0}
                  disabled
                  sx={{ flex: 1 }} 
                  InputProps={{ style: { backgroundColor: '#e3f2fd', fontWeight: 'bold' } }}
                  helperText="Utilisé dans tickets/devis/factures"
                />
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
