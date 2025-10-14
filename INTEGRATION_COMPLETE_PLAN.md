# Plan d'Intégration Complète - Système de Lignes

**Date**: 15 octobre 2025  
**Objectif**: Intégrer le système de lignes dans Tickets, Devis et Factures

---

## 🎯 Checklist Globale

### Phase 1: Correction TVA Auto-Entrepreneur
- [x] Vérifier API `/api/account/settings` → OK
- [ ] Vérifier chargement dans ticket
- [ ] Ajouter logs détaillés
- [ ] Tester avec case cochée/décochée

### Phase 2: Intégration Devis
- [ ] Modifier `CreateQuoteDialog.tsx`
- [ ] Ajouter LineItemSelector
- [ ] Ajouter LineItemsTable
- [ ] Envoyer lignes à l'API

### Phase 3: Intégration Factures
- [ ] Modifier `CreateInvoiceDialog.tsx`
- [ ] Ajouter LineItemSelector
- [ ] Ajouter LineItemsTable
- [ ] Envoyer lignes à l'API

### Phase 4: Tests
- [ ] Test TVA AE dans tickets
- [ ] Test création devis avec lignes
- [ ] Test création facture avec lignes
- [ ] Test PDF avec lignes

---

## 📋 Détails d'Implémentation

### 1. Correction TVA (Tickets)

**Problème identifié**: Le chargement fonctionne mais peut-être pas appliqué correctement

**Solution**:
1. Ajouter logs détaillés dans `loadUserSettings()`
2. Vérifier que `isAutoEntrepreneur` est bien passé
3. Forcer un re-render après chargement

**Code à ajouter**:
```typescript
async function loadUserSettings() {
  try {
    const response = await fetch("/api/account/settings");
    const data = await response.json();
    console.log("[Ticket] ========== USER SETTINGS ==========");
    console.log("[Ticket] Full response:", data);
    console.log("[Ticket] isAutoEntrepreneur:", data.isAutoEntrepreneur);
    console.log("[Ticket] Type:", typeof data.isAutoEntrepreneur);
    console.log("[Ticket] =====================================");
    setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}
```

---

### 2. Intégration Devis

**Fichier**: `apps/web/src/app/finance/components/CreateQuoteDialog.tsx`

**Étapes**:

#### A. Imports
```typescript
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";
```

#### B. États
```typescript
const [lines, setLines] = useState<LineItem[]>([]);
const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
```

#### C. Chargement Settings
```typescript
useEffect(() => {
  if (open) {
    loadUserSettings();
  }
}, [open]);

async function loadUserSettings() {
  try {
    const response = await fetch("/api/account/settings");
    const data = await response.json();
    setIsAutoEntrepreneur(data.isAutoEntrepreneur === true);
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}
```

#### D. Fonctions de Gestion
```typescript
function handleAddLine(line: LineItem) {
  setLines([...lines, { ...line, id: `temp-${Date.now()}` }]);
}

function handleUpdateLine(index: number, updates: Partial<LineItem>) {
  const newLines = [...lines];
  newLines[index] = { ...newLines[index], ...updates };
  setLines(newLines);
}

function handleDeleteLine(index: number) {
  setLines(lines.filter((_, i) => i !== index));
}
```

#### E. JSX dans le Dialog
```typescript
<DialogContent>
  {/* Sélection client/vélo existant */}
  
  <Divider sx={{ my: 3 }} />
  
  <Typography variant="h6" gutterBottom>
    Prestations et Pièces
  </Typography>
  
  <LineItemSelector
    onAddLine={handleAddLine}
    isAutoEntrepreneur={isAutoEntrepreneur}
  />
  
  <Box sx={{ mt: 2 }}>
    <LineItemsTable
      lines={lines}
      onUpdateLine={handleUpdateLine}
      onDeleteLine={handleDeleteLine}
      isAutoEntrepreneur={isAutoEntrepreneur}
    />
  </Box>
</DialogContent>
```

#### F. Envoi à l'API
```typescript
async function handleSubmit() {
  // ... code existant ...
  
  // Créer le devis
  const quoteResponse = await createQuote({
    customerId,
    // ... autres champs
  });
  
  // Ajouter les lignes
  if (lines.length > 0) {
    const token = localStorage.getItem("jwt_token");
    for (const line of lines) {
      await fetch(`/api/workorders/${quoteResponse.workOrderId}/lines`, {
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
    }
  }
  
  onSuccess();
}
```

---

### 3. Intégration Factures

**Fichier**: `apps/web/src/app/finance/components/CreateInvoiceDialog.tsx`

**Même structure que Devis**:
1. Imports identiques
2. États identiques
3. Fonctions identiques
4. JSX similaire
5. Envoi à l'API adapté

**Différence**: Envoyer les lignes à l'invoice au lieu du workOrder

---

## 🧪 Tests à Effectuer

### Test 1: TVA Auto-Entrepreneur (Tickets)

**Étapes**:
1. Ouvrir console (F12)
2. Aller dans "Mon compte"
3. Cocher "Auto-entrepreneur"
4. Enregistrer
5. Ouvrir un ticket
6. Vérifier logs:
   ```
   [Ticket] ========== USER SETTINGS ==========
   [Ticket] isAutoEntrepreneur: true
   ```
7. Ajouter une ligne
8. Vérifier TVA: 0%

**Résultat attendu**: TVA à 0% pour toutes les lignes

---

### Test 2: Création Devis avec Lignes

**Étapes**:
1. Finance → Devis
2. Cliquer "Nouveau devis"
3. Sélectionner client
4. Ajouter 2 prestations
5. Ajouter 1 pièce
6. Vérifier totaux
7. Créer le devis
8. Vérifier que les lignes sont sauvegardées

**Résultat attendu**: Devis créé avec 3 lignes

---

### Test 3: Création Facture avec Lignes

**Étapes**:
1. Finance → Factures
2. Cliquer "Nouvelle facture"
3. Sélectionner client
4. Ajouter 1 prestation
5. Ajouter 2 pièces
6. Vérifier totaux
7. Créer la facture
8. Vérifier que les lignes sont sauvegardées

**Résultat attendu**: Facture créée avec 3 lignes

---

### Test 4: PDF avec Lignes

**Étapes**:
1. Créer un ticket avec lignes
2. Générer PDF
3. Vérifier que les lignes apparaissent
4. Vérifier les totaux

**Résultat attendu**: PDF avec lignes et totaux corrects

---

## 📊 Progression

- [x] Modèle de données (WorkOrderLine)
- [x] API Routes (CRUD)
- [x] Composants (Selector + Table)
- [x] Intégration Tickets
- [ ] Correction TVA AE
- [ ] Intégration Devis
- [ ] Intégration Factures
- [ ] Tests complets

---

**Temps estimé restant**: 1h

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
