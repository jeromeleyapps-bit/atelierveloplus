"use client";
/**
 * Page Catalogue Refonte Complète
 * - Onglet 1: Mon Stock (tuiles)
 * - Onglet 2: Catalogue Fournisseurs (tableau)
 * - Onglet 3: Recherche Globale
 */


import { useRouter } from "next/navigation";
// ✅ Hooks personnalisés
import { useCatalogData } from '@/hooks/useCatalogData';
import { useCatalogUI } from '@/hooks/useCatalogUI';
import { useCatalogMutations } from '@/hooks/useCatalogMutations';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import InventoryIcon from "@mui/icons-material/Inventory";
import StorefrontIcon from "@mui/icons-material/Storefront";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RequireAuth from "@/app/components/RequireAuth";
import MyStockTab from "@/components/catalog/MyStockTab";
import SuppliersTab from "@/components/catalog/SuppliersTab";

import BikesTab from "@/components/catalog/BikesTab";
import SupplierCatalogTableView from "@/components/catalog/SupplierCatalogTableView";
import AddToStockDialog, { type AddToStockData } from "@/components/catalog/AddToStockDialog";
import type { SupplierOffer } from '@/components/catalog/SuppliersTab';
import { createCatalogItem, updateCatalogItem, type CatalogItem } from "@/lib/api";
import B2BSearchDialog from "@/components/B2BSearchDialog";
import CategoryIcon from "@mui/icons-material/Category";
import RefreshIcon from "@mui/icons-material/Refresh";
import WarehouseIcon from "@mui/icons-material/Warehouse";


export default function CatalogNewPage() {
  const router = useRouter();
  
  // ✅ Hooks personnalisés
  const catalogData = useCatalogData();
  const catalogUI = useCatalogUI();
  const catalogMutations = useCatalogMutations({
    onSuccess: catalogUI.showToast,
    onError: catalogUI.showToast,
  });

  // Alias locaux pour compatibilité code existant
  const tab = catalogUI.tab;
  const setTab = catalogUI.setTab;
  const catalogItems = catalogData.catalogItems;
  const supplierOffers = catalogData.supplierOffers;
  const loading = catalogData.isLoading;
  const toast = catalogUI.toast;
  const setToast = catalogUI.setToast;
  const addToStockDialog = catalogUI.addToStockDialog;
  const setAddToStockDialog = catalogUI.setAddToStockDialog;
  const selectedOffer = catalogUI.selectedOffer;
  const setSelectedOffer = catalogUI.setSelectedOffer;
  const editItem = catalogUI.editItem;
  const setEditItem = catalogUI.setEditItem;
  const stockDialog = catalogUI.stockDialog;
  const setStockDialog = catalogUI.setStockDialog;
  const b2bSearchOpen = catalogUI.b2bSearchOpen;
  const setB2bSearchOpen = catalogUI.setB2bSearchOpen;
  const createDialog = catalogUI.createDialog;
  const setCreateDialog = catalogUI.setCreateDialog;
  const newItem = catalogUI.newItem;
  const setNewItem = catalogUI.setNewItem;
  const saving = catalogUI.saving;
  const setSaving = catalogUI.setSaving;
  const importing = catalogUI.importing;
  const setImporting = catalogUI.setImporting;

  // Fonctions wrappées pour compatibilité
  const loadCatalogItems = () => catalogData.refetchCatalog();
  const loadSupplierOffers = () => catalogData.refetchOffers();
  const _setCatalogItems = (_items: CatalogItem[]) => {}; // Plus nécessaire (géré par cache)
  const _setSupplierOffers = (_offers: SupplierOffer[]) => {}; // Plus nécessaire (géré par cache)

  // Thème marron pour catalogue (harmonisé avec catalog/page.tsx)
  const theme = {
    bg: '#F5F5DC',
    border: '#8b7355',
    text: '#5d4037',
    primary: '#8b7355',
    primaryDark: '#6d5d4b',
    primaryLight: '#F5F5DC',
  };

  async function handleDeleteItem(item: CatalogItem) {
    // ✅ Utiliser le hook de mutations pour bénéficier de l'invalidation automatique
    catalogMutations.remove(item.id);
  }

  async function purgeCatalog(scope: 'stock' | 'supplier') {
    const message = scope === 'stock' 
      ? "⚠️ ATTENTION: Vider TOUT Mon Stock?\n\nCela supprimera TOUS les produits, même ceux utilisés dans des factures!\n\nContinuer?" 
      : "⚠️ ATTENTION: Vider TOUT le Catalogue Fournisseur?\n\nCela supprimera TOUS les produits P2R, même ceux utilisés dans des factures!\n\nContinuer?";
    
    if (!confirm(message)) return;
    
    // Double confirmation pour éviter erreurs
    if (!confirm("Êtes-vous VRAIMENT sûr? Cette action est IRRÉVERSIBLE!")) return;
    
    const res = await fetch(`/api/catalog/items?scope=${scope}&force=true`, { method: 'DELETE' });
    const j = await res.json();
    if (res.ok) {
      setToast({ open: true, message: `✅ ${j.deleted || 0} produits supprimés`, severity: "success" });
      // Invalider cache et recharger
      catalogData.refetchCatalog();
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } else {
      setToast({ open: true, message: j.message || "Erreur purge", severity: "error" });
    }
  }

  async function deleteOffer(id: string) {
    const res = await fetch(`/api/suppliers/offers/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setToast({ open: true, message: "Offre supprimée", severity: "success" });
      await loadSupplierOffers();
    }
  }

  async function purgeOffers(supplierId?: string) {
    if (!confirm(supplierId ? "Vider les offres de ce fournisseur ?" : "Vider toutes les offres ?")) return;
    const url = supplierId ? `/api/suppliers/offers?supplierId=${encodeURIComponent(supplierId)}` : `/api/suppliers/offers`;
    const res = await fetch(url, { method: 'DELETE' });
    const j = await res.json();
    if (res.ok) {
      setToast({ open: true, message: `Offres supprimées: ${j.deleted || 0}`, severity: "success" });
      await loadSupplierOffers();
    } else {
      setToast({ open: true, message: j.message || "Erreur purge offres", severity: "error" });
    }
  }

  // loadSupplierOffers maintenant géré par hook useCatalogData

  function handleAddToStock(offer: SupplierOffer) {
    setSelectedOffer(offer);
    setAddToStockDialog(true);
  }

  async function handleConfirmAddToStock(data: AddToStockData) {
    try {
      const _newItem = await createCatalogItem({
        sku: data.sku,
        name: data.name,
        category: data.category,
        priceHT: data.priceHT,
        priceTTC: data.priceTTC,
        vatRate: data.vatRate,
        stockQty: data.stockQty,
        minStock: data.minStock,
        active: true,
        reorderQty: 0,
      });
      
      setToast({ open: true, message: `✅ ${data.name} ajouté au stock avec succès`, severity: "success" });
      
      // Recharger la liste
      await loadCatalogItems();
      
      // Marquer l'offre comme déjà au catalogue - Plus nécessaire (géré par cache)
      // setSupplierOffers(prev => prev.map(offer => 
      //   offer.id === selectedOffer?.id 
      //     ? { ...offer, inOurCatalog: true }
      //     : offer
      // ));
      
      setAddToStockDialog(false);
      setSelectedOffer(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Impossible d'ajouter au stock";
      setToast({ open: true, message: `Erreur: ${errorMessage}`, severity: "error" });
    }
  }

  function handleEditStock(item: CatalogItem) {
    setEditItem(item);
    setStockDialog(true); // Réutilise le dialog stock pour édition complète
  }

  function handleManageStock(item: CatalogItem) {
    setEditItem(item);
    setStockDialog(true);
  }

  async function handleAdoptFromSupplier(item: CatalogItem) {
    if (!confirm(`Adopter "${item.name}" dans VOTRE stock?\n\nCela retirera le flag fournisseur et l'article deviendra vôtre.`)) {
      return;
    }

    try {
      await updateCatalogItem(item.id, {
        supplierName: null, // Retirer flag fournisseur pour le faire devenir "MON STOCK"
      });
      setToast({ open: true, message: `✅ "${item.name}" adopté dans MON STOCK!`, severity: "success" });
      await loadCatalogItems();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Impossible d'adopter";
      setToast({ open: true, message: `Erreur: ${errorMessage}`, severity: "error" });
    }
  }

  function handleAddToTicket(item: CatalogItem) {
    // Rediriger vers création ticket avec pré-sélection de la pièce
    router.push(`/tickets?action=new&itemId=${item.id}&itemName=${encodeURIComponent(item.name)}`);
  }

  function handleOrderSupplier(offer: SupplierOffer) {
    // Feature bon de commande à développer
    setToast({ 
      open: true, 
      message: `📋 Commande "${offer.name}" chez ${offer.supplierName} - Feature à venir (Q1 2026)`, 
      severity: "success" // Type toast ne supporte que success/error
    });
  }

  async function handleImportScanner(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Récupérer le token JWT
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch("/api/catalog/scan-bulk", {
        method: "POST",
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {},
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setToast({
          open: true,
          message: result.message || `Import scanner réussi : ${result.updated} mis à jour, ${result.created} créés`,
          severity: "success"
        });
        await loadCatalogItems();
      } else {
        setToast({
          open: true,
          message: result.message || "Erreur lors de l'import scanner",
          severity: "error"
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
      setToast({
        open: true,
        message: `Erreur: ${errorMessage}`,
        severity: "error"
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function handleImportCSVAuto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // NE PAS lire le fichier côté client (trop lourd!)
    // Le serveur streaming le lira progressivement
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    
    const confirmImport = confirm(
      `Import automatique du fichier ${file.name}\n` +
      `Taille: ${fileSizeMB} MB\n\n` +
      `La route streaming traitera tout le fichier.\n` +
      `Cela peut prendre 2-3 minutes.\n\n` +
      `Continuer ?`
    );
    
    if (!confirmImport) {
      event.target.value = "";
      return;
    }

    setImporting(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplierName", "Fournisseur");
      formData.append("margin", "1.5");

      const response = await fetch("/api/catalog/import/supplier-csv-stream", {
        method: "POST",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erreur import");
      }

      const result = await response.json();
      
      setToast({
        open: true,
        message: `✅ Import terminé : ${result.created} créés, ${result.updated} mis à jour, ${result.errors} erreurs`,
        severity: "success"
      });
      
      // Forcer rechargement complet
      catalogData.refetchCatalog();
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
      setToast({
        open: true,
        message: `Erreur: ${errorMessage}`,
        severity: "error"
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  async function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setToast({
        open: true,
        message: "Aucun fichier sélectionné",
        severity: "error"
      });
      return;
    }

    // Avertir si fichier volumineux
    if (file.size > 1024 * 1024) { // > 1MB
      const confirmImport = confirm(
        `Ce fichier est volumineux (${(file.size / 1024 / 1024).toFixed(2)} MB).\n` +
        `L'import peut prendre plusieurs minutes.\n\n` +
        `Continuer ?`
      );
      if (!confirmImport) {
        event.target.value = "";
        return;
      }
    }
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("supplierName", "Fournisseur");
      formData.append("margin", "1.5");

      // Récupérer le token JWT
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      
      const response = await fetch("/api/catalog/import/supplier-csv-stream", {
        method: "POST",
        headers: token ? {
          "Authorization": `Bearer ${token}`
        } : {},
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setToast({
          open: true,
          message: result.message || `Import réussi : ${result.created} créés, ${result.updated} mis à jour`,
          severity: "success"
        });
        await loadCatalogItems();
      } else {
        setToast({
          open: true,
          message: result.message || "Erreur lors de l'import",
          severity: "error"
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
      setToast({
        open: true,
        message: `Erreur: ${errorMessage}`,
        severity: "error"
      });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  }

  function handleCreateNew() {
    setNewItem({
      category: "PIECES",
      name: "",
      sku: "",
      priceHT: 0,
      priceTTC: 0,
      vatRate: 20,
      stockQty: 0,
      minStock: 5,
      active: true,
    });
    setCreateDialog(true);
  }

  async function handleSaveNewItem() {
    if (!newItem.name) {
      setToast({ open: true, message: "Le nom est requis", severity: "error" });
      return;
    }

    setSaving(true);
    try {
      const _created = await createCatalogItem({
        category: newItem.category || "PIECES",
        name: newItem.name,
        sku: newItem.sku || undefined,
        priceHT: newItem.priceHT || 0,
        priceTTC: newItem.priceTTC || 0,
        vatRate: newItem.vatRate || 20,
        stockQty: newItem.stockQty || 0,
        minStock: newItem.minStock || 0,
        reorderQty: 0,
        active: newItem.active !== false,
      });

      setToast({ open: true, message: `✅ ${newItem.name} créé avec succès`, severity: "success" });
      setCreateDialog(false);
      
      // Recharger la liste
      await loadCatalogItems();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Impossible de créer la pièce";
      setToast({ open: true, message: `Erreur: ${errorMessage}`, severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <RequireAuth>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        {/* Bannière Colorée Marron */}
        <Box
          sx={{
            bgcolor: theme.bg,
            borderBottom: 2,
            borderColor: theme.border,
            py: 3,
            mb: 3,
          }}
        >
          <Container maxWidth="xl">
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} flexWrap="wrap">
              <Stack direction="row" alignItems="center" spacing={2}>
                <CategoryIcon sx={{ fontSize: 40, color: theme.text }} />
                <Box>
                  <Typography variant="h4" fontWeight={700} sx={{ color: theme.text }}>
                    📦 Catalogue
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gestion des produits et du stock
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => router.push('/catalog')}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Retour au Catalogue
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadCatalogItems()}
                  disabled={loading}
                  sx={{
                    borderColor: theme.border,
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
                  variant="outlined"
                  startIcon={<StorefrontIcon />}
                  onClick={() => setB2bSearchOpen(true)}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Recherche B2B
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WarehouseIcon />}
                  onClick={() => window.location.href = '/suppliers'}
                  sx={{
                    borderColor: theme.border,
                    color: theme.text,
                    '&:hover': {
                      borderColor: theme.primaryDark,
                      bgcolor: theme.primaryLight,
                    },
                  }}
                >
                  Mes Fournisseurs
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pb: 3 }}>
          {/* Onglets */}
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={tab}
              onChange={(_, newValue) => setTab(newValue)}
              sx={{ borderBottom: 1, borderColor: "divider" }}
            >
              <Tab
                icon={<InventoryIcon />}
                label={`Mon Stock (${catalogItems.filter(i => !i.supplierName).length})`}
                iconPosition="start"
              />
              <Tab
                icon={<StorefrontIcon />}
                label={`Catalogue Fournisseur (${catalogItems.filter(i => i.supplierName).length})`}
                iconPosition="start"
              />
              <Tab
                icon={<StorefrontIcon />}
                label={`Mes Offres B2B (${supplierOffers.length})`}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Actions Contextuelles */}
          <Stack direction="row" spacing={2} mb={3}>
            {tab === 0 && (
              <>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                  sx={{
                    bgcolor: theme.primary,
                    '&:hover': { bgcolor: theme.primaryDark }
                  }}
                >
                  Nouvelle Pièce
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  component="label"
                  disabled={importing}
                >
                  {importing ? "Import en cours..." : "Import Stock (CSV Scanner)"}
                  <input 
                    type="file" 
                    hidden 
                    accept=".csv"
                    onChange={handleImportScanner}
                  />
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => purgeCatalog('stock')}
                >
                  Vider Mon stock
                </Button>
              </>
            )}
            {tab === 1 && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  component="label"
                  disabled={importing}
                >
                  {importing ? "Import en cours..." : "Import CSV Fournisseur"}
                  <input 
                    type="file" 
                    hidden 
                    accept=".csv"
                    onChange={handleImportCSV}
                  />
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  component="label"
                  disabled={importing}
                  sx={{
                    bgcolor: theme.primary,
                    '&:hover': { bgcolor: theme.primaryDark }
                  }}
                >
                  {importing ? "Import automatique..." : "Import Complet Auto"}
                  <input 
                    type="file" 
                    hidden 
                    accept=".csv"
                    onChange={handleImportCSVAuto}
                  />
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => purgeCatalog('supplier')}
                >
                  Vider Catalogue fournisseur
                </Button>
              </Stack>
            )}
            {tab === 2 && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadSupplierOffers()}
                  disabled={loading}
                >
                  Actualiser Offres
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => purgeOffers()}
                >
                  Vider Offres B2B
                </Button>
              </Stack>
            )}
          </Stack>

          {/* Contenu selon onglet */}
          {tab === 0 && (
            <MyStockTab
              items={catalogItems.filter(i => !i.supplierName)}
              loading={loading}
              onEdit={handleEditStock}
              onStock={handleManageStock}
              onAddToTicket={handleAddToTicket}
              onDelete={handleDeleteItem}
            />
          )}

          {tab === 1 && (
            <SupplierCatalogTableView
              items={catalogItems.filter(i => i.supplierName)}
              loading={loading}
              onEdit={handleEditStock}
              onStock={handleManageStock}
              onDelete={handleDeleteItem}
              onAdopt={handleAdoptFromSupplier}
            />
          )}

          {tab === 2 && (
            <>
              {/* Bannière Explicative B2B */}
              <Paper 
                sx={{ 
                  p: 3, 
                  mb: 3, 
                  bgcolor: '#e3f2fd',
                  borderLeft: 4,
                  borderColor: '#1976d2'
                }}
              >
                <Stack spacing={1.5}>
                  <Typography variant="h6" sx={{ color: '#1565c0', fontWeight: 600 }}>
                    🤝 Mes Offres B2B - Partagez Votre Catalogue aux Professionnels
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#424242' }}>
                    <strong>Objectif:</strong> Partagez votre catalogue de pièces détachées avec vos partenaires professionnels 
                    (ateliers, revendeurs, collectivités) pour leur permettre de commander directement chez vous.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#616161' }}>
                    💡 <strong>Comment ça marche?</strong> Vos produits en stock sont automatiquement disponibles dans votre catalogue B2B. 
                    Vos partenaires pros peuvent consulter vos tarifs professionnels, vérifier la disponibilité en temps réel, 
                    et passer commande en quelques clics.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#616161' }}>
                    📦 <strong>Avantages:</strong> Augmentez vos ventes B2B, fidélisez vos clients professionnels, 
                    et automatisez la gestion de vos commandes grossistes.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#616161', fontStyle: 'italic' }}>
                    📌 <strong>Astuce:</strong> Définissez des tarifs spécifiques pour vos clients B2B (remises volume, prix nets) 
                    et gérez facilement vos conditions commerciales par partenaire.
                  </Typography>
                </Stack>
              </Paper>

              <SuppliersTab
                offers={supplierOffers}
                loading={loading}
                onAddToStock={handleAddToStock}
                onOrder={handleOrderSupplier}
                onDeleteOffer={(o) => deleteOffer(o.id)}
                onPurgeOffers={(supplierId) => purgeOffers(supplierId)}
              />
            </>
          )}

          {tab === 3 && (
            <BikesTab theme={theme} />
          )}

        </Container>

        {/* Dialogs */}
        <AddToStockDialog
          open={addToStockDialog}
          offer={selectedOffer}
          onClose={() => setAddToStockDialog(false)}
          onConfirm={handleConfirmAddToStock}
        />

        {/* Toast */}
        <Snackbar
          open={toast.open}
          autoHideDuration={4000}
          onClose={() => setToast({ ...toast, open: false })}
        >
          <Alert severity={toast.severity}>{toast.message}</Alert>
        </Snackbar>

        {/* Dialog Recherche B2B */}
        <B2BSearchDialog
          open={b2bSearchOpen}
          onClose={() => setB2bSearchOpen(false)}
          onAddToCatalog={(result) => {
            setToast({ open: true, message: `${result.name} ajouté au catalogue`, severity: "success" });
            loadCatalogItems();
          }}
        />

        {/* Dialog Création Pièce */}
        <Dialog
          open={createDialog}
          onClose={() => setCreateDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: theme.primaryLight, color: theme.text }}>
            ✨ Créer une nouvelle pièce
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={newItem.category || "PIECES"}
                  label="Catégorie"
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  <MenuItem value="PIECES">Pièces</MenuItem>
                  <MenuItem value="EQUIPEMENTS">Équipements</MenuItem>
                  <MenuItem value="AUTRES">Autres</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Nom *"
                value={newItem.name || ""}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                fullWidth
                required
              />

              <TextField
                label="SKU / Référence"
                value={newItem.sku || ""}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                fullWidth
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Prix HT"
                  type="number"
                  value={newItem.priceHT || 0}
                  onChange={(e) => {
                    const priceHT = parseFloat(e.target.value) || 0;
                    const vatRate = newItem.vatRate || 20;
                    const priceTTC = priceHT * (1 + vatRate / 100);
                    setNewItem({ ...newItem, priceHT, priceTTC });
                  }}
                  fullWidth
                  InputProps={{
                    endAdornment: <Typography variant="caption">€</Typography>,
                  }}
                />
                <TextField
                  label="TVA"
                  type="number"
                  value={newItem.vatRate || 20}
                  onChange={(e) => {
                    const vatRate = parseFloat(e.target.value) || 20;
                    const priceHT = newItem.priceHT || 0;
                    const priceTTC = priceHT * (1 + vatRate / 100);
                    setNewItem({ ...newItem, vatRate, priceTTC });
                  }}
                  sx={{ width: 100 }}
                  InputProps={{
                    endAdornment: <Typography variant="caption">%</Typography>,
                  }}
                />
                <TextField
                  label="Prix TTC"
                  type="number"
                  value={newItem.priceTTC || 0}
                  onChange={(e) => {
                    const priceTTC = parseFloat(e.target.value) || 0;
                    const vatRate = newItem.vatRate || 20;
                    const priceHT = priceTTC / (1 + vatRate / 100);
                    setNewItem({ ...newItem, priceTTC, priceHT });
                  }}
                  fullWidth
                  InputProps={{
                    endAdornment: <Typography variant="caption">€</Typography>,
                  }}
                />
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Stock initial"
                  type="number"
                  value={newItem.stockQty || 0}
                  onChange={(e) => setNewItem({ ...newItem, stockQty: parseInt(e.target.value) || 0 })}
                  fullWidth
                />
                <TextField
                  label="Stock minimum"
                  type="number"
                  value={newItem.minStock || 5}
                  onChange={(e) => setNewItem({ ...newItem, minStock: parseInt(e.target.value) || 0 })}
                  fullWidth
                />
              </Stack>

              <Box>
                <Chip
                  label={`Prix TTC: ${(newItem.priceTTC || 0).toFixed(2)}€`}
                  color="primary"
                  sx={{ mr: 1 }}
                />
                <Chip
                  label={`Prix HT: ${(newItem.priceHT || 0).toFixed(2)}€`}
                  variant="outlined"
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveNewItem}
              variant="contained"
              disabled={!newItem.name || saving}
              sx={{
                bgcolor: theme.primary,
                '&:hover': { bgcolor: theme.primaryDark },
              }}
            >
              {saving ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Gestion Stock */}
        <Dialog 
          open={stockDialog} 
          onClose={() => setStockDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            Gérer le stock
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>{editItem?.name}</strong>
              </Typography>
              
              <TextField
                label="Stock actuel"
                type="number"
                value={editItem?.stockQty || 0}
                disabled
                fullWidth
              />
              
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value="adjust"
                  label="Action"
                >
                  <MenuItem value="adjust">Ajuster le stock</MenuItem>
                  <MenuItem value="in">Entrée (+)</MenuItem>
                  <MenuItem value="out">Sortie (-)</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Nouveau stock"
                type="number"
                defaultValue={editItem?.stockQty || 0}
                fullWidth
                autoFocus
                inputProps={{ min: 0 }}
                onChange={(e) => {
                  if (editItem) {
                    setEditItem({
                      ...editItem,
                      stockQty: parseInt(e.target.value) || 0
                    });
                  }
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStockDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={async () => {
                if (!editItem) return;
                
                try {
                  await updateCatalogItem(editItem.id, {
                    stockQty: editItem.stockQty
                  });
                  
                  // Recharger la liste
                  await loadCatalogItems();
                  
                  setToast({
                    open: true,
                    message: "Stock mis à jour",
                    severity: "success"
                  });
                  setStockDialog(false);
                } catch (e) {
                  const errorMessage = e instanceof Error ? e.message : "Erreur inconnue";
                  setToast({
                    open: true,
                    message: `Erreur: ${errorMessage}`,
                    severity: "error"
                  });
                }
              }}
              variant="contained"
              color="success"
            >
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </RequireAuth>
  );
}
