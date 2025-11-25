# 🔧 Initialisation SQLite

## Problème
Erreur 500 sur `/api/calendar/availability` car la base SQLite n'existe pas.

## Solution

### Étape 1 : Générer Prisma Client pour SQLite

```powershell
cd apps/web
npx prisma generate
```

### Étape 2 : Créer la Base de Données

```powershell
# Créer le dossier data
mkdir -p ../../data

# Créer et migrer la base SQLite
npx prisma migrate dev --name init
```

### Étape 3 : Vérifier

```powershell
# Vérifier que le fichier existe
ls ../../data/atelier-velo.db
```

### Étape 4 : Redémarrer

```powershell
npm run dev:tunnel
```

---

## Alternative : Revenir à PostgreSQL

Si tu préfères utiliser PostgreSQL (Supabase) :

### Dans `.env`
```env
# Commenter SQLite
# DATABASE_PROVIDER=sqlite
# SQLITE_DB_PATH=./data/atelier-velo.db

# Décommenter PostgreSQL
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

Puis redémarrer.

---

## Recommandation

**Pour dev local simple** : SQLite (suivre étapes ci-dessus)
**Pour production ou multi-device** : PostgreSQL
