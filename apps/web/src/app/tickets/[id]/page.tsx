"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Box,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  createSaleFromWorkOrder,
  getWorkOrder,
  listLaborEntries,
  addLaborEntry,
  createInvoice,
  importLaborToInvoice,
  listInvoices,
  markWorkOrderReady,
  quoteFromWorkOrder,
  startWorkOrder,
  listWorkOrderParts,
  addWorkOrderPart,
  updateWorkOrderPart,
  deleteWorkOrderPart,
  getWorkOrderType,
  setWorkOrderType,
  addInvoiceLine,
  listCatalogItems,
  createQuote,
  listQuotes,
  convertQuoteToInvoice,
  sendCommunication,
  saveWorkOrderEstimate,
  type LaborEntry,
  type QuoteResult,
  type WorkOrder,
  type WorkOrderType,
  type CatalogItem,
  type Invoice,
} from "@/lib/api";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import TransformIcon from "@mui/icons-material/Transform";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import RefreshIcon from "@mui/icons-material/Refresh";
import Link from "next/link";
import { AppointmentPicker } from "@/components/AppointmentPicker";
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";

export default function TicketDetailPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [labor, setLabor] = useState<LaborEntry[]>([]);
  const [labMinutes, setLabMinutes] = useState<string>("");
  const [labNote, setLabNote] = useState<string>("");
  const [parts, setParts] = useState<Array<{ id: string; description: string; qty: number; priceHT: number; note?: string | null }>>([]);
  const [pDesc, setPDesc] = useState("");
  const [pQty, setPQty] = useState("1");
  const [pPrice, setPPrice] = useState("0");
  const [pNote, setPNote] = useState("");
  const [addingPart, setAddingPart] = useState(false);
  const [pCatalog, setPCatalog] = useState<CatalogItem | null>(null);
  const [catOptions, setCatOptions] = useState<CatalogItem[]>([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catQuery, setCatQuery] = useState("");
  const [wType, setWType] = useState<WorkOrderType | "">("");
  // Quotes state
  const [quotes, setQuotes] = useState<Invoice[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  // Lines state (nouveau système)
  const [lines, setLines] = useState<LineItem[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);

  async function refresh() {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getWorkOrder(id);
      setWo(data);
      // prefill estimate fields if present
      const w = data as WorkOrder;
      setEstimatedMinutes(
        w.estimatedMinutes != null ? String(w.estimatedMinutes) : "",
      );
      setHourlyRate(w.hourlyRate != null ? String(w.hourlyRate) : "");
      // Load labor entries
      try {
        const le = await listLaborEntries(id);
        setLabor(le);
      } catch (e) {
        console.warn("labor load failed", e);
      }
      // Load parts
      try {
        const prt = await listWorkOrderParts(id);
        setParts(prt.map(p => ({ id: p.id, description: p.description, qty: p.qty, priceHT: p.priceHT, note: p.note })));
      } catch (e) { console.warn('parts load failed', e); }
      // Load type
      try {
        const t = await getWorkOrderType(id);
        setWType((t?.type as any) || "");
      } catch (e) { console.warn('type load failed', e); }
    } catch (e: unknown) {
      console.error(e);
      setToast({
        open: true,
        message: "Erreur de chargement du ticket",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    if (id) {
      loadLines();
      loadUserSettings();
    }
  }, [id]);

  async function loadLines() {
    if (!id) return;
    setLoadingLines(true);
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        // L'API peut retourner un tableau direct ou un objet {lines: [...]}
        const linesArray = Array.isArray(data) ? data : (data.lines || []);
        console.log("[Ticket] Lines loaded:", linesArray);
        setLines(linesArray);
      }
    } catch (error) {
      console.error("Error loading lines:", error);
    } finally {
      setLoadingLines(false);
    }
  }

  async function loadUserSettings() {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch("/api/account/settings", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) {
        console.error("Settings API error:", response.status);
        setIsAutoEntrepreneur(false);
        return;
      }
      
      const data = await response.json();
      console.log("[Ticket] ========== USER SETTINGS ==========");
      console.log("[Ticket] Full response:", data);
      console.log("[Ticket] isAutoEntrepreneur:", data.isAutoEntrepreneur);
      console.log("[Ticket] Type:", typeof data.isAutoEntrepreneur);
      console.log("[Ticket] =====================================");
      const isAE = data.isAutoEntrepreneur === true;
      console.log("[Ticket] Setting isAutoEntrepreneur to:", isAE);
      setIsAutoEntrepreneur(isAE);
    } catch (error) {
      console.error("[Ticket] Error loading settings:", error);
    }
  }

  async function handleAddLine(line: LineItem) {
    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: line.type,
          description: line.description,
          quantity: line.quantity,
          priceHT: line.priceHT,
          vatRate: line.vatRate,
          duration: line.duration,
          sourceId: line.sourceId,
          notes: line.notes,
        }),
      });

      if (response.ok) {
        await loadLines();
        setToast({ open: true, message: "Ligne ajoutée", severity: "success" });
      } else {
        throw new Error("Failed to add line");
      }
    } catch (error) {
      console.error("Error adding line:", error);
      setToast({ open: true, message: "Erreur lors de l'ajout", severity: "error" });
    }
  }

  async function handleUpdateLine(index: number, updates: Partial<LineItem>) {
    const line = lines[index];
    if (!line.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await loadLines();
      } else {
        throw new Error("Failed to update line");
      }
    } catch (error) {
      console.error("Error updating line:", error);
      setToast({ open: true, message: "Erreur lors de la modification", severity: "error" });
    }
  }

  async function handleDeleteLine(index: number) {
    const line = lines[index];
    if (!line.id) return;

    try {
      const token = localStorage.getItem("jwt_token");
      const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        await loadLines();
        setToast({ open: true, message: "Ligne supprimée", severity: "success" });
      } else {
        throw new Error("Failed to delete line");
      }
    } catch (error) {
      console.error("Error deleting line:", error);
      setToast({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  }

  // Catalog live search (outside refresh)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!catQuery || catQuery.length < 2) { setCatOptions([]); return; }
      setCatLoading(true);
      try {
        const res = await listCatalogItems({ q: catQuery, limit: 10 });
        if (!alive) return;
        setCatOptions(res.items);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setCatLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [catQuery]);

  // Load quotes for this work order
  useEffect(() => {
    if (!id) return;
    loadQuotes();
    
    // Rafraîchir les devis toutes les 10 secondes
    const interval = setInterval(() => {
      loadQuotes();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [id]);

  async function loadQuotes() {
    if (!id) return;
    
    setLoadingQuotes(true);
    try {
      const data = await listQuotes({ workOrderId: id });
      setQuotes(data);
    } catch (err) {
      console.error("Erreur chargement devis:", err);
    } finally {
      setLoadingQuotes(false);
    }
  }

  async function handleCreateQuote() {
    if (!id) return;
    
    try {
      console.log('Création devis pour ticket:', id);
      const quote = await createQuote({ workOrderId: id, validDays: 30 });
      console.log('Devis créé:', quote.id);
      
      // Importer la main d'œuvre du ticket
      try {
        console.log('Import des données du ticket vers le devis...');
        const result = await importLaborToInvoice(quote.id, id);
        console.log('Import réussi:', result);
      } catch (e: any) {
        console.error('Erreur import main d\'œuvre:', e);
        console.error('Détails:', e.message);
        // Afficher l'erreur à l'utilisateur
        setToast({
          open: true,
          message: `Attention: ${e.message || 'Erreur import données'}`,
          severity: "error",
        });
      }
      
      setToast({
        open: true,
        message: "Devis créé ! Vérifiez les lignes importées.",
        severity: "success",
      });
      
      // Attendre un peu avant de rediriger pour voir le toast
      setTimeout(() => {
        window.location.href = `/finance/invoices/${quote.id}`;
      }, 1000);
    } catch (err: any) {
      console.error('Erreur création devis:', err);
      setToast({
        open: true,
        message: `Erreur: ${err.message}`,
        severity: "error",
      });
    }
  }

  async function handleConvertQuote(quoteId: string) {
    if (!confirm("Convertir ce devis en facture ?")) return;
    
    try {
      const result = await convertQuoteToInvoice(quoteId);
      setToast({
        open: true,
        message: "Facture créée avec succès !",
        severity: "success",
      });
      window.location.href = `/finance/invoices/${result.invoice.id}`;
    } catch (err: any) {
      setToast({
        open: true,
        message: `Erreur: ${err.message}`,
        severity: "error",
      });
    }
  }

  async function onAddLabor(mins: number, note?: string) {
    try {
      await addLaborEntry(id, { minutes: mins, note });
      const le = await listLaborEntries(id);
      setLabor(le);
      setLabMinutes("");
      setLabNote("");
      setToast({ open: true, message: "Main d&apos;oeuvre ajoutée", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: ajout MO", severity: "error" });
    }
  }

  async function onCreateInvoice(pricingMode: "HT_TVA" | "AE_TTC") {
    try {
      // Créer une FACTURE directe (pas un devis)
      const inv = await createInvoice({ 
        workOrderId: id, 
        type: "invoice", // ← FACTURE
        pricingMode, 
        currency: "EUR", 
        vatRate: pricingMode === "AE_TTC" ? 0 : 20, 
        laborRate: Number(hourlyRate) || 60 
      } as any);
      
      // Importer la main d'œuvre du ticket
      try { 
        await importLaborToInvoice(inv.id, id); 
      } catch (e) {
        console.error('Erreur import main d\'œuvre:', e);
      }
      
      router.push(`/finance/invoices/${inv.id}` as any);
      setToast({ open: true, message: "Facture créée avec les pièces et la main d'œuvre !", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: création facture", severity: "error" });
    }
  }

  async function onOpenExistingInvoice() {
    try {
      const list = await listInvoices({ q: id });
      if (list.length > 0) router.push(`/finance/invoices/${list[0].id}` as any);
      else setToast({ open: true, message: "Aucune facture liée", severity: "error" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: recherche facture", severity: "error" });
    }
  }

  async function saveEstimate() {
    if (!id) return;
    setSavingEstimate(true);
    try {
      const payload: { estimatedMinutes?: number; hourlyRate?: number } = {};
      if (estimatedMinutes !== "")
        payload.estimatedMinutes = Number(estimatedMinutes);
      if (hourlyRate !== "") payload.hourlyRate = Number(hourlyRate);
      
      await saveWorkOrderEstimate(id, payload);
      await refresh();
      setToast({
        open: true,
        message: "Estimation enregistrée",
        severity: "success",
      });
    } catch (e: unknown) {
      console.error(e);
      setToast({
        open: true,
        message: "Erreur: enregistrement estimation",
        severity: "error",
      });
    } finally {
      setSavingEstimate(false);
    }
  }

  async function openQuote() {
    try {
      const q = await quoteFromWorkOrder(id);
      setQuote(q);
      setQuoteOpen(true);
    } catch (e: unknown) {
      console.error(e);
      setToast({
        open: true,
        message: "Erreur: chargement du devis",
        severity: "error",
      });
    }
  }

  async function createSale() {
    try {
      const result = await createSaleFromWorkOrder(id);
      setSaleId(result.saleId);
      setToast({ open: true, message: `Vente créée (#${result.saleId})`, severity: "success" });
      // Rester dans le modal pour proposer le téléchargement de la facture
    } catch (e: unknown) {
      console.error(e);
      setToast({ open: true, message: "Erreur: création de la vente", severity: "error" });
    }
  }

  async function onStart() {
    try {
      await startWorkOrder(id);
      await refresh();
      setToast({ open: true, message: "Intervention démarrée", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: démarrage intervention", severity: "error" });
    }
  }

  async function onReady() {
    try {
      await markWorkOrderReady(id);
      await refresh();
      setToast({ open: true, message: "Ticket marqué prêt (HubSpot synchronisé)", severity: "success" });
    } catch (e) {
      console.error(e);
      setToast({ open: true, message: "Erreur: marquage prêt", severity: "error" });
    }
  }

  async function sendEmail(event: string) {
    if (!wo?.customerId) {
      setToast({ open: true, message: "Pas de client associé", severity: "error" });
      return;
    }

    try {
      await sendCommunication({
        type: 'email',
        event,
        customerId: wo.customerId,
        workOrderId: id
      });
      setToast({ open: true, message: "Email envoyé !", severity: "success" });
    } catch (e: any) {
      console.error(e);
      setToast({ open: true, message: `Erreur: ${e.message || 'Envoi email'}`, severity: "error" });
    }
  }

  async function sendSMS(event: string) {
    if (!wo?.customerId) {
      setToast({ open: true, message: "Pas de client associé", severity: "error" });
      return;
    }

    try {
      await sendCommunication({
        type: 'sms',
        event,
        customerId: wo.customerId,
        workOrderId: id
      });
      setToast({ open: true, message: "SMS envoyé !", severity: "success" });
    } catch (e: any) {
      console.error(e);
      setToast({ open: true, message: `Erreur: ${e.message || 'Envoi SMS'}`, severity: "error" });
    }
  }

  const fullName =
    [wo?.customer?.firstName, wo?.customer?.lastName]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h4">
          Ticket {wo?.createdAt ? new Date(wo.createdAt).toLocaleDateString("fr-FR") : ""}
          {fullName ? ` — ${fullName}` : (wo?.customer?.email ? ` — ${wo.customer.email}` : "")}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={!wo || wo.status !== "created"}
            onClick={onStart}
          >
            Démarrer
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={!wo || wo.status === "ready"}
            onClick={onReady}
          >
            Marquer prêt
          </Button>
          <Divider orientation="vertical" flexItem />
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<EmailIcon />}
            disabled={!wo?.customerId}
            onClick={() => sendEmail('bike_ready')}
          >
            Email "Vélo prêt"
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            startIcon={<SmsIcon />}
            disabled={!wo?.customerId}
            onClick={() => sendSMS('bike_ready')}
          >
            SMS "Vélo prêt"
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mt: 2 }}>
        {loading && <Typography>Chargement...</Typography>}
        {wo && (
          <Stack spacing={1}>
            <Typography>
              <b>Client:</b> {fullName || wo.customer?.email || wo.customer?.firstName || wo.customer?.lastName || "Client"}
            </Typography>
            <Typography>
              <b>Email:</b> {wo.customer?.email || "-"}
            </Typography>
            <Typography>
              <b>Vélo:</b> {wo.bike ? `${wo.bike.brand || ''} ${wo.bike.model || ''}`.trim() || "Vélo" : (wo.bikeId ? "Vélo (détails non chargés)" : "-")}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Typography><b>Type:</b></Typography>
              <Select size="small" value={wType} onChange={async (e) => {
                const val = e.target.value as WorkOrderType | "";
                setWType(val);
                try { await setWorkOrderType(id, (val || null) as any); } catch (err) { console.error(err); setToast({ open: true, message: 'Erreur: type ticket', severity: 'error' }); }
              }} displayEmpty sx={{ minWidth: 220 }}>
                <MenuItem value=""><em>Non défini</em></MenuItem>
                <MenuItem value="revision">Révision</MenuItem>
                <MenuItem value="repair">Réparation</MenuItem>
                <MenuItem value="maintenance">Entretien</MenuItem>
                <MenuItem value="upgrade">Upgrade</MenuItem>
              </Select>
              {wType && <Chip size="small" label={wType} />}
            </Stack>
            <Typography>
              <b>Statut:</b> {wo.status}
            </Typography>
            <Typography>
              <b>Créé le:</b> {new Date(wo.createdAt).toLocaleString()}
            </Typography>
            <Typography>
              <b>En cours depuis:</b>{" "}
              {wo.inProgressAt
                ? new Date(wo.inProgressAt).toLocaleString()
                : "-"}
            </Typography>
            <Typography>
              <b>Prêt le:</b>{" "}
              {wo.readyAt
                ? new Date(wo.readyAt).toLocaleString()
                : "-"}
            </Typography>
            <Typography>
              <b>HubSpot fallback:</b>{" "}
              {wo.hubspotFallbackAt
                ? new Date(wo.hubspotFallbackAt).toLocaleString()
                : "-"}
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="center"
              sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}
            >
              <TextField
                label="Estimation (minutes)"
                size="small"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <TextField
                label="Taux horaire (€ / h)"
                size="small"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={saveEstimate}
                disabled={savingEstimate}
              >
                {savingEstimate
                  ? "Enregistrement..."
                  : "Enregistrer estimation"}
              </Button>
              <Button size="small" variant="outlined" onClick={openQuote}>
                Voir devis
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>

      {/* Prestations et Pièces - Nouveau système */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">Prestations et Pièces</Typography>
          <LineItemSelector
            onAddLine={handleAddLine}
            bikeType={undefined}
            isAutoEntrepreneur={isAutoEntrepreneur}
          />
        </Stack>

        {loadingLines ? (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <LineItemsTable
            lines={lines}
            onUpdateLine={handleUpdateLine}
            onDeleteLine={handleDeleteLine}
            isAutoEntrepreneur={isAutoEntrepreneur}
          />
        )}
      </Paper>

      {/* Pièces liées au ticket */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Pièces (ancien système)</Typography>
        <Stack spacing={1}>
          {parts.length === 0 && (
            <Typography variant="body2" color="text.secondary">Aucune pièce</Typography>
          )}
          {parts.length > 0 && (
            <Box>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Description</th>
                    <th style={{ textAlign: 'right' }}>Qté</th>
                    <th style={{ textAlign: 'right' }}>Prix HT</th>
                    <th style={{ textAlign: 'left' }}>Note</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, idx) => (
                    <tr key={p.id}>
                      <td>
                        <TextField size="small" value={p.description} onChange={(e) => setParts(prev => { const n=[...prev]; n[idx] = { ...n[idx], description: e.target.value }; return n; })} sx={{ minWidth: 220 }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <TextField size="small" type="number" value={p.qty} onChange={(e) => setParts(prev => { const n=[...prev]; n[idx] = { ...n[idx], qty: Number(e.target.value || 0) }; return n; })} onFocus={(e) => e.target.select()} sx={{ width: 100 }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <TextField size="small" type="number" value={p.priceHT} onChange={(e) => setParts(prev => { const n=[...prev]; n[idx] = { ...n[idx], priceHT: Number(e.target.value || 0) }; return n; })} onFocus={(e) => e.target.select()} sx={{ width: 140 }} />
                      </td>
                      <td>
                        <TextField size="small" value={p.note || ''} onChange={(e) => setParts(prev => { const n=[...prev]; n[idx] = { ...n[idx], note: e.target.value }; return n; })} sx={{ minWidth: 180 }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={async () => {
                            try {
                              const cur = parts[idx];
                              await updateWorkOrderPart(id, p.id, { description: cur.description, qty: cur.qty, priceHT: cur.priceHT, note: cur.note ?? null });
                              setToast({ open: true, message: 'Pièce enregistrée', severity: 'success' });
                            } catch (e) {
                              console.error(e);
                              setToast({ open: true, message: 'Erreur: enregistrement pièce', severity: 'error' });
                            }
                          }}>Enregistrer</Button>
                          <Button size="small" color="error" onClick={async () => {
                            try { await deleteWorkOrderPart(id, p.id); setParts(prev => prev.filter(x => x.id !== p.id)); setToast({ open: true, message: 'Pièce supprimée', severity: 'success' }); }
                            catch (e) { console.error(e); setToast({ open: true, message: 'Erreur: suppression pièce', severity: 'error' }); }
                          }}>Supprimer</Button>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Ajouter une pièce</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Box sx={{ minWidth: 280, flex: 1 }}>
              <Autocomplete
                options={catOptions}
                loading={catLoading}
                getOptionLabel={(o) => `${o.name} – ${o.priceHT.toFixed(2)}€ HT`}
                onInputChange={(_, v) => setCatQuery(v)}
                value={pCatalog}
                onChange={(_, v) => {
                  setPCatalog(v);
                  if (v) { setPDesc(v.name); setPPrice(String(v.priceHT)); }
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="Article catalogue (recherche)" placeholder="Tapez 2 caractères ou plus" InputProps={{ ...params.InputProps, endAdornment: (<>
                    {catLoading ? <CircularProgress color="inherit" size={16} /> : null}
                    {params.InputProps.endAdornment}
                  </>) }} />
                )}
              />
            </Box>
            <TextField size="small" label="Description" value={pDesc} onChange={(e) => setPDesc(e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" type="number" label="Qté" value={pQty} onChange={(e) => setPQty(e.target.value)} onFocus={(e) => e.target.select()} sx={{ width: 120 }} />
            <TextField size="small" type="number" label="Prix HT" value={pPrice} onChange={(e) => setPPrice(e.target.value)} onFocus={(e) => e.target.select()} sx={{ width: 140 }} />
            <TextField size="small" label="Note" value={pNote} onChange={(e) => setPNote(e.target.value)} sx={{ flex: 1 }} />
            <Button size="small" variant="outlined" disabled={addingPart || !pDesc.trim()}
              onClick={async () => {
                if (!pDesc.trim()) return;
                setAddingPart(true);
                try {
                  const created = await addWorkOrderPart(id, {
                    catalogItemId: pCatalog?.id,
                    description: pDesc.trim(),
                    qty: Number(pQty || 1) || 1,
                    priceHT: Number(pPrice || 0) || 0,
                    note: pNote || undefined,
                  });
                  // Refetch parts to ensure DB state is reflected
                  try {
                    const fresh = await listWorkOrderParts(id);
                    setParts(fresh.map(p => ({ id: p.id, description: p.description, qty: p.qty, priceHT: p.priceHT, note: p.note })));
                  } catch {}
                  setPCatalog(null); setCatQuery(""); setPDesc(""); setPQty("1"); setPPrice("0"); setPNote("");
                  setToast({ open: true, message: 'Pièce ajoutée', severity: 'success' });
                } catch (e) {
                  console.error(e);
                  setToast({ open: true, message: 'Erreur: ajout pièce', severity: 'error' });
                } finally {
                  setAddingPart(false);
                }
              }}>{addingPart ? 'Ajout…' : 'Ajouter'}</Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Devis</DialogTitle>
        <DialogContent>
          {!quote && <Typography>Chargement...</Typography>}
          {quote && (
            <Stack spacing={1}>
              <Typography>
                <b>Ticket:</b> {new Date(wo.createdAt).toLocaleDateString("fr-FR")}
              </Typography>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Type</th>
                    <th style={{ textAlign: "left" }}>Description</th>
                    <th>Qté</th>
                    <th>PU HT</th>
                    <th>Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((l, idx) => (
                    <tr key={idx}>
                      <td>{l.type}</td>
                      <td>{l.description}</td>
                      <td style={{ textAlign: "right" }}>{l.qty}</td>
                      <td style={{ textAlign: "right" }}>
                        {l.priceHT.toFixed(2)} €
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {l.lineTotalHT.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Stack
                direction="row"
                justifyContent="flex-end"
                spacing={3}
                sx={{ mt: 2 }}
              >
                <Typography>Pièces HT: {quote.partsHT.toFixed(2)} €</Typography>
                <Typography>MO HT: {quote.laborHT.toFixed(2)} €</Typography>
                <Typography>Total HT: {quote.totalHT.toFixed(2)} €</Typography>
                <Typography>
                  TVA ({quote.tvaRate}%): {quote.totalTVA.toFixed(2)} €
                </Typography>
                <Typography>
                  Total TTC: {quote.totalTTC.toFixed(2)} €
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setQuoteOpen(false);
              setSaleId(null);
            }}
          >
            Fermer
          </Button>
          {!saleId && (
            <Button onClick={createSale} variant="contained">
              Créer la vente
            </Button>
          )}
          {saleId && (
            <Button
              component="a"
              href={`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api"}/pos/sales/${saleId}/invoice.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
            >
              Télécharger facture
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Rendez-vous Retour */}
      {wo && (
        <AppointmentPicker
          workOrderId={id}
          currentAppointment={wo.appointmentDate}
          onAppointmentChanged={refresh}
        />
      )}

      {/* Facturation */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6">Facturation</Typography>
        </Stack>
        
        <Stack spacing={2}>
          {loadingQuotes ? (
            <Stack alignItems="center" py={2}>
              <CircularProgress size={24} />
              <Typography variant="caption" color="text.secondary" mt={1}>
                Chargement des devis...
              </Typography>
            </Stack>
          ) : quotes.length > 0 ? (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>
                  Devis existants
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={loadQuotes}
                  disabled={loadingQuotes}
                  title="Rafraîchir"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Stack>
              {quotes.map((quote) => (
                <Paper key={quote.id} sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Chip size="small" label="Devis" color="info" />
                        <Typography variant="body2" fontWeight={600}>
                          {quote.number || "Brouillon"}
                        </Typography>
                        {quote.convertedAt && (
                          <Chip size="small" label="Converti" color="success" variant="outlined" />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Créé le {new Date(quote.createdAt).toLocaleDateString("fr-FR")}
                        {quote.validUntil && ` • Valide jusqu'au ${new Date(quote.validUntil).toLocaleDateString("fr-FR")}`}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary.main" mt={0.5}>
                        {quote.totalTTC.toFixed(2)} €
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        component={Link}
                        href={`/finance/invoices/${quote.id}`}
                      >
                        Voir
                      </Button>
                      {!quote.convertedAt && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleConvertQuote(quote.id)}
                          startIcon={<TransformIcon />}
                        >
                          Convertir
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Box>
          ) : (
            <Alert severity="info">
              Aucun devis pour ce ticket. Créez-en un pour établir une estimation.
            </Alert>
          )}

          <Divider />

          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<DescriptionIcon />}
              onClick={handleCreateQuote}
              disabled={!id}
            >
              Créer un devis
            </Button>
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={() => onCreateInvoice('HT_TVA')}
              disabled={!id}
            >
              Créer une facture
            </Button>
          </Stack>
        </Stack>
      </Paper>

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
    </Container>
  );
}
