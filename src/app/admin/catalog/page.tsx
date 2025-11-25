"use client";
// Version 2.0 - Nouveau système de prix avec Auto-Entrepreneur

// ✅ Hooks personnalisés
import { useAdminCatalogData } from '@/hooks/useAdminCatalogData';
import { useAdminCatalogUI } from '@/hooks/useAdminCatalogUI';
import { useAdminCatalogMutations } from '@/hooks/useAdminCatalogMutations';
import React from "react";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';

import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
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
import type { CatalogItem } from '@/lib/api';
import { logger } from '@/lib/logger';


export default function CatalogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // ✅ Hooks personnalisés
  // Initialize UI first to get filter values
  const [_loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<CatalogCategory | "">("");
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  
  const catalogData = useAdminCatalogData({ q, category, page, rowsPerPage });
  const catalogUI = useAdminCatalogUI(catalogData.isAutoEntrepreneur);
  const catalogMutations = useAdminCatalogMutations({
    onSuccess: () => catalogData.refetchCatalog(),
  });
  
  // Alias locaux
  const items = catalogData.items;
  const total = catalogData.total;
  const isAutoEntrepreneur = catalogData.isAutoEntrepreneur;
  const editOpen = catalogUI.editOpen;
  const setEditOpen = catalogUI.setEditOpen;
  const current = catalogUI.current;
  const setCurrent = catalogUI.setCurrent;
  const openCreate = catalogUI.openCreate;
  const openEdit = catalogUI.openEdit;
  
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
      logger.error('Barcode search error:', err);
      // On error, still open form with barcode
      handleBarcodeScan(barcode, null);
    } finally {
      setLoading(false);
    }
  }

  // Check if we have a barcode from scan page
  React.useEffect(() => {
    const barcode = searchParams.get('barcode');
    if (barcode) {
      // Search for product data first
      searchBarcode(barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchBarcode is stable (depends on handleBarcodeScan from hook)
  }, [searchParams]);



  function save() {
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
      catalogMutations.create(payload);
    } else {
      catalogMutations.update(current.id, payload);
    }
    catalogUI.closeDialog();
  }

  function remove(row: CatalogItem) {
    if (!confirm(`Supprimer l'item « ${row.name} » ?`)) return;
    catalogMutations.remove(row.id);
  }

  const handleBarcodeScan = catalogUI.handleBarcodeScan;

  return (
    <RequireAuth>
      <PageShell title="Admin · Catalogue" maxWidth="lg">
        <SectionCard title="Catalogue" icon={<Inventory2Icon color="primary" />}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
            <TextField size="small" label="Rechercher" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} sx={{ minWidth: 260 }} />
            <TextField size="small" select label="Catégorie" value={category} onChange={(e) => { setCategory(e.target.value as CatalogCategory | ''); setPage(0); }} SelectProps={{ native: false }} sx={{ minWidth: 180 }}>
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
                if (!res.ok) { logger.error(await res.text()); return; }
                catalogData.refetchCatalog();
              } catch (e) { logger.error(e); }
            }}>Seed fallback</Button>
            <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
              Import CSV
              <input type="file" accept=".csv" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const rows = text.split(/\r?\n/).filter(Boolean);
                const _header = rows.shift(); // CSV header, intentionally unused
                // Expect headers: sku,category,name,priceHT,priceTTC,vatRate,active
                for (const line of rows) {
                  const [sku, category, name, priceHT, priceTTC, vatRate, active] = line.split(',').map((s) => s.replace(/^"|"$/g, ''));
                  if (!name) continue;
                  await fetch('/api/catalog/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: sku || null, category, name, priceHT: Number(priceHT||0), priceTTC: Number(priceTTC||0), vatRate: Number(vatRate||0), active: active !== '0' }) });
                }
                catalogData.refetchCatalog();
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
                if (!res.ok) { logger.error(data); return; }
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
              } catch (e) { logger.error(e); }
            }}>Exporter CSV</Button>
            <Button variant="outlined" color="secondary" startIcon={<QrCodeScannerIcon />} onClick={() => router.push('/scan')}>Scanner</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Nouvel article</Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Maintenance" icon={<Inventory2Icon color="primary" />}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' }, rowGap: 1 }}>
            <Button variant="outlined" color="error" onClick={async () => {
              if (!confirm("Vider Mon stock des pièces non référencées ?")) return;
              const res = await fetch('/api/catalog/items?scope=stock', { method: 'DELETE' });
              const j = await res.json();
              alert(res.ok ? `Supprimés: ${j.deleted || 0} • Ignorés: ${j.skipped || 0}` : (j.message || 'Erreur'));
              catalogData.refetchCatalog();
            }}>Vider Mon stock</Button>
            <Button variant="outlined" color="error" onClick={async () => {
              if (!confirm("Vider le Catalogue fournisseur des pièces non référencées ?")) return;
              const res = await fetch('/api/catalog/items?scope=supplier', { method: 'DELETE' });
              const j = await res.json();
              alert(res.ok ? `Supprimés: ${j.deleted || 0} • Ignorés: ${j.skipped || 0}` : (j.message || 'Erreur'));
              catalogData.refetchCatalog();
            }}>Vider Catalogue fournisseur</Button>
            <Button variant="outlined" color="error" onClick={async () => {
              if (!confirm("Vider toutes les Offres B2B ?")) return;
              const res = await fetch('/api/suppliers/offers', { method: 'DELETE' });
              const j = await res.json();
              alert(res.ok ? `Offres supprimées: ${j.deleted || 0}` : (j.message || 'Erreur'));
            }}>Vider Offres B2B</Button>
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
              <TextField size="small" label="SKU" value={current?.sku || ''} onChange={(e) => setCurrent((c) => (c ? { ...c, sku: e.target.value } : null))} />
              <TextField size="small" select label="Catégorie" value={current?.category || ''} onChange={(e) => setCurrent((c) => (c ? { ...c, category: e.target.value as CatalogItem['category'] } : null))}>
                <MenuItem value="piece">Pièce</MenuItem>
                <MenuItem value="equipement">Équipement</MenuItem>
                <MenuItem value="velo_neuf">Vélo neuf</MenuItem>
                <MenuItem value="velo_occasion">Vélo occasion</MenuItem>
                <MenuItem value="service">Service</MenuItem>
              </TextField>
              <TextField size="small" label="Nom" value={current?.name || ''} onChange={(e) => setCurrent((c) => (c ? { ...c, name: e.target.value } : null))} />
              
              <Divider><Typography variant="caption" color="text.secondary">PRIX D&apos;ACHAT</Typography></Divider>
              
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
                    setCurrent((c) => (c ? { 
                      ...c, 
                      purchasePriceHT: purchaseHT,
                      purchasePriceTTC: purchaseTTC,
                      priceHT: sellHT,
                      priceTTC: sellTTC,
                      vatRate: isAutoEntrepreneur ? 0 : 20
                    } : null));
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
                        setCurrent((c) => (c ? { 
                          ...c, 
                          supplierVatEnabled: supplierVat,
                          purchasePriceTTC: purchaseTTC
                        } : null));
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
                      setCurrent((c) => (c ? { ...c, purchasePriceTTC: Number(e.target.value) } : null));
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
                    setCurrent((c) => (c ? { 
                      ...c, 
                      marginCoeff: coeff,
                      priceHT: sellHT,
                      priceTTC: sellTTC,
                      vatRate: isAutoEntrepreneur ? 0 : 20
                    } : null));
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
              
              <TextField size="small" select label="Actif" value={current?.active ? '1' : '0'} onChange={(e) => setCurrent((c) => (c ? { ...c, active: e.target.value === '1' } : null))}>
                <MenuItem value="1">Oui</MenuItem>
                <MenuItem value="0">Non</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => catalogUI.closeDialog()}>Annuler</Button>
            <Button variant="contained" onClick={save}>Enregistrer</Button>
          </DialogActions>
        </Dialog>
      </PageShell>
    </RequireAuth>
  );
}
