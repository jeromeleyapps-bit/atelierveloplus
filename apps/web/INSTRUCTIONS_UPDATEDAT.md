# ✅ Ajout updatedAt à WorkOrder - Instructions

## 📋 Ce qui a été fait

### 1. Schéma Prisma Modifié ✅
**Fichier** : `prisma/schema.prisma`

Ajouté :
```prisma
model WorkOrder {
  // ...
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt  // ✅ AJOUTÉ
  dueAt      DateTime?
  // ...
}
```

### 2. Migration SQL Créée ✅
**Fichier** : `MIGRATION_ADD_UPDATEDAT.sql`

### 3. Dashboard Mis à Jour ✅
**Fichier** : `src/app/dashboard/page.tsx`

Utilise maintenant `updatedAt` pour "Terminés ce mois"

---

## 🚀 Étapes à Suivre

### Étape 1: Exécuter la Migration SQL

**Via pgAdmin, psql, ou DBeaver** :

```sql
-- 1. Ajouter la colonne
ALTER TABLE "WorkOrder" 
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 2. Initialiser avec createdAt
UPDATE "WorkOrder" 
SET "updatedAt" = "createdAt";

-- 3. Créer fonction trigger
CREATE OR REPLACE FUNCTION update_workorder_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Créer trigger
DROP TRIGGER IF EXISTS trigger_workorder_updatedat ON "WorkOrder";

CREATE TRIGGER trigger_workorder_updatedat
BEFORE UPDATE ON "WorkOrder"
FOR EACH ROW
EXECUTE FUNCTION update_workorder_updatedat();
```

**OU** exécuter le fichier complet :
```bash
# Via psql
psql -U postgres -d atelier_velo -f MIGRATION_ADD_UPDATEDAT.sql
```

---

### Étape 2: Générer le Client Prisma

```powershell
cd c:\Users\j_ley\Atelier-velo+\apps\web
npx prisma generate
```

**Résultat attendu** :
```
✔ Generated Prisma Client
```

---

### Étape 3: Redémarrer le Serveur

```powershell
# Ctrl+C pour arrêter
npm run dev
```

---

### Étape 4: Vérifier

#### Vérification SQL
```sql
-- Vérifier que la colonne existe
SELECT 
    id,
    status,
    "createdAt",
    "updatedAt"
FROM "WorkOrder"
LIMIT 5;
```

#### Vérification Dashboard
1. Aller sur `/dashboard`
2. Vérifier le widget "Terminés ce mois"
3. Modifier un ticket (passer en ready)
4. Vérifier que le compteur s'incrémente

---

## 🎯 Fonctionnement

### Trigger Automatique

Chaque fois qu'un `WorkOrder` est **modifié** :
```sql
UPDATE "WorkOrder" SET status = 'ready' WHERE id = 'xxx';
```

Le trigger met automatiquement à jour `updatedAt` :
```sql
NEW."updatedAt" = CURRENT_TIMESTAMP;
```

### Dashboard

Le widget "Terminés ce mois" compte maintenant :
```typescript
// Tickets avec status='ready' 
// ET updatedAt ce mois (= passés en ready ce mois)
const d = new Date(w.updatedAt);
return d >= monthStart && d <= monthEnd;
```

---

## 🧪 Test Complet

### Test 1: Vérifier updatedAt Existe
```sql
\d "WorkOrder"
-- Doit afficher la colonne updatedAt
```

### Test 2: Vérifier Trigger Fonctionne
```sql
-- Modifier un ticket
UPDATE "WorkOrder" 
SET status = 'ready' 
WHERE id = (SELECT id FROM "WorkOrder" LIMIT 1);

-- Vérifier updatedAt a changé
SELECT id, status, "createdAt", "updatedAt" 
FROM "WorkOrder" 
WHERE id = (SELECT id FROM "WorkOrder" LIMIT 1);
```

### Test 3: Vérifier Dashboard
```sql
-- Compter tickets ready ce mois
SELECT COUNT(*) 
FROM "WorkOrder"
WHERE status = 'ready'
AND "updatedAt" >= DATE_TRUNC('month', CURRENT_DATE)
AND "updatedAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

Comparer avec le dashboard → doit correspondre ✅

---

## 📊 Avant / Après

### Avant
```
Widget "Terminés ce mois": 
  Compte tickets ready CRÉÉS ce mois ❌
  (Pas précis)
```

### Après
```
Widget "Terminés ce mois": 
  Compte tickets PASSÉS EN READY ce mois ✅
  (Précis grâce à updatedAt)
```

---

## ⚠️ Points d'Attention

### 1. Données Existantes
Les tickets existants auront `updatedAt = createdAt` initialement.

Dès qu'ils seront modifiés, `updatedAt` sera mis à jour automatiquement.

### 2. Trigger
Le trigger se déclenche sur **UPDATE** uniquement, pas sur **INSERT**.

Pour les nouveaux tickets, Prisma gère `updatedAt` automatiquement avec `@updatedAt`.

### 3. Cache Dashboard
Après la migration, invalider le cache :
```javascript
// Console DevTools (F12)
localStorage.removeItem('dashboard-stats');
location.reload();
```

---

## 🎊 Résultat Final

### Fichiers Modifiés
1. ✅ `prisma/schema.prisma` - Ajout `updatedAt`
2. ✅ `MIGRATION_ADD_UPDATEDAT.sql` - Migration SQL
3. ✅ `src/app/dashboard/page.tsx` - Utilise `updatedAt`

### Fonctionnalités
- ✅ Colonne `updatedAt` dans WorkOrder
- ✅ Trigger automatique sur UPDATE
- ✅ Dashboard précis pour "Terminés ce mois"
- ✅ Fallback sur `createdAt` si `updatedAt` absent

### Bénéfices
- ✅ **Données précises** dans le dashboard
- ✅ **Traçabilité** des modifications
- ✅ **Automatique** via trigger

---

## 📝 Commandes Résumées

```powershell
# 1. Exécuter SQL (pgAdmin ou psql)
# Copier-coller MIGRATION_ADD_UPDATEDAT.sql

# 2. Générer client Prisma
cd c:\Users\j_ley\Atelier-velo+\apps\web
npx prisma generate

# 3. Redémarrer serveur
# Ctrl+C puis
npm run dev

# 4. Tester
# Aller sur /dashboard
```

---

**Migration prête** : ✅  
**Exécutez les 4 étapes ci-dessus** : ⚡  
**Dashboard sera précis après** : 🎯
