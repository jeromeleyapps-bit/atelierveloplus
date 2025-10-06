# 🎨 Guide d'Implémentation UI - Système Devis/Factures

## ✅ Backend Prêt
- Client Prisma généré
- API routes fonctionnelles
- Migration appliquée

---

## 🎯 Modifications UI à Faire

### 1. Page Finance - Ajouter Onglets

**Fichier**: `src/app/finance/page.tsx`

**Modifications**:

#### A. Ajouter les imports
```typescript
import { Tabs, Tab } from "@mui/material";
import { useState } from "react";
```

#### B. Ajouter l'état des onglets (ligne ~80)
```typescript
const [documentType, setDocumentType] = useState<"quotes" | "invoices" | "credits">("invoices");
```

#### C. Modifier le filtre de liste (ligne ~150)
```typescript
// Filtrer par type de document
const filteredInvoices = useMemo(() => {
  return invoices.filter(inv => {
    if (documentType === "quotes") return inv.type === "quote";
    if (documentType === "credits") return inv.type === "credit";
    return inv.type === "invoice"; // Par défaut: factures
  });
}, [invoices, documentType]);
```

#### D. Ajouter les onglets dans le JSX (après le titre)
```tsx
<Tabs 
  value={documentType} 
  onChange={(_, val) => setDocumentType(val)}
  sx={{ mb: 2 }}
>
  <Tab 
    value="quotes" 
    label="Devis" 
    icon={<DescriptionIcon />}
    iconPosition="start"
  />
  <Tab 
    value="invoices" 
    label="Factures" 
    icon={<ReceiptIcon />}
    iconPosition="start"
  />
  <Tab 
    value="credits" 
    label="Avoirs" 
    icon={<CreditCardIcon />}
    iconPosition="start"
  />
</Tabs>
```

#### E. Adapter le bouton "Créer" selon l'onglet
```tsx
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => {
    if (documentType === "quotes") {
      // Ouvrir dialog création devis
      setCreateQuoteDialogOpen(true);
    } else {
      // Logique existante pour facture
      setCreateDialogOpen(true);
    }
  }}
>
  {documentType === "quotes" ? "Créer un devis" : 
   documentType === "credits" ? "Créer un avoir" : 
   "Créer une facture"}
</Button>
```

#### F. Ajouter badge type dans la liste
```tsx
<TableCell>
  <Stack direction="row" spacing={1} alignItems="center">
    <Chip
      size="small"
      label={
        invoice.type === "quote" ? "Devis" :
        invoice.type === "credit" ? "Avoir" :
        "Facture"
      }
      color={
        invoice.type === "quote" ? "info" :
        invoice.type === "credit" ? "warning" :
        "primary"
      }
    />
    {invoice.number || "-"}
  </Stack>
</TableCell>
```

---

### 2. Dialog Création Devis

**Nouveau composant**: `src/app/finance/components/CreateQuoteDialog.tsx`

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Stack,
  Alert,
} from "@mui/material";
import { createQuote, type WorkOrder } from "@/lib/api";

interface CreateQuoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (quoteId: string) => void;
  workOrders: WorkOrder[]; // Liste des tickets
}

export default function CreateQuoteDialog({
  open,
  onClose,
  onSuccess,
  workOrders,
}: CreateQuoteDialogProps) {
  const [workOrderId, setWorkOrderId] = useState("");
  const [validDays, setValidDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!workOrderId) {
      setError("Veuillez sélectionner un ticket");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const quote = await createQuote({ workOrderId, validDays });
      onSuccess(quote.id);
      onClose();
      // Rediriger vers la page du devis
      window.location.href = `/finance/invoices/${quote.id}`;
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création du devis");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Créer un devis</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          
          <Autocomplete
            options={workOrders}
            getOptionLabel={(wo) => 
              `${wo.id.slice(0, 8)}... - ${wo.customer?.firstName || ""} ${wo.customer?.lastName || ""}`
            }
            onChange={(_, val) => setWorkOrderId(val?.id || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Ticket / Ordre de réparation"
                required
                helperText="Sélectionnez le ticket pour lequel créer le devis"
              />
            )}
          />

          <TextField
            label="Validité (jours)"
            type="number"
            value={validDays}
            onChange={(e) => setValidDays(parseInt(e.target.value) || 30)}
            helperText="Nombre de jours avant expiration du devis"
            inputProps={{ min: 1, max: 365 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={creating}>
          Annuler
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={creating || !workOrderId}
        >
          {creating ? "Création..." : "Créer le devis"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

### 3. Bouton "Convertir en Facture"

**Fichier**: `src/app/finance/invoices/[id]/page.tsx`

**Ajouter dans la section actions** (ligne ~200):

```tsx
{invoice.type === "quote" && !invoice.convertedAt && (
  <Button
    variant="contained"
    color="success"
    startIcon={<TransformIcon />}
    onClick={handleConvertToInvoice}
    disabled={converting}
  >
    {converting ? "Conversion..." : "Convertir en facture"}
  </Button>
)}

{invoice.type === "quote" && invoice.convertedAt && (
  <Alert severity="info">
    Devis converti en facture le {new Date(invoice.convertedAt).toLocaleDateString()}
    {invoice.convertedToId && (
      <Button
        size="small"
        component={Link}
        href={`/finance/invoices/${invoice.convertedToId}`}
        sx={{ ml: 2 }}
      >
        Voir la facture
      </Button>
    )}
  </Alert>
)}
```

**Ajouter la fonction de conversion**:

```typescript
const [converting, setConverting] = useState(false);

const handleConvertToInvoice = async () => {
  if (!confirm("Convertir ce devis en facture ?")) return;

  setConverting(true);
  try {
    const result = await convertQuoteToInvoice(invoice.id);
    alert(`Facture créée avec succès !`);
    // Rediriger vers la nouvelle facture
    window.location.href = `/finance/invoices/${result.invoice.id}`;
  } catch (err: any) {
    alert(`Erreur: ${err.message}`);
  } finally {
    setConverting(false);
  }
};
```

---

### 4. Bouton "Créer Devis" depuis Page Ticket

**Fichier**: `src/app/tickets/[id]/page.tsx`

**Ajouter dans la section facturation** (ligne ~300):

```tsx
<SectionCard title="Facturation" icon={<ReceiptIcon />}>
  <Stack spacing={2}>
    {/* Afficher les devis existants */}
    {quotes.length > 0 && (
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Devis existants
        </Typography>
        {quotes.map((quote) => (
          <Paper key={quote.id} sx={{ p: 2, mb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="body2">
                  Devis {quote.number || quote.id.slice(0, 8)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Créé le {new Date(quote.createdAt).toLocaleDateString()}
                  {quote.validUntil && ` - Valide jusqu'au ${new Date(quote.validUntil).toLocaleDateString()}`}
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {quote.totalTTC.toFixed(2)} €
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  component={Link}
                  href={`/finance/invoices/${quote.id}`}
                >
                  Voir
                </Button>
                {!quote.convertedAt && (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handleConvertQuote(quote.id)}
                  >
                    Convertir
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Box>
    )}

    {/* Boutons d'action */}
    <Stack direction="row" spacing={2}>
      <Button
        variant="outlined"
        startIcon={<DescriptionIcon />}
        onClick={handleCreateQuote}
      >
        Créer un devis
      </Button>
      <Button
        variant="contained"
        startIcon={<ReceiptIcon />}
        onClick={handleCreateInvoice}
      >
        Facture directe
      </Button>
    </Stack>
  </Stack>
</SectionCard>
```

**Ajouter les fonctions**:

```typescript
const [quotes, setQuotes] = useState<Invoice[]>([]);

// Charger les devis au montage
useEffect(() => {
  loadQuotes();
}, [workOrderId]);

const loadQuotes = async () => {
  try {
    const data = await listQuotes({ workOrderId });
    setQuotes(data);
  } catch (err) {
    console.error("Erreur chargement devis:", err);
  }
};

const handleCreateQuote = async () => {
  try {
    const quote = await createQuote({ workOrderId, validDays: 30 });
    window.location.href = `/finance/invoices/${quote.id}`;
  } catch (err: any) {
    alert(`Erreur: ${err.message}`);
  }
};

const handleConvertQuote = async (quoteId: string) => {
  if (!confirm("Convertir ce devis en facture ?")) return;
  
  try {
    const result = await convertQuoteToInvoice(quoteId);
    alert("Facture créée !");
    window.location.href = `/finance/invoices/${result.invoice.id}`;
  } catch (err: any) {
    alert(`Erreur: ${err.message}`);
  }
};
```

---

### 5. Affichage Date d'Expiration Devis

**Fichier**: `src/app/finance/invoices/[id]/page.tsx`

**Ajouter dans les détails du document**:

```tsx
{invoice.type === "quote" && invoice.validUntil && (
  <Alert 
    severity={new Date(invoice.validUntil) < new Date() ? "error" : "info"}
    sx={{ mb: 2 }}
  >
    {new Date(invoice.validUntil) < new Date() ? (
      <>Devis expiré le {new Date(invoice.validUntil).toLocaleDateString()}</>
    ) : (
      <>Valide jusqu'au {new Date(invoice.validUntil).toLocaleDateString()}</>
    )}
  </Alert>
)}
```

---

### 6. Numérotation Devis vs Factures

**Fichier**: `src/app/api/finance/invoices/[id]/issue/route.ts`

**Modifier la génération de numéro** (ligne ~30):

```typescript
// Générer le numéro selon le type
const prefix = invoice.type === "quote" ? "DEV" : 
               invoice.type === "credit" ? "AVO" : "FAC";

const year = new Date().getFullYear();
let seq = await prisma.invoiceSequence.findUnique({ where: { year } });

if (!seq) {
  seq = await prisma.invoiceSequence.create({
    data: { year, lastNumber: 0 },
  });
}

const nextNumber = seq.lastNumber + 1;
await prisma.invoiceSequence.update({
  where: { year },
  data: { lastNumber: nextNumber },
});

const number = `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
// Ex: DEV-2024-0001, FAC-2024-0001, AVO-2024-0001
```

---

## 🎨 Icônes à Ajouter

```typescript
import DescriptionIcon from "@mui/icons-material/Description"; // Devis
import ReceiptIcon from "@mui/icons-material/Receipt"; // Facture
import CreditCardIcon from "@mui/icons-material/CreditCard"; // Avoir
import TransformIcon from "@mui/icons-material/Transform"; // Conversion
```

---

## 🎯 Checklist d'Implémentation

### Page Finance
- [ ] Ajouter onglets (Devis/Factures/Avoirs)
- [ ] Filtrer par type de document
- [ ] Adapter bouton "Créer" selon l'onglet
- [ ] Ajouter badge type dans la liste
- [ ] Créer dialog création devis

### Page Devis/Facture
- [ ] Afficher badge type
- [ ] Afficher date d'expiration (devis)
- [ ] Bouton "Convertir en facture"
- [ ] Alert si déjà converti
- [ ] Lien vers facture créée

### Page Ticket
- [ ] Section "Facturation"
- [ ] Liste des devis existants
- [ ] Bouton "Créer un devis"
- [ ] Bouton "Facture directe"
- [ ] Bouton "Convertir" par devis

### API
- [ ] Numérotation DEV/FAC/AVO
- [ ] Gestion expiration devis

---

## 🚀 Ordre d'Implémentation Recommandé

1. **Page Finance** - Onglets et filtres (30 min)
2. **Dialog Création Devis** - Nouveau composant (20 min)
3. **Page Devis** - Badge et bouton conversion (15 min)
4. **Page Ticket** - Section facturation (25 min)
5. **Numérotation** - Préfixes DEV/FAC/AVO (10 min)

**Total estimé: ~2 heures**

---

## 💡 Améliorations Futures

- [ ] Envoi email devis
- [ ] Acceptation devis par client
- [ ] Génération PDF devis
- [ ] Expiration automatique
- [ ] Historique devis → facture
- [ ] Statistiques devis (taux conversion)

---

**Voulez-vous que je commence à implémenter ces modifications maintenant ?** 🚀
