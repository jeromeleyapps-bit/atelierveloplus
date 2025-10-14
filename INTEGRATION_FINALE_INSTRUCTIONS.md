# Instructions: Intégration Finale dans Page Ticket

**Fichier**: `apps/web/src/app/tickets/[id]/page.tsx`

---

## 📋 Étape 1: Ajouter les Imports

**En haut du fichier**, après les imports existants, ajouter:

```typescript
import LineItemSelector, { LineItem } from "@/app/components/LineItemSelector";
import LineItemsTable from "@/app/components/LineItemsTable";
```

---

## 📋 Étape 2: Ajouter les États

**Dans le composant**, après les `useState` existants, ajouter:

```typescript
const [lines, setLines] = useState<LineItem[]>([]);
const [loadingLines, setLoadingLines] = useState(false);
const [isAutoEntrepreneur, setIsAutoEntrepreneur] = useState(false);
```

---

## 📋 Étape 3: Charger les Lignes

**Dans `useEffect`**, après le chargement du ticket, ajouter:

```typescript
useEffect(() => {
  if (id) {
    loadLines();
    loadUserSettings();
  }
}, [id]);

async function loadLines() {
  try {
    setLoadingLines(true);
    const response = await fetch(`/api/workorders/${id}/lines`);
    const data = await response.json();
    setLines(data.lines || []);
  } catch (error) {
    console.error("Error loading lines:", error);
  } finally {
    setLoadingLines(false);
  }
}

async function loadUserSettings() {
  try {
    const response = await fetch("/api/account/settings");
    const data = await response.json();
    setIsAutoEntrepreneur(data.isAutoEntrepreneur || false);
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}
```

---

## 📋 Étape 4: Fonctions de Gestion des Lignes

**Ajouter ces fonctions**:

```typescript
async function handleAddLine(line: LineItem) {
  try {
    const token = localStorage.getItem("jwt_token");
    const response = await fetch(`/api/workorders/${id}/lines`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(line),
    });

    if (!response.ok) throw new Error("Erreur lors de l'ajout");

    const newLine = await response.json();
    setLines([...lines, newLine]);
    setSnackbar({ open: true, message: "Ligne ajoutée avec succès", severity: "success" });
  } catch (error) {
    console.error("Error adding line:", error);
    setSnackbar({ open: true, message: "Erreur lors de l'ajout", severity: "error" });
  }
}

async function handleUpdateLine(index: number, updates: Partial<LineItem>) {
  try {
    const line = lines[index];
    if (!line.id) return;

    const token = localStorage.getItem("jwt_token");
    const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error("Erreur lors de la mise à jour");

    const updatedLine = await response.json();
    const newLines = [...lines];
    newLines[index] = updatedLine;
    setLines(newLines);
  } catch (error) {
    console.error("Error updating line:", error);
    setSnackbar({ open: true, message: "Erreur lors de la mise à jour", severity: "error" });
  }
}

async function handleDeleteLine(index: number) {
  if (!confirm("Êtes-vous sûr de vouloir supprimer cette ligne ?")) return;

  try {
    const line = lines[index];
    if (!line.id) return;

    const token = localStorage.getItem("jwt_token");
    const response = await fetch(`/api/workorders/${id}/lines/${line.id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) throw new Error("Erreur lors de la suppression");

    setLines(lines.filter((_, i) => i !== index));
    setSnackbar({ open: true, message: "Ligne supprimée", severity: "success" });
  } catch (error) {
    console.error("Error deleting line:", error);
    setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
  }
}
```

---

## 📋 Étape 5: Ajouter la Section dans le JSX

**Juste AVANT la section "Pièces liées au ticket"** (ligne ~581), ajouter:

```typescript
{/* Prestations et Pièces - Nouveau système */}
<Paper sx={{ p: 2, mt: 2 }}>
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
    <Typography variant="h6">Prestations et Pièces</Typography>
    <LineItemSelector
      onAddLine={handleAddLine}
      bikeType={workOrder?.bike?.type}
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
```

---

## 📋 Étape 6: Migration Prisma

**Avant de tester**, exécuter:

```powershell
cd apps\web
npx prisma db push
npx prisma generate
```

---

## 🎯 Résultat Attendu

Après l'intégration, la page ticket aura:

1. **Section "Prestations et Pièces"** avec:
   - Bouton "Ajouter une ligne" (dropdown 3 options)
   - Tableau des lignes avec icônes
   - Calcul automatique des totaux
   - TVA différenciée (10%/20%/0%)

2. **Fonctionnalités**:
   - ✅ Ajouter prestation depuis grille tarifaire
   - ✅ Ajouter pièce depuis catalogue
   - ✅ Saisie manuelle
   - ✅ Modifier quantité en ligne
   - ✅ Supprimer ligne
   - ✅ Calcul auto HT/TVA/TTC

3. **Affichage**:
   - 🔧 Icône bleue pour prestations
   - 🔩 Icône violette pour pièces
   - ✏️ Icône grise pour saisie manuelle
   - Chips colorés pour TVA (0%/10%/20%)
   - Récapitulatif détaillé des totaux

---

## 🧪 Tests à Effectuer

### Test 1: Ajouter une Prestation

1. Ouvrir un ticket
2. Cliquer "Ajouter une ligne" → "Prestation"
3. Rechercher "Révision"
4. Sélectionner une prestation
5. Vérifier: Prix et durée pré-remplis
6. Cliquer "Ajouter"
7. Vérifier: Ligne apparaît avec icône 🔧
8. Vérifier: TVA 10% (ou 0% si AE)

### Test 2: Ajouter une Pièce

1. Cliquer "Ajouter une ligne" → "Pièce"
2. Rechercher une pièce
3. Sélectionner
4. Vérifier: Prix pré-rempli
5. Modifier quantité
6. Cliquer "Ajouter"
7. Vérifier: Ligne apparaît avec icône 🔩
8. Vérifier: TVA 20% (ou 0% si AE)

### Test 3: Saisie Manuelle

1. Cliquer "Ajouter une ligne" → "Saisie manuelle"
2. Remplir description
3. Entrer prix
4. Choisir type (Prestation/Pièce)
5. Cliquer "Ajouter"
6. Vérifier: Ligne apparaît avec icône ✏️

### Test 4: Modifier Quantité

1. Cliquer sur une quantité dans le tableau
2. Modifier la valeur
3. Cliquer ailleurs (blur)
4. Vérifier: Total recalculé automatiquement

### Test 5: Supprimer Ligne

1. Cliquer sur l'icône poubelle
2. Confirmer
3. Vérifier: Ligne supprimée
4. Vérifier: Totaux recalculés

### Test 6: Totaux

1. Ajouter plusieurs lignes (prestations + pièces)
2. Vérifier le récapitulatif:
   - Sous-total HT ✓
   - TVA 10% (Prestations) ✓
   - TVA 20% (Pièces) ✓
   - Total TVA ✓
   - TOTAL TTC ✓

### Test 7: Auto-Entrepreneur

1. Mon compte → Cocher "Auto-entrepreneur"
2. Créer un ticket
3. Ajouter des lignes
4. Vérifier: Toutes les TVA à 0%
5. Vérifier: Mention "TVA non applicable, art. 293 B du CGI"

---

## 🔄 Intégration avec PDF

**Prochaine étape**: Utiliser les lignes pour générer le PDF

Modifier `/api/pos/workorders/[id]/quote-pdf/route.ts`:

```typescript
// Charger les lignes au lieu de calculer manuellement
const lines = await prisma.workOrderLine.findMany({
  where: { workOrderId: id },
});

// Utiliser les lignes pour le PDF
const pdfLines = lines.map(line => ({
  description: line.description,
  qty: line.quantity,
  unitPriceHT: line.priceHT,
  unitPriceTTC: line.priceHT * (1 + line.vatRate / 100),
  vatRate: line.vatRate,
  totalHT: line.priceHT * line.quantity,
  totalTTC: line.priceHT * line.quantity * (1 + line.vatRate / 100),
}));
```

---

## ✅ Checklist Finale

- [ ] Imports ajoutés
- [ ] États ajoutés
- [ ] Fonctions de gestion créées
- [ ] Section JSX ajoutée
- [ ] Migration Prisma exécutée
- [ ] Tests effectués
- [ ] PDF mis à jour (optionnel)

---

**L'intégration est prête !** 🎉

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
