"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Chip,
  Container,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import TransformIcon from "@mui/icons-material/Transform";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EmailIcon from "@mui/icons-material/Email";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageShell from "@/app/components/PageShell";
import RequireAuth from "@/app/components/RequireAuth";
import {
  addInvoiceLine,
  deleteInvoiceLine,
  getInvoice,
  issueInvoice,
  payInvoice,
  type Invoice,
  type InvoiceLine,
  updateInvoice,
  updateInvoiceLine,
  createInvoice,
  listInvoicePayments,
  addInvoicePayment,
  type InvoicePayment,
  createStockMovement,
  getCatalogItem,
  deleteInvoicePayment,
  updateInvoicePayment,
  convertQuoteToInvoice,
} from "@/lib/api";
import { searchCatalog, type CatalogItem as CatalogItemExt } from "@/lib/catalog";
import { usePageTheme } from "@/hooks/usePageTheme";
import { type PageTheme } from "@/lib/theme-colors";

export const dynamic = 'force-dynamic';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // Détection automatique du thème depuis l'URL
  const defaultTheme = usePageTheme();
  const [inv, setInv] = useState<(Invoice & { lines: InvoiceLine[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: "success" | "error" | "warning" }>({ open: false, message: "", severity: "success" });
  // Quick item add state
  const [qType, setQType] = useState<'piece' | 'equipement' | 'velo_neuf' | 'velo_occasion' | 'service'>('piece');
  const [qDesc, setQDesc] = useState('');
  const [qQty, setQQty] = useState<number>(1);
  const [qPrice, setQPrice] = useState<number>(0);
  const [qVat, setQVat] = useState<number>(20);
  const [discountPct, setDiscountPct] = useState<number>(0);
  // Optimistic line edits
  const [linePatches, setLinePatches] = useState<Record<string, Partial<InvoiceLine>>>({});
  // Pay dialog state
  const [payOpen, setPayOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<string>("CB");
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  // Catalog mock + markup
  const [catalog, setCatalog] = useState<CatalogItemExt[]>([]);
  const [selectedItem, setSelectedItem] = useState<CatalogItemExt | null>(null);
  const [catLoading, setCatLoading] = useState(false);
  const [markupPct, setMarkupPct] = useState<number>(0);
  const [showMargin, setShowMargin] = useState<boolean>(false);
  // Partial payments state
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [ppOpen, setPpOpen] = useState(false);
  const [ppAmount, setPpAmount] = useState<number>(0);
  const [ppMethod, setPpMethod] = useState<string>("CB");
  const [ppDate, setPpDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [ppNote, setPpNote] = useState<string>("");
  const [ppEditing, setPpEditing] = useState<InvoicePayment | null>(null);
  // Quote conversion state
  const [converting, setConverting] = useState(false);
  // Map catalog categories to quick-add types used by the UI
  const mapCatalogCategoryToQType = (c: CatalogItemExt['category']): 'piece' | 'equipement' | 'velo_neuf' | 'velo_occasion' | 'service' => {
    switch (c) {
      case 'PIECES': return 'piece';
      case 'EQUIPEMENTS': return 'equipement';
      // "AUTRES" does not map directly; treat as service by default
      default: return 'service';
    }
  };
  const mapQTypeToCatalogCategory = (t: typeof qType): CatalogItemExt['category'] | undefined => {
    switch (t) {
      case 'piece': return 'PIECES';
      case 'equipement': return 'EQUIPEMENTS';
      default: return undefined; // autres types = service/custom
    }
  };
  // Timer pour le debounce de recherche catalogue
  const catSearchTimer = useRef<any>(null);
  async function onCreateCredit() {
    try {
      const res = await fetch(`/api/finance/invoices/${id}/credit`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'credit_failed');
      setToast({ open: true, message: 'Avoir créé', severity: 'success' });
      // Rediriger vers la route avoir
      window.location.href = `/finance/credits/${data.id}`;
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: création avoir', severity: 'error' });
    }
  }

  async function handleConvertToInvoice() {
    if (!inv || inv.type !== 'quote') return;
    if (!confirm('Convertir ce devis en facture ? Cette action est irréversible.')) return;

    setConverting(true);
    try {
      const result = await convertQuoteToInvoice(inv.id);
      setToast({
        open: true,
        message: 'Devis converti en facture avec succès !',
        severity: 'success',
      });
      // Rediriger vers la nouvelle facture
      setTimeout(() => {
        window.location.href = `/finance/invoices/${result.invoice.id}`;
      }, 1500);
    } catch (err: any) {
      setToast({
        open: true,
        message: `Erreur: ${err.message}`,
        severity: 'error',
      });
    } finally {
      setConverting(false);
    }
  }

  // Persist all local changes in one go
  async function saveAllChanges() {
    if (!inv) return;
    setSaving(true);
    try {
      // 1) Persist line patches
      const entries = Object.entries(linePatches);
      for (const [lineId, patch] of entries) {
        // eslint-disable-next-line no-await-in-loop
        await updateInvoiceLine(inv.id, lineId, patch as Partial<InvoiceLine>);
      }
      // 2) Persist discount if changed
      const baseTTC = (inv.lines || []).reduce((s, l) => s + (l.totalTTC ?? 0), 0);
      const pctFromInv = baseTTC > 0 && inv.discountAmount ? (inv.discountAmount / baseTTC) * 100 : 0;
      const hasDiscountChange = Math.abs((discountPct || 0) - Number(pctFromInv.toFixed(2))) > 0.01;
      if (hasDiscountChange) {
        const amount = Math.max(0, Math.round(baseTTC * (discountPct / 100) * 100) / 100);
        await updateInvoice(inv.id, { discountAmount: amount });
      }
      setLinePatches({});
      await refresh();
      setToast({ open: true, message: 'Modifications enregistrées', severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: enregistrement', severity: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function onCancelInvoice() {
    try {
      const reason = window.prompt('Motif d\'annulation (optionnel):') || undefined;
      const res = await fetch(`/api/finance/invoices/${id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'cancel_failed');
      const docType = inv?.type === 'quote' ? 'Devis' : inv?.type === 'credit' ? 'Avoir' : 'Facture';
      setToast({ open: true, message: `${docType} annulé${inv.type === 'quote' ? '' : 'e'}`, severity: 'success' });
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: annulation', severity: 'error' });
    }
  }
  async function sendInvoiceEmail() {
    if (!id) return;
    try {
      const res = await fetch(`/api/finance/invoices/${id}/email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'email_failed');
      const docType = inv?.type === 'quote' ? 'Devis' : inv?.type === 'credit' ? 'Avoir' : 'Facture';
      setToast({ open: true, message: `${docType} envoyé${inv.type === 'quote' ? '' : 'e'} par email`, severity: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: 'Erreur: envoi email', severity: 'error' });
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      const data = await getInvoice(id);
      setInv(data);
      // Load partial payments (optional backend)
      try {
        const p = await listInvoicePayments(id);
        setPayments(p);
      } catch (e) {
        // Backend might not be implemented yet; keep empty silently
        setPayments([]);
      }
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur de chargement de la facture", severity: "error" });
    } finally {
      setLoading(false);
    }
  }
  async function onChangeDiscountPct(pct: number) {
    if (!inv) return;
    setDiscountPct(pct);
    try {
      // Compute amount from current totals for persistence; UI already updates optimistically via discountPct
      const base = (inv.lines || []).reduce((s, l) => s + (l.totalTTC ?? 0), 0);
      const amount = Math.max(0, Math.round(base * (pct / 100) * 100) / 100);
      const upd = await updateInvoice(inv.id, { discountAmount: amount });
      setInv({ ...inv, ...upd });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: remise", severity: "error" });
    }
  }

  async function onDuplicate() {
    if (!inv) return;
    try {
      const copy = await createInvoice({
        workOrderId: inv.workOrderId,
        pricingMode: inv.pricingMode,
        currency: inv.currency,
        vatRate: inv.vatRate,
        laborRate: inv.laborRate,
      });
      for (const l of inv.lines) {
        const payload: any = {
          type: l.type,
          description: l.description,
          qty: l.qty,
          vatRate: l.vatRate ?? inv.vatRate,
        };
        if (inv.pricingMode === 'HT_TVA') payload.unitPriceHT = l.unitPriceHT ?? 0;
        else payload.unitPriceTTC = l.unitPriceTTC ?? 0;
        // eslint-disable-next-line no-await-in-loop
        await addInvoiceLine(copy.id, payload);
      }
      if (inv.discountAmount && inv.discountAmount > 0) {
        await updateInvoice(copy.id, { discountAmount: inv.discountAmount });
      }
      const docType = inv?.type === 'quote' ? 'Devis' : inv?.type === 'credit' ? 'Avoir' : 'Facture';
      setToast({ open: true, message: `${docType} dupliqué${inv.type === 'quote' ? '' : 'e'}`, severity: "success" });
      // navigate to new invoice
      window.location.href = `/finance/invoices/${copy.id}`;
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: duplication", severity: "error" });
    }
  }

  async function onAddQuickItem() {
    if (!inv) return;
    try {
      const type: InvoiceLine['type'] = qType === 'service' ? 'custom' : 'part';
      const prefix = qType === 'piece' ? 'Pièce' : qType === 'equipement' ? 'Équipement' : qType === 'velo_neuf' ? 'Vélo neuf' : qType === 'velo_occasion' ? 'Vélo occasion' : 'Service';
      const description = qDesc ? `${prefix} - ${qDesc}` : prefix;
      const payload: any = {
        type,
        description,
        qty: qQty,
        vatRate: inv.pricingMode === 'AE_TTC' ? 0 : qVat,
      };
      // apply markup if any
      const priceWithMarkup = qPrice * (1 + (markupPct > 0 ? markupPct / 100 : 0));
      if (inv.pricingMode === 'HT_TVA') payload.unitPriceHT = priceWithMarkup;
      else payload.unitPriceTTC = priceWithMarkup;
      await addInvoiceLine(inv.id, payload);
      setQDesc(''); setQQty(1); setQPrice(0);
      setSelectedItem(null);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: ajout article", severity: "error" });
    }
  }

  useEffect(() => { refresh(); }, [id]);

  // Sync discount percent from invoice values when loaded
  useEffect(() => {
    if (!inv) return;
    const baseTTC = inv.totalTTC || 0;
    const pct = baseTTC > 0 && inv.discountAmount ? (inv.discountAmount / baseTTC) * 100 : 0;
    setDiscountPct(Number(pct.toFixed(2)));
  }, [inv?.totalTTC, inv?.discountAmount]);

  const isDraft = inv?.status === "draft";

  // Safe fallback if invoice failed to load
  if (!loading && !inv) {
    return (
      <Stack sx={{ p: 3 }} spacing={2}>
        <Typography variant="h6">Facture introuvable</Typography>
        <Typography variant="body2" color="text.secondary">ID: {id}</Typography>
      </Stack>
    );
  }

  async function onHeaderChange(field: keyof Invoice, value: any) {
    if (!inv) return;
    setSaving(true);
    try {
      const upd = await updateInvoice(inv.id, { [field]: value } as any);
      setInv({ ...inv, ...upd });
      
      // Si on change le mode de pricing vers AE_TTC, mettre toutes les TVA à 0%
      if (field === 'pricingMode' && value === 'AE_TTC') {
        for (const line of inv.lines) {
          if (line.vatRate !== 0) {
            await updateInvoiceLine(inv.id, line.id, { vatRate: 0 });
          }
        }
        await refresh();
      }
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur de mise à jour", severity: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function onAddLine(type: InvoiceLine["type"]) {
    if (!inv) return;
    try {
      await addInvoiceLine(inv.id, {
        type,
        description: type === "labor" ? "Main d'œuvre" : type === "part" ? "Pièce" : "Ligne libre",
        qty: 1,
        unitPriceHT: inv.pricingMode === "HT_TVA" ? 0 : undefined,
        unitPriceTTC: inv.pricingMode === "AE_TTC" ? 0 : undefined,
        vatRate: inv.pricingMode === "AE_TTC" ? 0 : inv.vatRate,
      } as any);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: ajout de ligne", severity: "error" });
    }
  }

  async function onUpdateLine(line: InvoiceLine, patch: Partial<InvoiceLine>) {
    if (!inv) return;
    try {
      await updateInvoiceLine(inv.id, line.id, patch);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: mise à jour ligne", severity: "error" });
    }
  }

  async function onDeleteLine(line: InvoiceLine) {
    if (!inv) return;
    try {
      await deleteInvoiceLine(inv.id, line.id);
      await refresh();
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: suppression ligne", severity: "error" });
    }
  }

  async function onIssue() {
    if (!inv) return;
    try {
      // Émettre la facture
      await issueInvoice(inv.id);
      // Décrémenter le stock pour les lignes pièce
      try {
        const lowStock: string[] = [];
        for (const l of inv.lines) {
          if (l.type === 'part' && l.partId && l.qty && l.qty > 0) {
            // eslint-disable-next-line no-await-in-loop
            await createStockMovement(l.partId, { type: 'OUT', qty: l.qty, refType: 'INVOICE', refId: inv.id, note: `Facture ${inv.number || inv.id}` });
            try {
              // eslint-disable-next-line no-await-in-loop
              const it = await getCatalogItem(l.partId);
              if (typeof it.minStock === 'number' && it.stockQty <= it.minStock) lowStock.push(it.name);
            } catch {}
          }
        }
        if (lowStock.length > 0) {
          setToast({ open: true, message: `Stock bas: ${lowStock.slice(0,3).join(', ')}${lowStock.length>3?'…':''}`, severity: 'warning' });
        }
      } catch (e) {
        console.warn('Stock decrement failed', e);
      }
      await refresh();
      const docType = inv?.type === 'quote' ? 'Devis' : inv?.type === 'credit' ? 'Avoir' : 'Facture';
      setToast({ open: true, message: `${docType} émis${inv.type === 'quote' ? '' : 'e'}`, severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: émission facture", severity: "error" });
    }
  }

  async function onPay() {
    setPayOpen(true);
  }

  async function confirmPay() {
    if (!inv) return;
    try {
      await payInvoice(inv.id, { method: payMethod, paidAt: payDate });
      setPayOpen(false);
      await refresh();
      const docType = inv?.type === 'quote' ? 'Devis' : inv?.type === 'credit' ? 'Avoir' : 'Facture';
      setToast({ open: true, message: `${docType} payé${inv.type === 'quote' ? '' : 'e'}`, severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: marquage payé", severity: "error" });
    }
  }

  async function confirmPartialPayment(amount: number, method: string, date: string, note?: string) {
    if (!inv) return;
    try {
      if (ppEditing) {
        await updateInvoicePayment(inv.id, ppEditing.id, { amount, method, paidAt: date, note });
      } else {
        await addInvoicePayment(inv.id, { amount, method, paidAt: date, note });
      }
      setPpOpen(false);
      setPpNote("");
      setPpEditing(null);
      await refresh();
      setToast({ open: true, message: ppEditing ? "Paiement modifié" : "Paiement enregistré", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: ppEditing ? "Erreur: modification paiement" : "Erreur: ajout paiement (backend non disponible?)", severity: "error" });
    }
  }

  async function onDeletePayment(p: InvoicePayment) {
    if (!inv) return;
    const ok = window.confirm("Supprimer ce paiement ?");
    if (!ok) return;
    try {
      await deleteInvoicePayment(inv.id, p.id);
      await refresh();
      setToast({ open: true, message: "Paiement supprimé", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: suppression paiement", severity: "error" });
    }
  }

  const totals = useMemo(() => {
    if (!inv) return { totalTTC: 0, subtotalHT: 0, vatAmount: 0 };
    // Apply local patches on-the-fly
    const patched = (inv.lines || []).map((l) => ({ ...l, ...(linePatches[l.id] || {}) }));
    const sumHT = patched.reduce((s, l) => s + (l.totalHT ?? (l.unitPriceHT ?? 0) * (l.qty ?? 1)), 0);
    const sumTTC = patched.reduce((s, l) => s + (l.totalTTC ?? ((l.unitPriceTTC ?? (inv.pricingMode === 'HT_TVA' ? (l.unitPriceHT ?? 0) * (1 + (l.vatRate ?? inv.vatRate)/100) : 0)) * (l.qty ?? 1))), 0);
    const discountedTTC = Math.max(0, sumTTC * (1 - (discountPct || 0) / 100));
    const vatAmt = Math.max(0, discountedTTC - sumHT);
    return { totalTTC: discountedTTC, subtotalHT: sumHT, vatAmount: vatAmt };
  }, [inv?.lines, discountPct, linePatches]);

  const paidAmount = useMemo(() => payments.reduce((s, p) => s + (p.amount || 0), 0), [payments]);
  const remainingAmount = useMemo(() => Math.max(0, totals.totalTTC - paidAmount), [totals.totalTTC, paidAmount]);
  const discountChanged = useMemo(() => {
    if (!inv) return false;
    const baseTTC = (inv.lines || []).reduce((s, l) => s + (l.totalTTC ?? 0), 0);
    const pctFromInv = baseTTC > 0 && inv.discountAmount ? (inv.discountAmount / baseTTC) * 100 : 0;
    return Math.abs((discountPct || 0) - Number(pctFromInv.toFixed(2))) > 0.01;
  }, [inv?.lines, inv?.discountAmount, discountPct]);
  const hasLinePatches = Object.keys(linePatches).length > 0;

  // Total margin (only parts with purchasePriceHT)
  const totalMargin = useMemo(() => {
    if (!inv) return 0;
    return (inv.lines || []).reduce((acc, l) => {
      if (l.type !== 'part' || l.purchasePriceHT == null) return acc;
      const vr = (l.vatRate ?? inv.vatRate) || 0;
      const sellUnitHT = inv.pricingMode === 'HT_TVA' ? (l.unitPriceHT ?? 0) : ((l.unitPriceTTC ?? 0) / (1 + vr / 100));
      const mu = Math.max(0, sellUnitHT - (l.purchasePriceHT ?? 0));
      return acc + mu * (l.qty ?? 1);
    }, 0);
  }, [inv?.lines]);

  // Déterminer le type de document pour l'affichage
  const documentType = inv?.type === "quote" ? "Devis" : inv?.type === "credit" ? "Avoir" : "Facture";
  const documentIcon = inv?.type === "quote" ? "📋" : inv?.type === "credit" ? "🔄" : "💰";
  const backUrl = inv?.type === "quote" ? "/finance?tab=quotes" : inv?.type === "credit" ? "/finance?tab=credits" : "/finance?tab=invoices";
  const backLabel = inv?.type === "quote" ? "Retour aux devis" : inv?.type === "credit" ? "Retour aux avoirs" : "Retour aux factures";
  
  // Thème de couleur selon le type de document
  const themeType: PageTheme = inv?.type === "quote" ? "quote" : inv?.type === "credit" ? "credit" : "invoice";
  const theme = usePageTheme(themeType);

  return (
    <RequireAuth>
      <div data-test="invoice-root" style={{ background: '#fff' }}>
        <Box sx={{ bgcolor: theme.background, minHeight: '100vh' }}>
        <PageShell title={inv ? `${documentIcon} ${documentType} ${inv.number || "(brouillon)"}` : "Chargement..."} maxWidth="lg">
        {!inv && <Typography sx={{ p: 3 }}>Chargement...</Typography>}
        {inv && (
          <Stack spacing={2}>
            {/* Bouton retour */}
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push(backUrl)}
              variant="outlined"
              sx={{ 
                alignSelf: 'flex-start', 
                textTransform: 'none',
                borderColor: theme.primary,
                color: theme.text,
                '&:hover': {
                  borderColor: theme.primaryDark,
                  bgcolor: theme.primaryLight
                }
              }}
            >
              {backLabel}
            </Button>
            {/* Nom du client */}
            {(inv as any).workOrder?.customer && (
              <Alert severity="info" icon={false} sx={{ mb: 2, bgcolor: theme.primaryLight, borderColor: theme.border, border: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Client : {(inv as any).workOrder.customer.firstName} {(inv as any).workOrder.customer.lastName}
                  {(inv as any).workOrder.customer.email && ` • ${(inv as any).workOrder.customer.email}`}
                  {(inv as any).workOrder.customer.phone && ` • ${(inv as any).workOrder.customer.phone}`}
                </Typography>
              </Alert>
            )}
            {(inv as any).workOrderType && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Type de prise en charge: {
                    (inv as any).workOrderType === 'revision' ? 'Révision' :
                    (inv as any).workOrderType === 'repair' ? 'Réparation' :
                    (inv as any).workOrderType === 'maintenance' ? 'Entretien' :
                    (inv as any).workOrderType === 'upgrade' ? 'Upgrade' :
                    (inv as any).workOrderType
                  }
                </Typography>
              </Alert>
            )}
            {inv.type === "quote" && inv.validUntil && (
              <Alert 
                severity={new Date(inv.validUntil) < new Date() ? "error" : "info"}
                sx={{ mb: 2 }}
              >
                {new Date(inv.validUntil) < new Date() ? (
                  <>⚠️ Devis expiré le {new Date(inv.validUntil).toLocaleDateString("fr-FR")}</>
                ) : (
                  <>📅 Valide jusqu'au {new Date(inv.validUntil).toLocaleDateString("fr-FR")}</>
                )}
              </Alert>
            )}
            <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <TextField size="small" label="Mode" select value={inv.pricingMode} onChange={(e) => onHeaderChange("pricingMode", e.target.value)} disabled={!isDraft || saving} sx={{ minWidth: 160 }}>
                  <MenuItem value="AE_TTC">AE (TTC)</MenuItem>
                  <MenuItem value="HT_TVA">HT + TVA</MenuItem>
                </TextField>
                <TextField size="small" label="TVA (%)" type="number" value={inv.vatRate} onChange={(e) => onHeaderChange("vatRate", Number(e.target.value))} onFocus={(e) => e.target.select()} disabled={!isDraft || saving} sx={{ width: 120 }} />
                <TextField size="small" label="Taux MO (€/h)" type="number" value={inv.laborRate} onChange={(e) => onHeaderChange("laborRate", Number(e.target.value))} onFocus={(e) => e.target.select()} disabled={!isDraft || saving} sx={{ width: 140 }} />
                <TextField size="small" label="Remise (%)" type="number" value={discountPct} onChange={(e) => onChangeDiscountPct(Number(e.target.value))} onFocus={(e) => e.target.select()} sx={{ width: 120 }} />
                <TextField size="small" label="Échéance" type="date" value={(inv.dueDate ? inv.dueDate.slice(0,10) : '')} onChange={(e) => onHeaderChange('dueDate' as any, e.target.value ? new Date(e.target.value).toISOString() : null)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
                <Box flex={1} />
                {inv.type !== "credit" && (
                  <Button size="small" variant="text" onClick={() => setShowMargin(v => !v)} sx={{ textTransform: 'none' }}>{showMargin ? 'Masquer marge' : 'Afficher marge'}</Button>
                )}
                <Chip size="small" icon={documentIcon} label={documentType} color={documentColor} variant="outlined" sx={{ textTransform: 'none', fontWeight: 600 }} />
                <Chip size="small" label={inv.status === 'draft' ? 'brouillon' : inv.status === 'issued' ? 'émis' : inv.status} color={inv.status === 'paid' ? 'success' : inv.status === 'issued' ? 'info' : inv.status === 'cancelled' ? 'default' : 'warning'} sx={{ textTransform: 'none' }} />
                {inv.issueDate && (
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Émise le {new Date(inv.issueDate).toLocaleDateString('fr-FR')}
                  </Typography>
                )}
                
                {/* Actions spécifiques DEVIS */}
                {inv.type === "quote" && (
                  <>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<PictureAsPdfIcon />}
                      component="a"
                      href={`/api/finance/invoices/${id}/pdf`}
                      target="_blank"
                      sx={{ textTransform: 'none' }}
                    >
                      PDF
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<EmailIcon />}
                      onClick={sendInvoiceEmail}
                      sx={{ textTransform: 'none' }}
                    >
                      Email
                    </Button>
                    {isDraft && (
                      <>
                        <Button size="small" variant="contained" onClick={onIssue} sx={{ textTransform: 'none', bgcolor: theme.primary, '&:hover': { bgcolor: theme.primaryDark } }}>Émettre</Button>
                        <Button size="small" variant="contained" color="primary" onClick={saveAllChanges} disabled={saving || (!hasLinePatches && !discountChanged)} sx={{ textTransform: 'none' }}>
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </>
                    )}
                    {!inv.convertedAt && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<TransformIcon />}
                        onClick={handleConvertToInvoice}
                        disabled={converting}
                        sx={{ textTransform: 'none' }}
                      >
                        {converting ? "Conversion..." : "Convertir"}
                      </Button>
                    )}
                  </>
                )}

                {/* Actions spécifiques AVOIR */}
                {inv.type === "credit" && (
                  <>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<PictureAsPdfIcon />}
                      component="a"
                      href={`/api/finance/invoices/${id}/pdf`}
                      target="_blank"
                      sx={{ textTransform: 'none' }}
                    >
                      PDF
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<EmailIcon />}
                      onClick={sendInvoiceEmail}
                      sx={{ textTransform: 'none' }}
                    >
                      Email
                    </Button>
                    {isDraft && (
                      <>
                        <Button size="small" variant="contained" onClick={onIssue} sx={{ textTransform: 'none', bgcolor: theme.primary, '&:hover': { bgcolor: theme.primaryDark } }}>Émettre</Button>
                        <Button size="small" variant="contained" color="primary" onClick={saveAllChanges} disabled={saving || (!hasLinePatches && !discountChanged)} sx={{ textTransform: 'none' }}>
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </>
                    )}
                  </>
                )}

                {/* Actions spécifiques FACTURE */}
                {inv.type === "invoice" && (
                  <>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<PictureAsPdfIcon />}
                      component="a"
                      href={`/api/finance/invoices/${id}/pdf`}
                      target="_blank"
                      sx={{ textTransform: 'none' }}
                    >
                      PDF
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      startIcon={<EmailIcon />}
                      onClick={sendInvoiceEmail}
                      sx={{ textTransform: 'none' }}
                    >
                      Email
                    </Button>
                    {isDraft && (
                      <>
                        <Button size="small" variant="contained" onClick={onIssue} sx={{ textTransform: 'none', bgcolor: theme.primary, '&:hover': { bgcolor: theme.primaryDark } }}>Émettre</Button>
                        <Button size="small" variant="contained" color="primary" onClick={saveAllChanges} disabled={saving || (!hasLinePatches && !discountChanged)} sx={{ textTransform: 'none' }}>
                          {saving ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </Stack>
            </Paper>

            {inv.type === "quote" && inv.convertedAt && (
              <Alert severity="success">
                ✅ Devis converti en facture le {new Date(inv.convertedAt).toLocaleDateString("fr-FR")}
                {inv.convertedToId && (
                  <Button
                    size="small"
                    component={Link}
                    href={`/finance/invoices/${inv.convertedToId}`}
                    sx={{ ml: 2 }}
                  >
                    Voir la facture →
                  </Button>
                )}
              </Alert>
            )}

            <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <TableContainer sx={{ maxHeight: { xs: 360, md: 420 } }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qté</TableCell>
                      {inv.pricingMode === 'HT_TVA' ? (
                        <TableCell align="right">PU HT</TableCell>
                      ) : (
                        <TableCell align="right">PU TTC</TableCell>
                      )}
                      <TableCell align="right">TVA (%)</TableCell>
                      <TableCell align="right">Total TTC</TableCell>
                      {showMargin && (
                        <TableCell align="right">Marge</TableCell>
                      )}
                      <TableCell align="right">Suppr</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inv.lines.map((l) => (
                      <TableRow key={l.id} hover>
                        <TableCell>{l.type === 'part' ? 'Pièce' : l.type === 'labor' ? "Main d'œuvre" : 'Libre'}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            multiline
                            minRows={2}
                            maxRows={6}
                            value={(linePatches[l.id]?.description as any) ?? l.description}
                            disabled={!isDraft}
                            onChange={(e) => setLinePatches((p) => ({ ...p, [l.id]: { ...(p[l.id]||{}), description: e.target.value } }))}
                            onBlur={async (e) => { if (!isDraft) return; const v=e.currentTarget.value; await onUpdateLine(l, { description: v }); setLinePatches((p)=>{ const { [l.id]:_, ...rest } = p; return rest; }); }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField size="small" type="number" value={(linePatches[l.id]?.qty as any) ?? l.qty} disabled={!isDraft}
                            onChange={(e) => setLinePatches((p) => ({ ...p, [l.id]: { ...(p[l.id]||{}), qty: Number(e.target.value) } }))}
                            onFocus={(e) => e.target.select()}
                            onBlur={async (e) => { if (!isDraft) return; const v=Number(e.currentTarget.value||0); await onUpdateLine(l, { qty: v }); setLinePatches((p)=>{ const { [l.id]:_, ...rest } = p; return rest; }); }}
                            sx={{ width: 100 }} />
                        </TableCell>
                        {inv.pricingMode === 'HT_TVA' ? (
                          <TableCell align="right">
                            <TextField size="small" type="number" value={(linePatches[l.id]?.unitPriceHT as any) ?? (l.unitPriceHT ?? 0)} disabled={!isDraft}
                              onChange={(e) => setLinePatches((p) => ({ ...p, [l.id]: { ...(p[l.id]||{}), unitPriceHT: Number(e.target.value) } }))}
                              onFocus={(e) => e.target.select()}
                              onBlur={async (e) => { if (!isDraft) return; const v=Number(e.currentTarget.value||0); await onUpdateLine(l, { unitPriceHT: v }); setLinePatches((p)=>{ const { [l.id]:_, ...rest } = p; return rest; }); }}
                              sx={{ width: 120 }} />
                          </TableCell>
                        ) : (
                          <TableCell align="right">
                            <TextField size="small" type="number" value={(linePatches[l.id]?.unitPriceTTC as any) ?? (l.unitPriceTTC ?? 0)} disabled={!isDraft}
                              onChange={(e) => setLinePatches((p) => ({ ...p, [l.id]: { ...(p[l.id]||{}), unitPriceTTC: Number(e.target.value) } }))}
                              onFocus={(e) => e.target.select()}
                              onBlur={async (e) => { if (!isDraft) return; const v=Number(e.currentTarget.value||0); await onUpdateLine(l, { unitPriceTTC: v }); setLinePatches((p)=>{ const { [l.id]:_, ...rest } = p; return rest; }); }}
                              sx={{ width: 120 }} />
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <TextField size="small" type="number" value={(linePatches[l.id]?.vatRate as any) ?? (l.vatRate ?? inv.vatRate)} disabled={!isDraft}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setLinePatches((p) => ({ ...p, [l.id]: { ...(p[l.id]||{}), vatRate: Number(e.target.value) } }))}
                            onBlur={async (e) => { if (!isDraft) return; const v=Number(e.currentTarget.value||0); await onUpdateLine(l, { vatRate: v }); setLinePatches((p)=>{ const { [l.id]:_, ...rest } = p; return rest; }); }}
                            sx={{ width: 100 }} />
                        </TableCell>
                        <TableCell align="right">
                          {(() => {
                            const lp = linePatches[l.id] || {};
                            const qty = (lp.qty ?? l.qty) || 0;
                            const vr = (lp.vatRate ?? l.vatRate ?? inv.vatRate) || 0;
                            if (inv.pricingMode === 'HT_TVA') {
                              const uht = (lp.unitPriceHT ?? l.unitPriceHT ?? 0);
                              const t = uht * qty * (1 + vr/100);
                              return `${t.toFixed(2)} ${inv.currency}`;
                            } else {
                              const uttc = (lp.unitPriceTTC ?? l.unitPriceTTC ?? 0);
                              const t = uttc * qty;
                              return `${t.toFixed(2)} ${inv.currency}`;
                            }
                          })()}
                        </TableCell>
                        {showMargin && (
                          <TableCell align="right">
                            {(() => {
                              if (l.type !== 'part' || l.purchasePriceHT == null) return '—';
                              const vr = (l.vatRate ?? inv.vatRate) || 0;
                              const sellUnitHT = inv.pricingMode === 'HT_TVA' ? (l.unitPriceHT ?? 0) : ((l.unitPriceTTC ?? 0) / (1 + vr / 100));
                              if (sellUnitHT <= 0) return '—';
                              const mu = sellUnitHT - (l.purchasePriceHT ?? 0);
                              const mt = mu * (l.qty ?? 1);
                              const pct = (mu / sellUnitHT) * 100;
                              return `${pct.toFixed(0)}% (${mt.toFixed(2)} ${inv.currency})`;
                            })()}
                          </TableCell>
                        )}
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => onDeleteLine(l)} disabled={!isDraft} aria-label="Supprimer la ligne">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {inv.lines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7 + (showMargin ? 1 : 0)}>
                          <Box py={3} textAlign="center" color="text.secondary">Aucune ligne</Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              {/* Quick add item row */}
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ p: 1.25, alignItems: { md: 'center' }, borderTop: '1px solid', borderColor: 'divider' }}>
                <Autocomplete
                  size="small"
                  options={catalog}
                  value={selectedItem}
                  getOptionLabel={(o) => o?.name || ''}
                  isOptionEqualToValue={(a, b) => a?.id === b?.id}
                  onChange={(_, val) => {
                    setSelectedItem(val);
                    if (!val) return;
                    setQType(mapCatalogCategoryToQType(val.category));
                    setQDesc(val.name);
                    setQVat(val.vatRate);
                    const base = inv?.pricingMode === 'HT_TVA' ? val.priceHT : val.priceTTC;
                    setQPrice(base);
                  }}
                  sx={{ minWidth: 260 }}
                  loading={catLoading}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Catalogue (optionnel)"
                      placeholder="Rechercher (min. 2 caractères)"
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {catLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  filterOptions={(x) => x}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <span>
                        <b>{option.name}</b>
                        {option.sku ? <span style={{ color: '#607d8b' }}> • SKU {option.sku}</span> : null}
                      </span>
                      <span style={{ color: '#455a64' }}>
                        {typeof option.stockQty === 'number' ? `${option.stockQty} en stock` : ''}
                        <span style={{ marginLeft: 8, fontWeight: 600 }}>
                          {(inv?.pricingMode === 'HT_TVA' ? option.priceHT : option.priceTTC).toFixed(2)} {inv?.currency}
                        </span>
                      </span>
                    </li>
                  )}
                  onInputChange={(_e, value) => {
                    const v = (value || '').trim();
                    if (!v || v.length < 2) { setCatalog([]); setCatLoading(false); return; }
                    if (catSearchTimer.current) clearTimeout(catSearchTimer.current);
                    catSearchTimer.current = setTimeout(async () => {
                      setCatLoading(true);
                      try {
                        const list = await searchCatalog({ q: v, category: mapQTypeToCatalogCategory(qType), limit: 20 });
                        setCatalog(list);
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setCatLoading(false);
                      }
                    }, 250);
                  }}
                />
                <Select size="small" value={qType} onChange={(e) => setQType(e.target.value as any)} sx={{ minWidth: 160 }}>
                  <MenuItem value="piece">Pièce</MenuItem>
                  <MenuItem value="equipement">Équipement</MenuItem>
                  <MenuItem value="velo_neuf">Vélo neuf</MenuItem>
                  <MenuItem value="velo_occasion">Vélo occasion</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                </Select>
                <TextField size="small" label="Description" value={qDesc} onChange={(e) => setQDesc(e.target.value)} sx={{ flex: 1, minWidth: 240 }} />
                <TextField size="small" label="Qté" type="number" value={qQty} onChange={(e) => setQQty(Number(e.target.value))} onFocus={(e) => e.target.select()} sx={{ width: 90 }} />
                <TextField size="small" label={inv?.pricingMode === 'HT_TVA' ? 'PU HT' : 'PU TTC'} type="number" value={qPrice} onChange={(e) => setQPrice(Number(e.target.value))} onFocus={(e) => e.target.select()} sx={{ width: 130 }} />
                {inv?.pricingMode === 'HT_TVA' && (
                  <TextField size="small" label="TVA (%)" type="number" value={qVat} onChange={(e) => setQVat(Number(e.target.value))} onFocus={(e) => e.target.select()} sx={{ width: 110 }} />
                )}
                <TextField size="small" label="Marge (%)" type="number" value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))} onFocus={(e) => e.target.select()} sx={{ width: 110 }} />
                <Button size="small" variant="contained" onClick={onAddQuickItem} sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}>Ajouter</Button>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ p: 1.25, flexWrap: 'wrap', rowGap: 1 }}>
                <Button variant="outlined" size="small" onClick={() => onAddLine('labor')} disabled={!isDraft} sx={{ textTransform: 'none' }}>Ajouter MO</Button>
                <Button variant="outlined" size="small" onClick={() => onAddLine('part')} disabled={!isDraft} sx={{ textTransform: 'none' }}>Ajouter pièce</Button>
                <Button variant="outlined" size="small" onClick={() => onAddLine('custom')} disabled={!isDraft} sx={{ textTransform: 'none' }}>Ajouter libre</Button>
                <Box flex={1} />
                <Stack direction="row" spacing={3} sx={{ p: 1, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                  <Typography variant="body2">HT: {totals.subtotalHT.toFixed(2)} {inv.currency}</Typography>
                  <Typography variant="body2">TVA: {totals.vatAmount.toFixed(2)} {inv.currency}</Typography>
                  <Typography variant="subtitle1"><b>Total TTC: {totals.totalTTC.toFixed(2)} {inv.currency}</b></Typography>
                  {inv.type !== "quote" && (
                    <>
                      <Typography variant="body2">Payé: {paidAmount.toFixed(2)} {inv.currency}</Typography>
                      <Typography variant="body2" color={remainingAmount > 0 ? 'warning.main' : 'success.main'}>Restant: {remainingAmount.toFixed(2)} {inv.currency}</Typography>
                    </>
                  )}
                </Stack>
              </Stack>
              {inv.vatRate === 0 && inv.pricingMode === "AE_TTC" && (
                <Box sx={{ px: 2, pb: 1 }}>
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    TVA non applicable - article 293 B du CGI
                  </Typography>
                </Box>
              )}
              {showMargin && (
                <Box sx={{ px: 2, pb: 1 }}>
                  <Typography variant="body2" color="text.secondary">Total marge (pièces): <b>{totalMargin.toFixed(2)} {inv.currency}</b></Typography>
                </Box>
              )}
            </Paper>

            {/* Liste des paiements partiels - Masqué pour les devis */}
            {inv.type !== "quote" && (
              <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Paiements</Typography>
                {payments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Aucun paiement enregistré</Typography>
                ) : (
                  <Stack spacing={1}>
                    {payments.map((p) => (
                      <Stack key={p.id} direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2" sx={{ minWidth: 120 }}>{p.paidAt ? new Date(p.paidAt).toLocaleDateString('fr-FR') : '-'}</Typography>
                        <Typography variant="body2" sx={{ minWidth: 120 }}>{Number(p.amount ?? 0).toFixed(2)} {inv.currency}</Typography>
                        <Typography variant="body2" sx={{ minWidth: 100 }}>{p.method || '-'}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>{p.note || ''}</Typography>
                        <IconButton size="small" aria-label="Éditer paiement" onClick={() => { setPpEditing(p); setPpAmount(p.amount); setPpMethod(p.method || "CB"); setPpDate((p.paidAt || new Date().toISOString()).slice(0,10)); setPpNote(p.note || ""); setPpOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Supprimer paiement" onClick={() => onDeletePayment(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Paper>
            )}
          </Stack>
        )}

        <Snackbar open={toast.open} autoHideDuration={3500} onClose={() => setToast((t) => ({ ...t, open: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
          <Alert onClose={() => setToast((t) => ({ ...t, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        </Snackbar>
        {inv && (
          <PartialPaymentDialog
            open={ppOpen}
            onClose={() => setPpOpen(false)}
            onConfirm={confirmPartialPayment}
            amount={ppAmount}
            setAmount={setPpAmount}
            method={ppMethod}
            setMethod={setPpMethod}
            date={ppDate}
            setDate={setPpDate}
            note={ppNote}
            setNote={setPpNote}
            currency={inv.currency}
          />
        )}
        </PageShell>
        </Box>
      </div>
    </RequireAuth>
  );
}


// Partial Payment modal
function PartialPaymentDialog(props: { open: boolean; onClose: () => void; onConfirm: (amount: number, method: string, date: string, note?: string) => void; amount: number; setAmount: (n: number) => void; method: string; setMethod: (v: string) => void; date: string; setDate: (v: string) => void; note: string; setNote: (v: string) => void; currency: string; }) {
  const { open, onClose, onConfirm, amount, setAmount, method, setMethod, date, setDate, note, setNote, currency } = props;
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={onClose}>
      <div style={{ background: 'white', padding: 16, borderRadius: 8, minWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <Typography variant="h6" gutterBottom>Ajouter un paiement</Typography>
        <Stack spacing={2}>
          <TextField size="small" type="number" label={`Montant (${currency})`} value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} onFocus={(e) => e.target.select()} />
          <TextField size="small" select label="Mode" value={method} onChange={(e) => setMethod(e.target.value)}>
            <MenuItem value="CB">CB</MenuItem>
            <MenuItem value="Espèces">Espèces</MenuItem>
            <MenuItem value="Virement">Virement</MenuItem>
            <MenuItem value="Chèque">Chèque</MenuItem>
            <MenuItem value="Autre">Autre</MenuItem>
          </TextField>
          <TextField size="small" label="Date de paiement" type="date" value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onClose}>Annuler</Button>
            <Button variant="contained" onClick={() => onConfirm(amount, method, date, note)} disabled={!amount || amount <= 0}>Enregistrer</Button>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

// end of file
