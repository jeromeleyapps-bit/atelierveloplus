# 🔧 Patches UI - Système Devis/Factures

## Instructions

Pour chaque fichier ci-dessous :
1. Ouvrez le fichier dans votre éditeur
2. Trouvez la section indiquée
3. Ajoutez ou modifiez le code comme indiqué

---

## 1. Page Finance - Onglets et Filtres

**Fichier**: `src/app/finance/page.tsx`

### A. Ajouter les imports (ligne ~60)

```typescript
// Ajouter ces imports
import DescriptionIcon from "@mui/icons-material/Description";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import CreateQuoteDialog from "./components/CreateQuoteDialog";
```

### B. Ajouter l'état documentType (ligne ~80, après les autres useState)

```typescript
const [documentType, setDocumentType] = useState<"quotes" | "invoices" | "credits">("invoices");
const [createQuoteDialogOpen, setCreateQuoteDialogOpen] = useState(false);
```

### C. Modifier le filtrage (ligne ~150, dans useMemo ou avant le return)

```typescript
// Filtrer par type de document
const filteredInvoices = useMemo(() => {
  return invoices.filter(inv => {
    if (documentType === "quotes") return inv.type === "quote";
    if (documentType === "credits") return inv.type === "credit";
    return inv.type === "invoice";
  });
}, [invoices, documentType]);
```

### D. Ajouter les onglets dans le JSX (après le titre "Finance", avant la liste)

```tsx
<Tabs 
  value={documentType} 
  onChange={(_, val) => setDocumentType(val)}
  sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
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

### E. Modifier le bouton "Créer" (remplacer le bouton existant)

```tsx
<Button
  variant="contained"
  startIcon={<AddIcon />}
  onClick={() => {
    if (documentType === "quotes") {
      setCreateQuoteDialogOpen(true);
    } else if (documentType === "credits") {
      // TODO: Dialog création avoir
      alert("Création d'avoir à implémenter");
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

### F. Ajouter le dialog à la fin du JSX (avant le dernier </PageShell>)

```tsx
<CreateQuoteDialog
  open={createQuoteDialogOpen}
  onClose={() => setCreateQuoteDialogOpen(false)}
  onSuccess={(quoteId) => {
    setCreateQuoteDialogOpen(false);
    refresh();
  }}
/>
```

### G. Ajouter badge type dans la colonne Numéro (dans le TableBody)

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
    <Typography variant="body2">
      {invoice.number || "-"}
    </Typography>
  </Stack>
</TableCell>
```

### H. Utiliser filteredInvoices au lieu de invoices dans le map

```tsx
{/* Remplacer */}
{invoices.map((invoice) => (

{/* Par */}
{filteredInvoices.map((invoice) => (
```

---

## 2. Page Devis/Facture - Bouton Conversion

**Fichier**: `src/app/finance/invoices/[id]/page.tsx`

### A. Ajouter les imports (ligne ~10)

```typescript
import TransformIcon from "@mui/icons-material/Transform";
import { convertQuoteToInvoice } from "@/lib/api";
```

### B. Ajouter l'état converting (ligne ~50, après les autres useState)

```typescript
const [converting, setConverting] = useState(false);
```

### C. Ajouter la fonction de conversion (ligne ~100, avant le return)

```typescript
const handleConvertToInvoice = async () => {
  if (!confirm("Convertir ce devis en facture ? Cette action est irréversible.")) {
    return;
  }

  setConverting(true);
  try {
    const result = await convertQuoteToInvoice(invoice.id);
    setToast({
      open: true,
      message: "Devis converti en facture avec succès !",
      severity: "success",
    });
    // Rediriger vers la nouvelle facture
    setTimeout(() => {
      window.location.href = `/finance/invoices/${result.invoice.id}`;
    }, 1500);
  } catch (err: any) {
    setToast({
      open: true,
      message: `Erreur: ${err.message}`,
      severity: "error",
    });
  } finally {
    setConverting(false);
  }
};
```

### D. Ajouter l'alerte d'expiration (dans le JSX, après le titre)

```tsx
{invoice.type === "quote" && invoice.validUntil && (
  <Alert 
    severity={new Date(invoice.validUntil) < new Date() ? "error" : "info"}
    sx={{ mb: 2 }}
  >
    {new Date(invoice.validUntil) < new Date() ? (
      <>⚠️ Devis expiré le {new Date(invoice.validUntil).toLocaleDateString("fr-FR")}</>
    ) : (
      <>📅 Valide jusqu'au {new Date(invoice.validUntil).toLocaleDateString("fr-FR")}</>
    )}
  </Alert>
)}
```

### E. Ajouter le bouton conversion (dans la section actions, après les autres boutons)

```tsx
{invoice.type === "quote" && !invoice.convertedAt && invoice.status === "draft" && (
  <Button
    variant="contained"
    color="success"
    startIcon={<TransformIcon />}
    onClick={handleConvertToInvoice}
    disabled={converting}
    size="large"
  >
    {converting ? "Conversion..." : "Convertir en facture"}
  </Button>
)}

{invoice.type === "quote" && invoice.convertedAt && (
  <Alert severity="success" sx={{ mt: 2 }}>
    ✅ Devis converti en facture le {new Date(invoice.convertedAt).toLocaleDateString("fr-FR")}
    {invoice.convertedToId && (
      <Button
        size="small"
        component={Link}
        href={`/finance/invoices/${invoice.convertedToId}`}
        sx={{ ml: 2 }}
      >
        Voir la facture →
      </Button>
    )}
  </Alert>
)}
```

### F. Modifier le titre selon le type

```tsx
{/* Remplacer le titre statique par */}
<Typography variant="h4" gutterBottom>
  {invoice.type === "quote" ? "Devis" : 
   invoice.type === "credit" ? "Avoir" : 
   "Facture"} {invoice.number || invoice.id.slice(0, 8)}
</Typography>
```

---

## 3. Page Ticket - Section Facturation

**Fichier**: `src/app/tickets/[id]/page.tsx`

### A. Ajouter les imports (ligne ~20)

```typescript
import { 
  createQuote, 
  listQuotes, 
  convertQuoteToInvoice,
  type Invoice 
} from "@/lib/api";
import DescriptionIcon from "@mui/icons-material/Description";
```

### B. Ajouter l'état quotes (ligne ~80, après les autres useState)

```typescript
const [quotes, setQuotes] = useState<Invoice[]>([]);
const [loadingQuotes, setLoadingQuotes] = useState(false);
```

### C. Ajouter la fonction de chargement des devis (ligne ~150)

```typescript
const loadQuotes = useCallback(async () => {
  if (!workOrderId) return;
  
  setLoadingQuotes(true);
  try {
    const data = await listQuotes({ workOrderId });
    setQuotes(data);
  } catch (err) {
    console.error("Erreur chargement devis:", err);
  } finally {
    setLoadingQuotes(false);
  }
}, [workOrderId]);

useEffect(() => {
  loadQuotes();
}, [loadQuotes]);
```

### D. Ajouter les fonctions d'action (ligne ~180)

```typescript
const handleCreateQuote = async () => {
  if (!workOrderId) return;
  
  try {
    const quote = await createQuote({ workOrderId, validDays: 30 });
    setToast({
      open: true,
      message: "Devis créé avec succès !",
      severity: "success",
    });
    // Rediriger vers le devis
    window.location.href = `/finance/invoices/${quote.id}`;
  } catch (err: any) {
    setToast({
      open: true,
      message: `Erreur: ${err.message}`,
      severity: "error",
    });
  }
};

const handleConvertQuote = async (quoteId: string) => {
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
};
```

### E. Ajouter la section Facturation dans le JSX (après la section Pièces)

```tsx
<SectionCard title="Facturation" icon={<ReceiptIcon color="primary" />}>
  <Stack spacing={2}>
    {/* Liste des devis existants */}
    {loadingQuotes ? (
      <Stack alignItems="center" py={2}>
        <CircularProgress size={24} />
        <Typography variant="caption" color="text.secondary" mt={1}>
          Chargement des devis...
        </Typography>
      </Stack>
    ) : quotes.length > 0 ? (
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
          Devis existants
        </Typography>
        {quotes.map((quote) => (
          <Paper key={quote.id} sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Chip
                    size="small"
                    label="Devis"
                    color="info"
                  />
                  <Typography variant="body2" fontWeight={600}>
                    {quote.number || `#${quote.id.slice(0, 8)}`}
                  </Typography>
                  {quote.convertedAt && (
                    <Chip
                      size="small"
                      label="Converti"
                      color="success"
                      variant="outlined"
                    />
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

    {/* Boutons d'action */}
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Button
        variant="outlined"
        startIcon={<DescriptionIcon />}
        onClick={handleCreateQuote}
        disabled={!workOrderId}
      >
        Créer un devis
      </Button>
      <Button
        variant="contained"
        startIcon={<ReceiptIcon />}
        onClick={() => {
          // Logique existante pour créer une facture directe
          window.location.href = `/finance?workOrderId=${workOrderId}`;
        }}
        disabled={!workOrderId}
      >
        Facture directe
      </Button>
    </Stack>
  </Stack>
</SectionCard>
```

---

## 4. Numérotation DEV/FAC/AVO

**Fichier**: `src/app/api/finance/invoices/[id]/issue/route.ts`

### Modifier la génération de numéro (ligne ~30)

```typescript
// Remplacer la logique de génération de numéro par :

// Déterminer le préfixe selon le type
const prefix = invoice.type === "quote" ? "DEV" : 
               invoice.type === "credit" ? "AVO" : "FAC";

const year = new Date().getFullYear();

// Chercher ou créer la séquence pour cette année
let seq = await prisma.invoiceSequence.findUnique({ 
  where: { year } 
});

if (!seq) {
  seq = await prisma.invoiceSequence.create({
    data: { year, lastNumber: 0 },
  });
}

// Incrémenter
const nextNumber = seq.lastNumber + 1;
await prisma.invoiceSequence.update({
  where: { year },
  data: { lastNumber: nextNumber },
});

// Générer le numéro final
const number = `${prefix}-${year}-${String(nextNumber).padStart(4, "0")}`;
// Exemples: DEV-2024-0001, FAC-2024-0002, AVO-2024-0003
```

---

## 5. Imports Manquants

Si vous avez des erreurs d'imports, ajoutez :

```typescript
import Link from "next/link";
import TransformIcon from "@mui/icons-material/Transform";
import DescriptionIcon from "@mui/icons-material/Description";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import { Chip, Alert, Divider, CircularProgress } from "@mui/material";
```

---

## ✅ Checklist d'Application

- [ ] Page Finance - Onglets ajoutés
- [ ] Page Finance - Dialog CreateQuote importé
- [ ] Page Finance - Filtrage par type
- [ ] Page Finance - Badge type dans liste
- [ ] Page Devis - Alert expiration
- [ ] Page Devis - Bouton conversion
- [ ] Page Devis - Alert si converti
- [ ] Page Ticket - Section facturation
- [ ] Page Ticket - Liste devis
- [ ] Page Ticket - Boutons actions
- [ ] API Issue - Numérotation DEV/FAC/AVO

---

## 🧪 Tests Après Application

1. **Page Finance**
   - Cliquer sur onglet "Devis" → Voir seulement les devis
   - Cliquer "Créer un devis" → Dialog s'ouvre
   - Créer un devis → Redirection vers page devis

2. **Page Devis**
   - Voir badge "Devis" et date d'expiration
   - Cliquer "Convertir en facture" → Confirmation
   - Après conversion → Voir alert "Converti" avec lien

3. **Page Ticket**
   - Voir section "Facturation"
   - Cliquer "Créer un devis" → Devis créé
   - Voir devis dans la liste
   - Cliquer "Convertir" → Facture créée

---

**Appliquez ces patches dans l'ordre et testez après chaque modification !** 🚀
