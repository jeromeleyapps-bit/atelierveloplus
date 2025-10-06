"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Chip, Snackbar, Alert, LinearProgress } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import EditIcon from "@mui/icons-material/Edit";
import WarehouseIcon from "@mui/icons-material/Warehouse";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PageShell from "../components/PageShell";
import SectionCard from "../components/SectionCard";
import RequireAuth from "../components/RequireAuth";
import B2BSearchDialog from "../../components/B2BSearchDialog";
import { CatalogItem, createCatalogItem, createStockMovement, getItemOffers, listCatalogItems, updateCatalogItem, listSuppliers, type Supplier, upsertItemSupplierItem, refreshItemOffers, getSetting, setSetting, searchSupplierOffers, type SupplierOffer, type B2BSearchResult } from "@/lib/api";

function labelCategory(cat?: string | null) {
  switch (cat) {
    case 'PIECES': return 'Pièces';
    case 'EQUIPEMENTS': return 'Équipements';
    case 'AUTRES': return 'Autres';
    default: return cat || '—';
  }
}

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const [stockOpen, setStockOpen] = useState(false);
  const [stockItem, setStockItem] = useState<CatalogItem | null>(null);
  const [stockQty, setStockQty] = useState<number>(0);
  const [stockType, setStockType] = useState<"IN" | "OUT" | "ADJUST">("IN");

  const [offersOpen, setOffersOpen] = useState(false);
  const [offersItem, setOffersItem] = useState<CatalogItem | null>(null);
  const [offers, setOffers] = useState<{ id?: string; supplierName: string; supplierSku: string; lastPriceHT?: number | null; lastAvailability?: string | null; lastCheckedAt?: string | null; supplierId?: string; ean?: string | null; favorite?: boolean }[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [linkSupplierId, setLinkSupplierId] = useState<string>("");
  const [linkSupplierSku, setLinkSupplierSku] = useState<string>("");
  const [linkEan, setLinkEan] = useState<string>("");
  const [offersLoading, setOffersLoading] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1.5);
  // Supplier catalog search
  const [supQ, setSupQ] = useState("");
  const [supOffers, setSupOffers] = useState<SupplierOffer[]>([]);
  const [supLoading, setSupLoading] = useState(false);
  const [linkTargetItemId, setLinkTargetItemId] = useState<string>("");
  // Local filters/sort for inventory list
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [sortByInv, setSortByInv] = useState<'name' | 'priceTTC' | 'stock'>('name');
  // Filters/sort for supplier offers
  const [supOnlyInStock, setSupOnlyInStock] = useState(false);
  const [supOnlyFavorite, setSupOnlyFavorite] = useState(false);
  const [supSort, setSupSort] = useState<'priceAsc' | 'priceDesc' | 'recent'>('priceAsc');
  // B2B Search Dialog
  const [b2bSearchOpen, setB2bSearchOpen] = useState(false);
  const visibleSupOffers = useMemo(() => {
    let list = [...supOffers];
    if (supOnlyInStock) list = list.filter(o => (o.lastAvailability || '').toLowerCase().includes('stock'));
    if (supOnlyFavorite) list = list.filter(o => !!(o as any).favorite);
    switch (supSort) {
      case 'priceDesc':
        list.sort((a,b) => (b.lastPriceHT ?? Number.POSITIVE_INFINITY) - (a.lastPriceHT ?? Number.POSITIVE_INFINITY));
        break;
      case 'recent':
        list.sort((a,b) => new Date(b.lastCheckedAt || 0).getTime() - new Date(a.lastCheckedAt || 0).getTime());
        break;
      case 'priceAsc':
      default:
        list.sort((a,b) => (a.lastPriceHT ?? Number.POSITIVE_INFINITY) - (b.lastPriceHT ?? Number.POSITIVE_INFINITY));
        break;
    }
    return list;
  }, [supOffers, supOnlyInStock, supOnlyFavorite, supSort]);
  useEffect(() => {
    (async () => {
      try {
        const r = await getSetting<number>('pricing.defaultMultiplier');
        if (r?.value != null && !Number.isNaN(Number(r.value))) setMultiplier(Number(r.value));
      } catch {}
    })();
  }, []);

  async function linkSupplierOffer(o: SupplierOffer) {
    try {
      if (!linkTargetItemId) throw new Error("Sélectionnez d'abord un produit");
      await upsertItemSupplierItem(linkTargetItemId, { supplierId: o.supplierId, supplierSku: o.supplierSku, ean: o.ean || undefined });
      setToast({ open: true, message: 'Référence liée au produit', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: liaison référence', severity: 'error' });
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const { items, total } = await listCatalogItems({ q, category: typeFilter || undefined, limit: 100 });
      setItems(items);
      setTotal(total);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: chargement catalogue", severity: "error" });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const lowStock = (it: CatalogItem) => it.stockQty <= (it.minStock || 0);

  const visibleItems = useMemo(() => {
    let list = [...items];
    if (onlyLowStock) list = list.filter((it) => lowStock(it));
    switch (sortByInv) {
      case 'priceTTC':
        list.sort((a,b) => (a.priceTTC ?? 0) - (b.priceTTC ?? 0));
        break;
      case 'stock':
        list.sort((a,b) => (a.stockQty ?? 0) - (b.stockQty ?? 0));
        break;
      case 'name':
      default:
        list.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
        break;
    }
    return list;
  }, [items, onlyLowStock, sortByInv]);

  function openCreate() {
    setEditing({ category: "PIECES", name: "", priceHT: 0, priceTTC: 0, vatRate: 20, active: true, stockQty: 0, minStock: 0, reorderQty: 0 });
    setEditOpen(true);
  }
  function openEdit(it: CatalogItem) {
    setEditing({ ...it });
    setEditOpen(true);
  }
  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      if ((editing as any).id) {
        await updateCatalogItem((editing as any).id, editing);
        setToast({ open: true, message: "Article mis à jour", severity: "success" });
      } else {
        await createCatalogItem(editing as any);
        setToast({ open: true, message: "Article créé", severity: "success" });
      }
      setEditOpen(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: enregistrement", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  function handleB2BAddToCatalog(result: B2BSearchResult) {
    // Pre-fill form with B2B result
    const vatRate = 20; // Default VAT rate
    const priceHT = result.priceHT || result.price / 1.20;
    const priceTTC = result.price;
    
    setEditing({
      category: "PIECES",
      name: result.name,
      priceHT,
      priceTTC,
      vatRate,
      active: true,
      stockQty: 0,
      minStock: 5,
      reorderQty: 10,
      sku: result.reference || undefined,
    });
    setEditOpen(true);
    setToast({ 
      open: true, 
      message: `Produit "${result.name}" ajouté depuis ${result.supplierName}`, 
      severity: "success" 
    });
  }

  function openStock(it: CatalogItem) {
    setStockItem(it);
    setStockType("IN");
    setStockQty(0);
    setStockOpen(true);
  }
  async function saveStock() {
    if (!stockItem) return;
    try {
      await createStockMovement(stockItem.id, { type: stockType, qty: Math.max(0, Number(stockQty || 0)), refType: "manual" });
      setToast({ open: true, message: "Mouvement enregistré", severity: "success" });
      setStockOpen(false);
      setStockItem(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: mouvement stock", severity: "error" });
    }
  }

  async function openOffers(it: CatalogItem) {
    try {
      setOffersLoading(true);
      setOffersItem(it);
      const [res, sups] = await Promise.all([
        getItemOffers(it.id),
        listSuppliers(),
      ]);
      setOffers(res.offers || []);
      setSuppliers(sups);
      setOffersOpen(true);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: chargement offres", severity: "error" });
    } finally {
      setOffersLoading(false);
    }
  }

  async function onLinkSupplier() {
    if (!offersItem) return;
    try {
      setOffersLoading(true);
      if (!linkSupplierId || !linkSupplierSku) throw new Error('Fournisseur et référence requis');
      await upsertItemSupplierItem(offersItem.id, { supplierId: linkSupplierId, supplierSku: linkSupplierSku, ean: linkEan || undefined });
      const res = await getItemOffers(offersItem.id);
      setOffers(res.offers || []);
      setLinkSupplierId(""); setLinkSupplierSku(""); setLinkEan("");
      setToast({ open: true, message: 'Référence fournisseur liée', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: liaison fournisseur', severity: 'error' });
    } finally {
      setOffersLoading(false);
    }
  }

  async function onRefreshOffers() {
    if (!offersItem) return;
    try {
      setOffersLoading(true);
      const res = await refreshItemOffers(offersItem.id);
      setOffers(res.offers || []);
      setToast({ open: true, message: 'Offres actualisées', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: actualisation offres', severity: 'error' });
    } finally {
      setOffersLoading(false);
    }
  }

  async function searchSuppliers() {
    const needle = supQ.trim();
    if (!needle) { setSupOffers([]); return; }
    try {
      setSupLoading(true);
      const res = await searchSupplierOffers({ q: needle, limit: 100 });
      setSupOffers(res.offers || []);
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: recherche fournisseurs', severity: 'error' });
    } finally {
      setSupLoading(false);
    }
  }

  return (
    <RequireAuth>
      <PageShell title="Catalogue" maxWidth="lg">
        <SectionCard title="Produits en stock" icon={<InventoryIcon color="primary" />}
          actions={
            <Stack direction="row" spacing={1}>
              <Button startIcon={<StorefrontIcon />} variant="outlined" onClick={() => setB2bSearchOpen(true)}>
                Recherche B2B
              </Button>
              <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
                Ajouter un produit
              </Button>
            </Stack>
          }>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <TextField size="small" placeholder="Rechercher (nom, SKU)" value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') refresh(); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <TextField size="small" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} sx={{ minWidth: 180 }}>
              <option value="">Tous</option>
              <option value="PIECES">Pièces</option>
              <option value="EQUIPEMENTS">Équipements</option>
              <option value="AUTRES">Autres</option>
            </TextField>
            <Button variant="outlined" onClick={refresh}>Rechercher</Button>
            <Chip label="Sous seuil" color={onlyLowStock ? 'warning' : 'default'} variant={onlyLowStock ? 'filled' : 'outlined'} onClick={() => setOnlyLowStock(v => !v)} />
            <TextField size="small" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Trier par" value={sortByInv} onChange={(e) => setSortByInv(e.target.value as any)} sx={{ minWidth: 160 }}>
              <option value="name">Nom</option>
              <option value="priceTTC">Prix</option>
              <option value="stock">Stock</option>
            </TextField>
          </Stack>

          {loading && <LinearProgress sx={{ mb: 1 }} />}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Catégorie</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Seuil</TableCell>
                  <TableCell align="right">Prix TTC</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <>
                    {[0,1,2,3,4].map((i) => (
                      <TableRow key={`s-${i}`}>
                        <TableCell><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                        <TableCell align="center"><Typography variant="body2" color="text.disabled"><>{'\u00A0'}</></Typography></TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
                {visibleItems.map((it) => (
                  <TableRow key={it.id} hover>
                    <TableCell>{it.sku || '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2">{it.name}</Typography>
                        {lowStock(it) && <Chip label="Sous seuil" size="small" color="warning" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{labelCategory((it as any).category as any)}</TableCell>
                    <TableCell align="right">{it.stockQty}</TableCell>
                    <TableCell align="right">{it.minStock}</TableCell>
                    <TableCell align="right">{it.priceTTC.toFixed(2)} €</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="Éditer"><IconButton size="small" onClick={() => openEdit(it)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Ajuster stock"><IconButton size="small" onClick={() => openStock(it)}><WarehouseIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Comparer fournisseurs"><IconButton size="small" onClick={() => openOffers(it)}><CompareArrowsIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {!items.length && !loading && (
                  <TableRow><TableCell colSpan={7}><Typography align="center" color="text.secondary">Aucun article</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        {/* Supplier Catalog Search / Comparison */}
        <SectionCard title="Catalogue fournisseurs" icon={<CompareArrowsIcon color="primary" />}
          actions={<Button variant="outlined" onClick={searchSuppliers} disabled={supLoading}>Rechercher</Button>}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
            <TextField size="small" placeholder="Rechercher par SKU ou EAN" value={supQ} onChange={(e) => setSupQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') searchSuppliers(); }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ flex: 1 }}
            />
            <TextField size="small" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Produit cible" value={linkTargetItemId} onChange={(e) => setLinkTargetItemId(e.target.value)} sx={{ minWidth: 240 }}>
              <option value="">— Choisir un produit —</option>
              {items.map(it => (
                <option key={it.id} value={it.id}>{it.sku ? `${it.sku} — ` : ''}{it.name}</option>
              ))}
            </TextField>
            <Chip label="En stock" color={supOnlyInStock ? 'success' : 'default'} variant={supOnlyInStock ? 'filled' : 'outlined'} onClick={() => setSupOnlyInStock(v => !v)} />
            <Chip label="Favoris" color={supOnlyFavorite ? 'primary' : 'default'} variant={supOnlyFavorite ? 'filled' : 'outlined'} onClick={() => setSupOnlyFavorite(v => !v)} />
            <TextField size="small" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Tri offres" value={supSort} onChange={(e) => setSupSort(e.target.value as any)} sx={{ minWidth: 160 }}>
              <option value="priceAsc">Prix croissant</option>
              <option value="priceDesc">Prix décroissant</option>
              <option value="recent">Plus récent</option>
            </TextField>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fournisseur</TableCell>
                  <TableCell>Réf. fournisseur</TableCell>
                  <TableCell>EAN</TableCell>
                  <TableCell align="right">Prix HT</TableCell>
                  <TableCell>Dispo</TableCell>
                  <TableCell>Maj</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleSupOffers.map((o, i) => (
                  <TableRow key={`${o.supplierId}-${o.supplierSku}-${i}`} hover>
                    <TableCell>{o.supplierName}</TableCell>
                    <TableCell>{o.supplierSku}</TableCell>
                    <TableCell>{o.ean || '—'}</TableCell>
                    <TableCell align="right">{o.lastPriceHT != null ? `${o.lastPriceHT.toFixed(2)} €` : '—'}</TableCell>
                    <TableCell>{o.lastAvailability || '—'}</TableCell>
                    <TableCell>{o.lastCheckedAt ? new Date(o.lastCheckedAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" variant="outlined" disabled={!linkTargetItemId} onClick={() => linkSupplierOffer(o)}>Lier au produit</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!supOffers.length && !supLoading && (
                  <TableRow><TableCell colSpan={7}><Typography align="center" color="text.secondary">Aucun résultat</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        {/* Dialog Create/Edit */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{(editing as any)?.id ? 'Modifier le produit' : 'Ajouter un produit'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" label="SKU" value={editing?.sku || ''} onChange={(e) => setEditing({ ...(editing as any), sku: e.target.value })} />
              <TextField size="small" label="Nom" value={editing?.name || ''} onChange={(e) => setEditing({ ...(editing as any), name: e.target.value })} />
              <TextField size="small" label="Type de produit" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} value={editing?.category || 'PIECES'} onChange={(e) => setEditing({ ...(editing as any), category: e.target.value })}>
                <option value="PIECES">Pièces</option>
                <option value="EQUIPEMENTS">Équipements</option>
                <option value="AUTRES">Autres</option>
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField size="small" label="Prix HT" type="number" value={editing?.priceHT ?? 0} onChange={(e) => setEditing({ ...(editing as any), priceHT: Number(e.target.value) })} />
                <TextField size="small" label="Prix TTC" type="number" value={editing?.priceTTC ?? 0} onChange={(e) => setEditing({ ...(editing as any), priceTTC: Number(e.target.value) })} />
                <TextField size="small" label="TVA (%)" type="number" value={editing?.vatRate ?? 20} onChange={(e) => setEditing({ ...(editing as any), vatRate: Number(e.target.value) })} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField size="small" label="Stock min" type="number" value={editing?.minStock ?? 0} onChange={(e) => setEditing({ ...(editing as any), minStock: Number(e.target.value) })} />
                <TextField size="small" label="Qté de réappro" type="number" value={editing?.reorderQty ?? 0} onChange={(e) => setEditing({ ...(editing as any), reorderQty: Number(e.target.value) })} />
                <TextField size="small" label="Emplacement" value={editing?.location || ''} onChange={(e) => setEditing({ ...(editing as any), location: e.target.value })} />
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={saveEdit} disabled={saving}>{(editing as any)?.id ? 'Enregistrer' : 'Créer'}</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Stock */}
        <Dialog open={stockOpen} onClose={() => setStockOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Ajuster stock — {stockItem?.name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField size="small" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} label="Type" value={stockType} onChange={(e) => setStockType(e.target.value as any)}>
                <option value="IN">Entrée (IN)</option>
                <option value="OUT">Sortie (OUT)</option>
                <option value="ADJUST">Ajuster (valeur absolue)</option>
              </TextField>
              <TextField size="small" label={stockType === 'ADJUST' ? 'Nouveau stock' : 'Quantité'} type="number" value={stockQty} onChange={(e) => setStockQty(Number(e.target.value))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStockOpen(false)}>Annuler</Button>
            <Button variant="contained" onClick={saveStock}>Valider</Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Offers */}
        <Dialog open={offersOpen} onClose={() => setOffersOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Comparaison fournisseurs — {offersItem?.name}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {offersLoading && <LinearProgress />}
              {/* Best offer summary */}
              {!!offers.length && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ color: 'text.secondary' }}>
                  {(() => {
                    const priced = offers.filter(o => typeof o.lastPriceHT === 'number') as Array<typeof offers[number] & { lastPriceHT: number }>;
                    if (!priced.length) return null;
                    const best = priced.reduce((min, o) => (o.lastPriceHT < min.lastPriceHT ? o : min), priced[0]);
                    return (
                      <Typography variant="body2">
                        Meilleur prix: <b>{best.lastPriceHT.toFixed(2)} €</b> ({best.supplierName} · {best.supplierSku})
                      </Typography>
                    );
                  })()}
                </Stack>
              )}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                <TextField size="small" label="Fournisseur" select SelectProps={{ native: true }} InputLabelProps={{ shrink: true }} value={linkSupplierId} onChange={(e) => setLinkSupplierId(e.target.value)} sx={{ minWidth: 220 }}>
                  <option value="">— Choisir —</option>
                  {suppliers.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </TextField>
                <TextField size="small" label="Réf. fournisseur" value={linkSupplierSku} onChange={(e) => setLinkSupplierSku(e.target.value)} sx={{ minWidth: 200 }} />
                <TextField size="small" label="EAN (optionnel)" value={linkEan} onChange={(e) => setLinkEan(e.target.value)} sx={{ minWidth: 200 }} />
                <Button variant="outlined" onClick={onLinkSupplier} disabled={offersLoading}>Lier</Button>
                <Button variant="contained" onClick={onRefreshOffers} disabled={offersLoading}>Actualiser offres (mock)</Button>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
                <TextField size="small" label="Multiplicateur PV (ex: 1.5)" type="number" inputProps={{ step: '0.1' }} value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))} sx={{ maxWidth: 220 }} />
                {offersItem && <Typography variant="body2" color="text.secondary">TVA: {Math.round((offersItem.vatRate || 0) * 100)}%</Typography>}
                <Button size="small" variant="outlined" disabled={offersLoading} onClick={async () => {
                  try {
                    await setSetting('pricing.defaultMultiplier', multiplier);
                    setToast({ open: true, message: 'Multiplicateur par défaut enregistré', severity: 'success' });
                  } catch (e) {
                    console.error(e);
                    setToast({ open: true, message: 'Erreur: enregistrement multiplicateur', severity: 'error' });
                  }
                }}>Enregistrer par défaut</Button>
              </Stack>
              <Stack spacing={1}>
                {!offers.length && <Typography color="text.secondary">Aucune offre enregistrée. Associez une référence fournisseur pour commencer.</Typography>}
                {(() => {
                  const priced = offers.filter(x => typeof x.lastPriceHT === 'number') as Array<typeof offers[number] & { lastPriceHT: number }>;
                  const bestId = priced.length ? priced.reduce((min, x) => (x.lastPriceHT < min.lastPriceHT ? x : min), priced[0]).id : undefined;
                  return offers.map((o, i) => (
                    <Paper key={o.id || i} variant="outlined" sx={{ p: 1, borderColor: (o.id && o.id === bestId) ? 'success.light' : 'divider' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                        <Typography variant="body2">
                          <strong>{o.supplierName}</strong> — {o.supplierSku} {o.ean ? `— EAN ${o.ean}` : ''}
                          {(o.id && o.id === bestId) && <Chip size="small" color="success" label="Meilleur prix" sx={{ ml: 1 }} />}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body2">Prix HT: {o.lastPriceHT != null ? `${o.lastPriceHT.toFixed(2)} €` : '—'}</Typography>
                          <Typography variant="body2" sx={{ color: o.lastAvailability?.toLowerCase().includes('stock') ? 'success.main' : 'text.primary' }}>Dispo: {o.lastAvailability ?? '—'}</Typography>
                          {o.lastCheckedAt && <Typography variant="caption" color="text.secondary">Maj: {new Date(o.lastCheckedAt).toLocaleDateString()}</Typography>}
                          <Button size="small" variant="outlined" disabled={offersLoading || !offersItem || o.lastPriceHT == null} onClick={async () => {
                          if (!offersItem || o.lastPriceHT == null) return;
                          try {
                            setOffersLoading(true);
                            const purchase = o.lastPriceHT;
                            const sellHT = Math.round(purchase * multiplier * 100) / 100;
                            const vat = offersItem.vatRate || 0;
                            const sellTTC = Math.round(sellHT * (1 + vat) * 100) / 100;
                            await updateCatalogItem(offersItem.id, { purchasePriceHT: purchase, priceHT: sellHT, priceTTC: sellTTC });
                            setToast({ open: true, message: 'Tarifs appliqués à l\'article', severity: 'success' });
                            // Reflect in local state for header/list without full refresh
                            setItems(items => items.map(it => it.id === offersItem.id ? { ...it, priceHT: sellHT, priceTTC: sellTTC, purchasePriceHT: purchase } : it));
                          } catch (e) {
                            console.error(e);
                            setToast({ open: true, message: 'Erreur: application tarifs', severity: 'error' });
                          } finally {
                            setOffersLoading(false);
                          }
                        }}>Appliquer tarifs</Button>
                          <Button size="small" variant={o.favorite ? 'contained' : 'outlined'} disabled={offersLoading} onClick={async () => {
                          if (!offersItem || !o.id) return;
                          try {
                            setOffersLoading(true);
                            const res = await fetch(`/api/catalog/items/${offersItem.id}/supplier-items`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, favorite: true }) });
                            if (!res.ok) throw new Error('favorite_failed');
                            const next = await getItemOffers(offersItem.id);
                            setOffers(next.offers || []);
                            setToast({ open: true, message: 'Fournisseur favori défini', severity: 'success' });
                          } catch (e) {
                            console.error(e);
                            setToast({ open: true, message: 'Erreur: favori', severity: 'error' });
                          } finally {
                            setOffersLoading(false);
                          }
                        }}>{o.favorite ? 'Favori' : 'Définir favori'}</Button>
                          <Button size="small" color="error" disabled={offersLoading} onClick={async () => {
                          if (!offersItem || !o.id) return;
                          const ok = window.confirm(`Supprimer la référence fournisseur ${o.supplierSku} ?`);
                          if (!ok) return;
                          try {
                            setOffersLoading(true);
                            const url = new URL(window.location.origin + `/api/catalog/items/${offersItem.id}/supplier-items?linkId=${o.id}`);
                            const res = await fetch(url, { method: 'DELETE' });
                            if (!res.ok) throw new Error('delete_failed');
                            const next = await getItemOffers(offersItem.id);
                            // Reinject link ids by refetching supplier-items list if needed
                            const siRes = await fetch(`/api/catalog/items/${offersItem.id}/supplier-items`);
                            const si = await siRes.json().catch(() => []);
                            const offersWithIds = (next.offers || []).map((of: any) => {
                              const match = (si || []).find((x: any) => x.supplierId === of.supplierId && x.supplierSku === of.supplierSku);
                              return { ...of, id: match?.id };
                            });
                            setOffers(offersWithIds);
                            setToast({ open: true, message: 'Référence supprimée', severity: 'success' });
                          } catch (e) {
                            console.error(e);
                            setToast({ open: true, message: 'Erreur: suppression référence', severity: 'error' });
                          } finally {
                            setOffersLoading(false);
                          }
                        }}>Supprimer</Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  ));
                })()}
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOffersOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>

        {/* B2B Search Dialog */}
        <B2BSearchDialog
          open={b2bSearchOpen}
          onClose={() => setB2bSearchOpen(false)}
          onAddToCatalog={handleB2BAddToCatalog}
        />

        <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </PageShell>
    </RequireAuth>
  );
}
