# 🔧 Migration WorkOrder Relations

## 🐛 Problème

```
Unknown field `customer` for include statement on model `WorkOrder`
```

**Cause** : Le schéma Prisma n'avait pas de relations définies entre `WorkOrder` et `Customer`/`CustomerBike`

---

## ✅ Modifications du Schéma

### 1. Model WorkOrder

**Avant** :
```prisma
model WorkOrder {
  id         String    @id @default(cuid())
  status     String    @default("created")
  customerId String?
  bikeId     String?
  // ...
  
  parts WorkOrderPart[]
}
```

**Après** :
```prisma
model WorkOrder {
  id         String    @id @default(cuid())
  status     String    @default("created")
  customerId String?
  bikeId     String?
  // ...
  
  customer Customer?     @relation(fields: [customerId], references: [id], onDelete: SetNull)
  bike     CustomerBike? @relation(fields: [bikeId], references: [id], onDelete: SetNull)
  parts    WorkOrderPart[]
  
  @@index([customerId])
  @@index([bikeId])
}
```

**Ajouts** :
- ✅ Relation `customer` vers `Customer`
- ✅ Relation `bike` vers `CustomerBike`
- ✅ Index sur `customerId` pour performance
- ✅ Index sur `bikeId` pour performance
- ✅ `onDelete: SetNull` pour ne pas supprimer le ticket si client/vélo supprimé

---

### 2. Model Customer

**Avant** :
```prisma
model Customer {
  // ...
  bikes    CustomerBike[]
  bookings Booking[]
}
```

**Après** :
```prisma
model Customer {
  // ...
  bikes      CustomerBike[]
  bookings   Booking[]
  workOrders WorkOrder[]  // ✅ AJOUTÉ
}
```

---

### 3. Model CustomerBike

**Avant** :
```prisma
model CustomerBike {
  // ...
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```

**Après** :
```prisma
model CustomerBike {
  // ...
  customer   Customer    @relation(fields: [customerId], references: [id], onDelete: Cascade)
  workOrders WorkOrder[]  // ✅ AJOUTÉ
}
```

---

## 🚀 Commandes à Exécuter

### 1. Générer le Client Prisma

```powershell
cd c:\Users\j_ley\Atelier-velo+\apps\web
npx prisma generate
```

**Résultat attendu** :
```
✔ Generated Prisma Client
```

---

### 2. Créer et Appliquer la Migration

```powershell
npx prisma migrate dev --name add_workorder_relations
```

**Ce que ça fait** :
1. Crée un fichier de migration SQL
2. Applique la migration à la base de données
3. Régénère le client Prisma

**Résultat attendu** :
```
Applying migration `20251006_add_workorder_relations`
The following migration(s) have been applied:
migrations/
  └─ 20251006_add_workorder_relations/
      └─ migration.sql

✔ Generated Prisma Client
```

---

### 3. Redémarrer le Serveur Next.js

```powershell
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

---

## 📊 Migration SQL Générée

La migration créera automatiquement :

```sql
-- CreateIndex
CREATE INDEX "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");

-- CreateIndex
CREATE INDEX "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_customerId_fkey" 
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_bikeId_fkey" 
  FOREIGN KEY ("bikeId") REFERENCES "CustomerBike"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 🎯 Avantages

### 1. Intégrité Référentielle ✅
```sql
-- Si customer supprimé → customerId devient NULL (pas d'erreur)
ON DELETE SET NULL

-- Si customer mis à jour → customerId mis à jour automatiquement
ON UPDATE CASCADE
```

### 2. Performance ✅
```sql
-- Index pour requêtes rapides
@@index([customerId])
@@index([bikeId])
```

### 3. Include Prisma ✅
```typescript
// Maintenant possible !
const workOrder = await prisma.workOrder.findUnique({
  where: { id },
  include: {
    customer: true,  // ✅ Fonctionne
    bike: true,      // ✅ Fonctionne
  },
});
```

---

## 🧪 Vérification

### 1. Vérifier le Client Prisma Généré

```typescript
// Le type devrait maintenant inclure customer et bike
import { WorkOrder } from '@prisma/client';

// Avec include
const wo = await prisma.workOrder.findUnique({
  where: { id: 'xxx' },
  include: { customer: true, bike: true },
});

// TypeScript devrait reconnaître:
wo.customer?.firstName  // ✅
wo.bike?.brand          // ✅
```

### 2. Tester l'API

```bash
# Ouvrir DevTools (F12)
# Aller sur /tickets/[id]
# Vérifier Network → Pas d'erreur 500
# Vérifier réponse JSON contient customer et bike
```

---

## ⚠️ Points d'Attention

### 1. Données Existantes

Les work orders existants avec `customerId` et `bikeId` :
- ✅ Seront automatiquement liés après migration
- ✅ Pas de perte de données
- ✅ Relations créées automatiquement

### 2. onDelete: SetNull

Si un client ou vélo est supprimé :
- ✅ Le work order reste
- ✅ `customerId` ou `bikeId` devient `NULL`
- ✅ Pas de suppression en cascade

**Alternative** : `onDelete: Cascade` supprimerait le work order (non recommandé)

### 3. Index

Les index améliorent les performances pour :
- Recherche de tickets par client
- Recherche de tickets par vélo
- Jointures dans les requêtes

---

## 🎊 Résultat Final

### Avant
```
❌ Unknown field `customer`
❌ Erreur 500
❌ Pas de données affichées
```

### Après
```
✅ Relations définies
✅ API fonctionne
✅ Données customer et bike chargées
✅ Interface complète
```

---

## 📝 Commandes Complètes

```powershell
# 1. Générer client
cd c:\Users\j_ley\Atelier-velo+\apps\web
npx prisma generate

# 2. Créer et appliquer migration
npx prisma migrate dev --name add_workorder_relations

# 3. Redémarrer serveur
# Ctrl+C puis
npm run dev

# 4. Tester
# Ouvrir http://localhost:3000/tickets/[id]
```

---

**Schéma Prisma modifié** : ✅  
**Exécutez les commandes ci-dessus** : ⚡  
**Puis rafraîchissez la page** : 🔄
