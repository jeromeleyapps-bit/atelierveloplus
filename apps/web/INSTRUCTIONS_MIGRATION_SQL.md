# 🔧 Migration SQL Manuelle - WorkOrder Relations

## 📋 Instructions

### Option 1: Via pgAdmin (Interface Graphique)

1. **Ouvrir pgAdmin**
2. **Connecter à votre base de données** `atelier_velo`
3. **Clic droit sur la base** → **Query Tool**
4. **Copier-coller le SQL** depuis `MIGRATION_SQL_WORKORDER.sql`
5. **Exécuter** (F5 ou bouton Play)

---

### Option 2: Via psql (Ligne de commande)

```powershell
# Se connecter à la base de données
psql -U postgres -d atelier_velo

# Copier-coller le SQL ou exécuter le fichier
\i c:/Users/j_ley/Atelier-velo+/apps/web/MIGRATION_SQL_WORKORDER.sql

# Vérifier
\d "WorkOrder"
```

---

### Option 3: Via DBeaver / Autre Client SQL

1. **Ouvrir votre client SQL**
2. **Se connecter à la base** `atelier_velo`
3. **Nouvelle requête SQL**
4. **Copier-coller le contenu** de `MIGRATION_SQL_WORKORDER.sql`
5. **Exécuter**

---

## 📝 SQL à Exécuter

```sql
-- 1. Créer les index
CREATE INDEX IF NOT EXISTS "WorkOrder_customerId_idx" ON "WorkOrder"("customerId");
CREATE INDEX IF NOT EXISTS "WorkOrder_bikeId_idx" ON "WorkOrder"("bikeId");

-- 2. Ajouter contrainte Customer
ALTER TABLE "WorkOrder" 
DROP CONSTRAINT IF EXISTS "WorkOrder_customerId_fkey";

ALTER TABLE "WorkOrder" 
ADD CONSTRAINT "WorkOrder_customerId_fkey" 
FOREIGN KEY ("customerId") 
REFERENCES "Customer"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 3. Ajouter contrainte CustomerBike
ALTER TABLE "WorkOrder" 
DROP CONSTRAINT IF EXISTS "WorkOrder_bikeId_fkey";

ALTER TABLE "WorkOrder" 
ADD CONSTRAINT "WorkOrder_bikeId_fkey" 
FOREIGN KEY ("bikeId") 
REFERENCES "CustomerBike"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;
```

---

## ✅ Après l'Exécution SQL

### 1. Générer le Client Prisma

```powershell
cd c:\Users\j_ley\Atelier-velo+\apps\web
npx prisma generate
```

### 2. Redémarrer le Serveur

```powershell
# Ctrl+C pour arrêter
npm run dev
```

### 3. Tester

```
Rafraîchir la page du ticket (F5)
```

---

## 🔍 Vérification

### Vérifier que les contraintes sont créées

```sql
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = '"WorkOrder"'::regclass
AND contype = 'f';
```

**Résultat attendu** :
```
constraint_name              | table_name | referenced_table
-----------------------------+------------+-----------------
WorkOrder_customerId_fkey    | WorkOrder  | Customer
WorkOrder_bikeId_fkey        | WorkOrder  | CustomerBike
```

### Vérifier les index

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'WorkOrder';
```

**Résultat attendu** :
```
indexname                  | indexdef
---------------------------+------------------------------------------
WorkOrder_customerId_idx   | CREATE INDEX ... ON "WorkOrder"(customerId)
WorkOrder_bikeId_idx       | CREATE INDEX ... ON "WorkOrder"(bikeId)
```

---

## ⚠️ Si Erreur "relation already exists"

C'est normal ! Les `IF NOT EXISTS` et `DROP CONSTRAINT IF EXISTS` gèrent ça.

Continuez simplement avec `npx prisma generate`.

---

## 🎯 Résumé des Étapes

1. ✅ **Exécuter le SQL** (via pgAdmin, psql, ou DBeaver)
2. ✅ **`npx prisma generate`** (pour régénérer le client)
3. ✅ **Redémarrer serveur** (Ctrl+C puis `npm run dev`)
4. ✅ **Tester** (F5 sur page ticket)

---

**Fichier SQL** : `MIGRATION_SQL_WORKORDER.sql` ✅  
**Exécutez le SQL, puis `npx prisma generate`** ⚡
