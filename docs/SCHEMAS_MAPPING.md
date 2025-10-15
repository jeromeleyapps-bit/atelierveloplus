# 📋 Mapping Schémas Prisma - Atelier Vélo+

**Date**: 15 octobre 2025  
**Objectif**: Documentation des différences de champs entre modèles

---

## 🔄 WorkOrderLine → InvoiceLine

### Mapping des Champs

| WorkOrderLine | InvoiceLine | Notes |
|---------------|-------------|-------|
| `quantity` | `qty` | Quantité |
| `priceHT` | `unitPriceHT` | Prix unitaire HT |
| `vatRate` | `vatRate` | Taux TVA (identique) |
| `type` | `type` | Type (identique) |
| `description` | `description` | Description (identique) |
| `duration` | ❌ N'existe pas | Durée en minutes (prestations) |
| `sourceId` | ❌ N'existe pas | ID source (ServiceRate/CatalogItem) |
| `notes` | ❌ N'existe pas | Notes additionnelles |

### Champs Supplémentaires InvoiceLine

| Champ | Type | Description |
|-------|------|-------------|
| `unitPriceTTC` | Float? | Prix unitaire TTC |
| `totalHT` | Float | Total HT (calculé) |
| `totalTTC` | Float | Total TTC (calculé) |
| `partId` | String? | ID pièce catalogue |
| `purchasePriceHT` | Float? | Prix d'achat HT |

---

## 📊 Schéma WorkOrderLine

```prisma
model WorkOrderLine {
  id            String    @id @default(cuid())
  workOrderId   String
  type          String    // 'service' | 'part' | 'manual'
  description   String
  quantity      Int       @default(1)
  priceHT       Float
  vatRate       Float     // 0, 10, 20
  duration      Int?      // minutes (pour prestations)
  sourceId      String?   // ID de ServiceRate ou CatalogItem
  notes         String?   // Notes additionnelles
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  workOrder     WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  
  @@index([workOrderId])
  @@index([type])
}
```

---

## 📊 Schéma InvoiceLine

```prisma
model InvoiceLine {
  id              String  @id @default(cuid())
  invoiceId       String
  type            String  @default("part")
  description     String
  qty             Float   @default(1)
  unitPriceHT     Float?
  unitPriceTTC    Float?
  vatRate         Float?
  totalHT         Float   @default(0)
  totalTTC        Float   @default(0)
  partId          String?
  purchasePriceHT Float?
  invoice         Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
}
```

---

## 💡 Code de Mapping

### Copie WorkOrderLine → InvoiceLine

```typescript
// Dans /api/finance/quotes/route.ts
const workOrderLines = await prisma.workOrderLine.findMany({
  where: { workOrderId },
});

const quote = await prisma.invoice.create({
  data: {
    // ... autres champs
    lines: {
      create: workOrderLines.map(line => ({
        type: line.type,
        description: line.description,
        qty: line.quantity || 1,           // ⚠️ quantity → qty
        unitPriceHT: line.priceHT || 0,    // ⚠️ priceHT → unitPriceHT
        vatRate: line.vatRate || 20,
        // duration, sourceId, notes ne sont PAS copiés (n'existent pas dans InvoiceLine)
      })),
    },
  },
});
```

---

## ⚠️ Points d'Attention

### 1. Noms de Champs Différents

**Toujours utiliser**:
- `line.quantity` (WorkOrderLine) → `qty` (InvoiceLine)
- `line.priceHT` (WorkOrderLine) → `unitPriceHT` (InvoiceLine)

### 2. Champs Non Mappables

Ces champs existent dans WorkOrderLine mais PAS dans InvoiceLine:
- `duration` - Durée prestation (minutes)
- `sourceId` - ID source catalogue
- `notes` - Notes additionnelles

**Solution**: Ces informations peuvent être ajoutées dans `description` si nécessaire.

### 3. Calculs Automatiques

InvoiceLine a des champs calculés:
- `totalHT` = `qty` × `unitPriceHT`
- `totalTTC` = `totalHT` × (1 + `vatRate`/100)

Ces calculs doivent être faits côté application ou via triggers DB.

---

## 🔄 Autres Mappings Utiles

### Invoice → WorkOrder

| Invoice | WorkOrder | Notes |
|---------|-----------|-------|
| `type` | N/A | 'quote', 'invoice', 'credit' |
| `status` | `status` | Statuts différents |
| `workOrderId` | `id` | Relation |

### ServiceRate → WorkOrderLine

| ServiceRate | WorkOrderLine | Notes |
|-------------|---------------|-------|
| `name` | `description` | Nom prestation |
| `priceHT` | `priceHT` | Prix HT |
| `duration` | `duration` | Durée (minutes) |
| `id` | `sourceId` | Référence |

### CatalogItem → WorkOrderLine

| CatalogItem | WorkOrderLine | Notes |
|-------------|---------------|-------|
| `name` | `description` | Nom pièce |
| `priceHT` | `priceHT` | Prix HT |
| `id` | `sourceId` | Référence |

---

## 📝 Checklist Développement

Lors de la création de fonctionnalités impliquant ces modèles:

- [ ] Vérifier les noms de champs (quantity vs qty, priceHT vs unitPriceHT)
- [ ] Ne pas essayer de copier duration, sourceId, notes vers InvoiceLine
- [ ] Gérer les valeurs par défaut (qty: 1, unitPriceHT: 0)
- [ ] Calculer totalHT et totalTTC si nécessaire
- [ ] Tester avec des données réelles

---

**Version**: 1.0  
**Dernière mise à jour**: 15 octobre 2025  
**Auteur**: Documentation schémas Prisma

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
