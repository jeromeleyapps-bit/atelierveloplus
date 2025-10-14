# État d'Intégration: Système de Lignes

**Date**: 15 octobre 2025  
**Statut**: En cours

---

## ✅ Terminé

### 1. Modèle de Données
- ✅ `WorkOrderLine` dans schema.prisma
- ✅ Relations avec `WorkOrder`
- ✅ Champs: type, description, quantity, priceHT, vatRate, duration, sourceId

### 2. API Routes
- ✅ `GET /api/workorders/[id]/lines`
- ✅ `POST /api/workorders/[id]/lines`
- ✅ `PATCH /api/workorders/[id]/lines/[lineId]`
- ✅ `DELETE /api/workorders/[id]/lines/[lineId]`

### 3. Composants
- ✅ `LineItemSelector.tsx` - Sélecteur avec 3 dialogs
- ✅ `LineItemsTable.tsx` - Tableau avec totaux

### 4. Intégration Page Ticket
- ✅ Imports ajoutés
- ✅ États créés
- ✅ Fonctions de gestion
- ✅ Section JSX ajoutée

---

## ⏳ En Attente

### 1. Migration Prisma
```powershell
cd apps\web
npx prisma db push
npx prisma generate
```

**Statut**: ⚠️ À exécuter avant de tester

---

## 🔄 À Faire (Optionnel)

### 1. Intégration Devis

**Fichier**: `apps/web/src/app/finance/components/CreateQuoteDialog.tsx`

**Modifications nécessaires**:
1. Ajouter imports LineItemSelector et LineItemsTable
2. Ajouter état `lines`
3. Ajouter section dans le dialog
4. Envoyer les lignes lors de la création

**Priorité**: Moyenne (peut attendre test du système)

### 2. Intégration Factures

**Fichier**: `apps/web/src/app/finance/components/CreateInvoiceDialog.tsx`

**Modifications nécessaires**:
1. Ajouter imports LineItemSelector et LineItemsTable
2. Ajouter état `lines`
3. Ajouter section dans le dialog
4. Envoyer les lignes lors de la création

**Priorité**: Moyenne (peut attendre test du système)

### 3. Génération PDF depuis Lignes

**Fichier**: `apps/web/src/app/api/pos/workorders/[id]/quote-pdf/route.ts`

**Modifications nécessaires**:
1. Charger les lignes depuis `WorkOrderLine`
2. Utiliser les lignes pour générer le PDF
3. Supprimer l'ancien calcul manuel

**Code suggéré**:
```typescript
// Charger les lignes
const lines = await prisma.workOrderLine.findMany({
  where: { workOrderId: id },
  orderBy: { createdAt: 'asc' },
});

// Convertir pour le PDF
const pdfLines = lines.map(line => ({
  description: line.description,
  qty: line.quantity,
  unitPriceHT: line.priceHT,
  unitPriceTTC: line.priceHT * (1 + line.vatRate / 100),
  vatRate: line.vatRate,
  totalHT: line.priceHT * line.quantity,
  totalTTC: line.priceHT * line.quantity * (1 + line.vatRate / 100),
}));

// Calculer les totaux
const totalHT = lines.reduce((sum, line) => sum + (line.priceHT * line.quantity), 0);
const totalTVA = lines.reduce((sum, line) => {
  const lineTotal = line.priceHT * line.quantity;
  return sum + (lineTotal * line.vatRate / 100);
}, 0);
const totalTTC = totalHT + totalTVA;
```

**Priorité**: Haute (nécessaire pour PDF correct)

---

## 🧪 Plan de Test

### Phase 1: Test Basique (Après Migration)
1. ✅ Ouvrir un ticket
2. ✅ Cliquer "Ajouter une ligne"
3. ✅ Tester les 3 modes:
   - Prestation (grille tarifaire)
   - Pièce (catalogue)
   - Saisie manuelle
4. ✅ Vérifier les totaux
5. ✅ Modifier une quantité
6. ✅ Supprimer une ligne

### Phase 2: Test PDF
1. ✅ Créer un ticket avec lignes
2. ✅ Générer PDF
3. ✅ Vérifier que les lignes apparaissent
4. ✅ Vérifier les totaux

### Phase 3: Test Devis/Factures (Si intégré)
1. ✅ Créer un devis avec lignes
2. ✅ Créer une facture avec lignes
3. ✅ Vérifier la cohérence

---

## 📊 Statistiques

- **Fichiers créés**: 7
- **Fichiers modifiés**: 3
- **Lignes de code**: ~800
- **Temps estimé restant**: 30 min (migration + tests)

---

## 🚀 Prochaines Étapes Recommandées

### Étape 1: Migration (5 min)
```powershell
cd apps\web
npx prisma db push
npx prisma generate
```

### Étape 2: Redémarrer Next.js (1 min)
```powershell
npm run dev
```

### Étape 3: Test Basique (10 min)
- Ouvrir un ticket
- Ajouter des lignes
- Vérifier les totaux

### Étape 4: Corriger PDF (10 min)
- Modifier quote-pdf/route.ts
- Utiliser les lignes
- Tester le PDF

### Étape 5: Intégrer Devis/Factures (Optionnel, 30 min)
- Modifier CreateQuoteDialog.tsx
- Modifier CreateInvoiceDialog.tsx
- Tester

---

## 💡 Recommandation

**Pour ce soir**:
1. ✅ Exécuter la migration
2. ✅ Tester le système de lignes dans les tickets
3. ✅ Corriger le PDF si nécessaire
4. 🌙 Dormir !

**Pour demain**:
1. 🎨 Intégrer dans devis/factures
2. 🎨 Redesign des interfaces (si souhaité)
3. 🧪 Tests complets

---

**Le système est prêt à 80% ! Finalisons la migration et testons !** 🚀

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
