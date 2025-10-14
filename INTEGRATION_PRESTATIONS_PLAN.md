# Plan: Intégration Prestations dans Tickets/Devis/Factures

**Date**: 15 octobre 2025  
**Objectif**: Interface unifiée pour ajouter prestations, pièces et saisie manuelle

---

## 🎯 Vision Globale

### Interface Cible

```
┌─────────────────────────────────────────────────────────┐
│ TICKET #123 - Révision VTT                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ [+ Ajouter une ligne ▼]                                 │
│   ├─ 🔧 Prestation (grille tarifaire)                   │
│   ├─ 🔩 Pièce (catalogue)                               │
│   └─ ✏️  Saisie manuelle                                │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Description          Qté  PU HT   TVA    Total HT  │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 🔧 Révision complète   1   60.00€  10%    60.00€  │ │
│ │ 🔩 Chambre à air       2   12.00€  20%    24.00€  │ │
│ │ ✏️  Réparation spé.    1   35.00€  10%    35.00€  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│                              Sous-total HT:   119.00 €  │
│                              TVA 10% (MO):      9.50 €  │
│                              TVA 20% (Pièces):  4.80 €  │
│                              TOTAL TTC:       133.30 €  │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

### 1. Composant Réutilisable: `LineItemSelector`

**Emplacement**: `src/app/components/LineItemSelector.tsx`

**Props**:
```typescript
interface LineItemSelectorProps {
  onAddLine: (line: LineItem) => void;
  bikeType?: string; // Pour filtrer les prestations
}

interface LineItem {
  type: 'service' | 'part' | 'manual';
  description: string;
  quantity: number;
  priceHT: number;
  vatRate: number; // 0, 10, ou 20
  duration?: number; // Pour les prestations
  sourceId?: string; // ID de la prestation ou pièce
}
```

**Fonctionnalités**:
- Dropdown avec 3 options
- Dialog différent selon le type
- Auto-complétion pour recherche
- Pré-remplissage des prix/TVA

---

### 2. Dialog Prestation

```typescript
<Dialog title="Ajouter une prestation">
  <Autocomplete
    options={serviceRates}
    filterOptions={(options) => {
      // Filtrer par type de vélo si disponible
      if (bikeType) {
        return options.filter(o => 
          !o.bikeType || o.bikeType === bikeType
        );
      }
      return options;
    }}
    renderOption={(props, option) => (
      <Box {...props}>
        <Typography variant="body1">{option.name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {option.priceHT}€ HT • {option.duration} min
        </Typography>
      </Box>
    )}
  />
  
  <TextField label="Quantité" type="number" defaultValue={1} />
  <TextField label="Prix HT" value={selectedRate?.priceHT} />
  <Chip label={`TVA ${vatRate}%`} />
  
  <Button>Ajouter</Button>
</Dialog>
```

---

### 3. Dialog Pièce

```typescript
<Dialog title="Ajouter une pièce">
  <Autocomplete
    options={catalogItems}
    filterOptions={(options) => 
      options.filter(o => o.category === 'PIECES')
    }
    renderOption={(props, option) => (
      <Box {...props}>
        <Typography variant="body1">{option.name}</Typography>
        <Typography variant="caption">
          {option.priceHT}€ HT • Stock: {option.stockQty}
        </Typography>
      </Box>
    )}
  />
  
  <TextField label="Quantité" type="number" />
  <TextField label="Prix HT" value={selectedPart?.priceHT} />
  <Chip label="TVA 20%" />
  
  <Button>Ajouter</Button>
</Dialog>
```

---

### 4. Dialog Saisie Manuelle

```typescript
<Dialog title="Saisie manuelle">
  <TextField 
    label="Description" 
    fullWidth 
    multiline 
    rows={2}
    placeholder="Ex: Réparation spéciale cadre"
  />
  
  <TextField label="Quantité" type="number" defaultValue={1} />
  <TextField label="Prix unitaire HT" type="number" />
  
  <FormControl>
    <InputLabel>Type</InputLabel>
    <Select>
      <MenuItem value="service">Prestation (TVA 10%)</MenuItem>
      <MenuItem value="part">Pièce (TVA 20%)</MenuItem>
      <MenuItem value="custom">Personnalisé</MenuItem>
    </Select>
  </FormControl>
  
  {type === 'custom' && (
    <TextField label="Taux TVA (%)" type="number" />
  )}
  
  <Button>Ajouter</Button>
</Dialog>
```

---

## 📊 Tableau des Lignes

### Composant: `LineItemsTable`

```typescript
<TableContainer>
  <Table>
    <TableHead>
      <TableRow>
        <TableCell width="40px"></TableCell> {/* Icône */}
        <TableCell>Description</TableCell>
        <TableCell align="right">Qté</TableCell>
        <TableCell align="right">PU HT</TableCell>
        <TableCell align="right">TVA</TableCell>
        <TableCell align="right">Total HT</TableCell>
        <TableCell align="right">Actions</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {lines.map((line, index) => (
        <TableRow key={index}>
          <TableCell>
            {line.type === 'service' && <BuildIcon color="primary" />}
            {line.type === 'part' && <SettingsIcon color="secondary" />}
            {line.type === 'manual' && <EditIcon color="action" />}
          </TableCell>
          <TableCell>
            <Typography variant="body2">{line.description}</Typography>
            {line.duration && (
              <Typography variant="caption" color="text.secondary">
                Durée estimée: {line.duration} min
              </Typography>
            )}
          </TableCell>
          <TableCell align="right">
            <TextField
              type="number"
              value={line.quantity}
              onChange={(e) => updateQuantity(index, e.target.value)}
              size="small"
              sx={{ width: 60 }}
            />
          </TableCell>
          <TableCell align="right">{line.priceHT.toFixed(2)} €</TableCell>
          <TableCell align="right">
            <Chip label={`${line.vatRate}%`} size="small" />
          </TableCell>
          <TableCell align="right">
            <Typography variant="body2" fontWeight="bold">
              {(line.priceHT * line.quantity).toFixed(2)} €
            </Typography>
          </TableCell>
          <TableCell align="right">
            <IconButton size="small" onClick={() => editLine(index)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => deleteLine(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

---

## 🔄 Calcul Automatique TVA

### Logique

```typescript
function calculateTotals(lines: LineItem[]) {
  let totalHT = 0;
  let tva10 = 0; // Main d'œuvre
  let tva20 = 0; // Pièces
  let tva0 = 0;  // Si AE
  
  for (const line of lines) {
    const lineTotal = line.priceHT * line.quantity;
    totalHT += lineTotal;
    
    const lineTVA = lineTotal * (line.vatRate / 100);
    
    if (line.vatRate === 10) tva10 += lineTVA;
    else if (line.vatRate === 20) tva20 += lineTVA;
    else tva0 += lineTVA;
  }
  
  const totalTVA = tva10 + tva20 + tva0;
  const totalTTC = totalHT + totalTVA;
  
  return {
    totalHT,
    tva10,
    tva20,
    tva0,
    totalTVA,
    totalTTC,
  };
}
```

---

## 🎨 Améliorations UX

### 1. Suggestions Intelligentes

**Selon le type de vélo**:
```typescript
// Si vélo = "Électrique"
// → Suggérer prestations filtrées pour "Électrique"
// → Suggérer pièces compatibles électrique

if (bike.type === 'Électrique') {
  suggestedServices = serviceRates.filter(s => 
    s.bikeType === 'Électrique' || !s.bikeType
  );
}
```

### 2. Historique Client

```typescript
// Afficher les prestations fréquentes pour ce client
const frequentServices = await getFrequentServices(customerId);

<Alert severity="info">
  Ce client a souvent besoin de:
  {frequentServices.map(s => (
    <Chip 
      label={s.name} 
      onClick={() => addLine(s)}
      clickable
    />
  ))}
</Alert>
```

### 3. Templates/Forfaits

```typescript
// Créer des forfaits pré-définis
const packages = [
  {
    name: "Révision Complète VTT",
    lines: [
      { type: 'service', description: 'Révision complète', ... },
      { type: 'part', description: 'Huile chaîne', ... },
      { type: 'part', description: 'Câbles freins', ... },
    ]
  }
];

<Button onClick={() => addPackage(package)}>
  Ajouter forfait "Révision Complète"
</Button>
```

---

## 📱 Pages à Modifier

### 1. Page Ticket (`/tickets/[id]/page.tsx`)

**Section à ajouter**:
```typescript
<Paper sx={{ p: 2, mt: 2 }}>
  <Typography variant="h6" gutterBottom>
    Prestations et Pièces
  </Typography>
  
  <LineItemSelector 
    onAddLine={handleAddLine}
    bikeType={workOrder.bike?.type}
  />
  
  <LineItemsTable 
    lines={lines}
    onUpdateLine={handleUpdateLine}
    onDeleteLine={handleDeleteLine}
  />
  
  <Box sx={{ mt: 2, textAlign: 'right' }}>
    <Typography variant="h6">
      Total: {calculateTotals(lines).totalTTC.toFixed(2)} € TTC
    </Typography>
  </Box>
</Paper>
```

### 2. Page Devis (Nouvelle)

**Route**: `/quotes/new`

**Workflow**:
1. Sélectionner client
2. Sélectionner vélo (optionnel)
3. Ajouter lignes (prestations/pièces)
4. Générer PDF

### 3. Page Facture (Améliorer)

**Route**: `/finance/invoices/new`

**Amélioration**:
- Partir d'un ticket existant OU
- Créer de zéro avec sélecteur de lignes

---

## 🔗 Intégration Base de Données

### Modèle WorkOrderLine (Nouveau)

```prisma
model WorkOrderLine {
  id            String    @id @default(cuid())
  workOrderId   String
  type          String    // 'service' | 'part' | 'manual'
  description   String
  quantity      Int       @default(1)
  priceHT       Float
  vatRate       Float     // 0, 10, 20
  duration      Int?      // minutes
  sourceId      String?   // ID de ServiceRate ou CatalogItem
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  workOrder     WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  
  @@index([workOrderId])
}
```

### API Routes

**GET `/api/workorders/[id]/lines`** - Liste des lignes
**POST `/api/workorders/[id]/lines`** - Ajouter ligne
**PATCH `/api/workorders/[id]/lines/[lineId]`** - Modifier ligne
**DELETE `/api/workorders/[id]/lines/[lineId]`** - Supprimer ligne

---

## 📋 Checklist d'Implémentation

### Phase 1: Composants de Base
- [ ] Créer `LineItemSelector.tsx`
- [ ] Créer `LineItemsTable.tsx`
- [ ] Créer dialogs (Prestation, Pièce, Manuel)
- [ ] Logique calcul TVA

### Phase 2: Intégration Tickets
- [ ] Ajouter section lignes dans page ticket
- [ ] API routes pour WorkOrderLine
- [ ] Sauvegarder/charger lignes
- [ ] Afficher total dans ticket

### Phase 3: Génération Devis/Facture
- [ ] Utiliser lignes pour générer PDF
- [ ] Mettre à jour route `/quote-pdf`
- [ ] Mettre à jour route `/sale`

### Phase 4: Améliorations UX
- [ ] Suggestions intelligentes
- [ ] Historique client
- [ ] Templates/Forfaits
- [ ] Recherche rapide

---

## 🎯 Résultat Final

**Workflow Complet**:
```
1. CLIENT APPELLE
   ↓
2. CRÉER TICKET
   ↓
3. SÉLECTIONNER VÉLO
   ↓
4. AJOUTER PRESTATIONS
   • Révision complète (grille tarifaire) → 60€ HT
   • Diagnostic électrique (grille) → 35€ HT
   ↓
5. AJOUTER PIÈCES
   • Chambre à air (catalogue) → 12€ HT
   • Câbles freins (catalogue) → 15€ HT
   ↓
6. CALCUL AUTO
   • Total HT: 122€
   • TVA 10% (prestations): 9.50€
   • TVA 20% (pièces): 5.40€
   • Total TTC: 136.90€
   ↓
7. GÉNÉRER DEVIS PDF
   ↓
8. CLIENT ACCEPTE
   ↓
9. CRÉER FACTURE (auto depuis ticket)
   ↓
10. ENCAISSER
```

---

## 💡 Avantages

✅ **Interface unifiée** - Un seul endroit pour tout ajouter
✅ **Professionnel** - Icônes, couleurs, organisation claire
✅ **Flexible** - Prestations, pièces, ou manuel
✅ **Intelligent** - Suggestions selon vélo/client
✅ **Automatique** - Calcul TVA, totaux, durées
✅ **Traçable** - Historique, source des lignes

---

**Prêt à implémenter ?** 🚀

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
