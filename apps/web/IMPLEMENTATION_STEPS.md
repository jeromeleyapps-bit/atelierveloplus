# 🚀 Implémentation Multi-Tenancy - Étapes Détaillées

## 📋 Fichiers Créés

✅ **`prisma/schema-multi-tenant.prisma`** - Nouveau schéma avec tenants
✅ **`scripts/migrate-to-multi-tenant.ts`** - Script de migration des données
✅ **`MULTI_TENANCY_GUIDE.md`** - Guide complet (référence)

---

## ⚠️ IMPORTANT : Avant de Commencer

### 1. Sauvegarder la Base de Données

```bash
# Via Supabase Dashboard
# Database → Backups → Create Backup

# Ou via pg_dump
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### 2. Désactiver RESET_DB_ON_REGISTER

```env
# Dans .env
RESET_DB_ON_REGISTER=false
```

### 3. Tester sur une Base de Dev d'Abord

Créez une base de test avant d'appliquer sur production !

---

## 🎯 Phase 1: Préparation (30 min)

### Étape 1.1: Comparer les Schémas

```bash
# Voir les différences
code --diff prisma/schema.prisma prisma/schema-multi-tenant.prisma
```

**Changements principaux** :
- ✅ Nouveau modèle `Tenant`
- ✅ Champ `tenantId` ajouté à 20+ tables
- ✅ Index sur `tenantId` partout
- ✅ Contraintes `@@unique` modifiées (email, SKU, etc.)
- ✅ `GlobalSetting` → `TenantSetting`

### Étape 1.2: Vérifier les Données Existantes

```bash
# Compter les enregistrements actuels
node check-tables.js
```

Notez les nombres pour validation post-migration.

---

## 🔧 Phase 2: Application du Schéma (1-2h)

### Étape 2.1: Remplacer le Schéma

```bash
# Sauvegarder l'ancien
cp prisma/schema.prisma prisma/schema.prisma.old

# Appliquer le nouveau
cp prisma/schema-multi-tenant.prisma prisma/schema.prisma
```

### Étape 2.2: Créer la Migration

```bash
cd apps/web

# Générer la migration
npx prisma migrate dev --name add_multi_tenancy

# Cela va:
# 1. Créer la table Tenant
# 2. Ajouter les colonnes tenantId
# 3. Créer les index
# 4. Modifier les contraintes
```

**⚠️ La migration va échouer** car les colonnes `tenantId` sont NOT NULL mais vides.

**C'est normal !** On va les remplir à l'étape suivante.

### Étape 2.3: Modifier la Migration Générée

```bash
# Ouvrir la migration générée
code prisma/migrations/XXXXXX_add_multi_tenancy/migration.sql
```

**Modifier** pour rendre `tenantId` nullable temporairement :

```sql
-- Au lieu de:
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT NOT NULL;

-- Mettre:
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;

-- Répéter pour toutes les tables
```

### Étape 2.4: Appliquer la Migration Modifiée

```bash
npx prisma migrate deploy
```

### Étape 2.5: Générer le Client Prisma

```bash
npx prisma generate
```

---

## 📊 Phase 3: Migration des Données (30 min)

### Étape 3.1: Exécuter le Script de Migration

```bash
npx ts-node scripts/migrate-to-multi-tenant.ts
```

**Ce script va** :
1. Créer un tenant "Atelier Principal"
2. Assigner toutes les données existantes à ce tenant
3. Valider la migration

**Sortie attendue** :
```
🚀 Starting migration to multi-tenant architecture...

Step 1: Creating default tenant...
✅ Created tenant: Atelier Principal (cuid123...)

Step 2: Migrating users...
✅ Migrated 1 users

Step 3: Migrating customers...
✅ Migrated 0 customers

...

✅ Migration completed successfully!
```

### Étape 3.2: Rendre tenantId NOT NULL

```bash
# Créer une nouvelle migration
npx prisma migrate dev --name make_tenantid_required
```

Le schéma Prisma a déjà `tenantId` comme requis, donc Prisma va générer l'ALTER TABLE automatiquement.

---

## 🧪 Phase 4: Tests (1h)

### Étape 4.1: Vérifier les Données

```bash
node check-tables.js
```

Vérifiez que tous les comptes correspondent.

### Étape 4.2: Tester l'Application

```bash
npm run dev
```

**Tests à effectuer** :
- [ ] Connexion avec utilisateur existant
- [ ] Voir les clients existants
- [ ] Voir les factures existantes
- [ ] Créer un nouveau client
- [ ] Créer une nouvelle facture

### Étape 4.3: Vérifier l'Isolation (Important !)

```sql
-- Dans Supabase SQL Editor
-- Créer un second tenant de test
INSERT INTO "Tenant" (id, name, slug, active, plan)
VALUES ('test123', 'Atelier Test', 'test', true, 'free');

-- Créer un utilisateur dans ce tenant
INSERT INTO "User" (id, "tenantId", email, password, role, active)
VALUES ('user123', 'test123', 'test@test.com', 'hash', 'admin', true);

-- Vérifier l'isolation
SELECT * FROM "Customer" WHERE "tenantId" = 'test123'; -- Doit être vide
SELECT * FROM "Customer" WHERE "tenantId" = '<id-tenant-principal>'; -- Doit avoir vos données
```

---

## 🔐 Phase 5: Middleware & Contexte (2-3h)

### Étape 5.1: Créer le Contexte Tenant

```bash
# Créer le fichier
code src/lib/tenant-context.ts
```

Copiez le code du `MULTI_TENANCY_GUIDE.md` section 2.1.

### Étape 5.2: Modifier le Client Prisma

```bash
code src/lib/db.ts
```

Ajoutez le middleware Prisma (section 2.2 du guide).

### Étape 5.3: Créer le Helper getTenant

```bash
code src/lib/get-tenant.ts
```

Copiez le code de la section 3.2 du guide.

### Étape 5.4: Modifier le Middleware Next.js

```bash
code src/middleware.ts
```

Remplacez par le code de la section 3.1 du guide.

---

## 🔑 Phase 6: Authentification (1-2h)

### Étape 6.1: Modifier Register

```bash
code src/app/api/auth/register/route.ts
```

**Changements** :
- Créer un `Tenant` à l'inscription
- Lier l'utilisateur au tenant
- Retourner le `tenantSlug` pour redirection

Copiez le code de la section 4.1 du guide.

### Étape 6.2: Modifier Login

```bash
code src/app/api/auth/login/route.ts
```

**Changements** :
- Appeler `getTenantFromRequest()`
- Filtrer par `tenantId` automatiquement

Copiez le code de la section 4.2 du guide.

### Étape 6.3: Tester l'Auth

1. Créer un nouveau tenant via `/api/auth/register`
2. Vérifier qu'il a son propre slug
3. Se connecter sur `https://{slug}.atelier-velo.fr`

---

## 🎨 Phase 7: UI (1h)

### Étape 7.1: Page Sélection Tenant

```bash
mkdir -p src/app/select-tenant
code src/app/select-tenant/page.tsx
```

Copiez le code de la section 5.1 du guide.

### Étape 7.2: Afficher le Nom du Tenant

Dans votre layout ou header :

```typescript
import { getTenantFromRequest } from '@/lib/get-tenant';

export default async function Layout() {
  const { tenantName } = await getTenantFromRequest();
  
  return (
    <header>
      <h1>{tenantName}</h1>
      {/* ... */}
    </header>
  );
}
```

---

## 🚀 Phase 8: Déploiement (1h)

### Étape 8.1: Configuration DNS

**Chez votre registrar** (ex: OVH, Gandi) :

```
Type: CNAME
Name: *.atelier-velo
Value: cname.vercel-dns.com
TTL: 3600
```

### Étape 8.2: Configuration Vercel

```bash
# Créer vercel.json
code vercel.json
```

```json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/:path*"
    }
  ]
}
```

### Étape 8.3: Variables d'Environnement Vercel

Dans Vercel Dashboard → Settings → Environment Variables :

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
AUTH_SECRET=...
RESET_DB_ON_REGISTER=false
```

### Étape 8.4: Déployer

```bash
git add .
git commit -m "feat: implement multi-tenancy"
git push origin main
```

Vercel va déployer automatiquement.

---

## ✅ Checklist Finale

### Avant Production
- [ ] Backup base de données effectué
- [ ] Migration testée sur base de dev
- [ ] Tous les tests passent
- [ ] Isolation des données vérifiée
- [ ] DNS configuré
- [ ] Variables env production configurées

### Après Déploiement
- [ ] Tenant principal accessible
- [ ] Connexion fonctionne
- [ ] Données existantes visibles
- [ ] Création nouveau tenant fonctionne
- [ ] Isolation confirmée entre tenants

---

## 🐛 Dépannage

### Erreur: "No tenant context"

**Cause** : Middleware pas appelé ou tenant non détecté

**Solution** :
1. Vérifier que le sous-domaine est correct
2. Vérifier que le tenant existe dans la DB
3. Vérifier les logs du middleware

### Erreur: "tenantId is required"

**Cause** : Middleware Prisma pas actif

**Solution** :
1. Vérifier que `setTenantContext()` est appelé
2. Vérifier que le middleware Prisma est bien ajouté
3. Redémarrer l'app

### Données d'un autre tenant visibles

**Cause** : Isolation non fonctionnelle

**Solution** :
1. Vérifier le middleware Prisma
2. Vérifier les index sur tenantId
3. Tester avec `console.log(getTenantId())` dans les API

---

## 📞 Support

Si vous êtes bloqué :
1. Consultez `MULTI_TENANCY_GUIDE.md`
2. Vérifiez les logs (console + Vercel)
3. Testez l'isolation manuellement en SQL
4. Demandez de l'aide avec les logs d'erreur

---

## 🎯 Prochaines Étapes Après Implémentation

1. **Créer des tenants de test**
2. **Implémenter la facturation** (Stripe par tenant)
3. **Ajouter analytics** par tenant
4. **Créer admin super-tenant** (gérer tous les ateliers)
5. **Implémenter export données** par tenant (RGPD)

---

**Temps total estimé** : 8-10 heures

**Commencez par Phase 1 et suivez l'ordre !** 🚀
