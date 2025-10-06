# Guide de Migration SQLite → PostgreSQL

## Pourquoi migrer ?

SQLite est parfait pour le développement local, mais PostgreSQL offre :
- **Performance** : Meilleure gestion des connexions concurrentes
- **Scalabilité** : Supporte des volumes de données importants
- **Fonctionnalités** : Types avancés, full-text search, JSON queries
- **Production-ready** : Utilisé par les plus grandes applications

## Option 1 : PostgreSQL Local (Développement)

### Installation PostgreSQL

**Windows :**
```bash
# Télécharger depuis https://www.postgresql.org/download/windows/
# Ou avec Chocolatey :
choco install postgresql

# Démarrer le service
pg_ctl -D "C:\Program Files\PostgreSQL\15\data" start
```

**macOS :**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Linux :**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE atelier_velo;

# Créer un utilisateur (optionnel)
CREATE USER atelier_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE atelier_velo TO atelier_user;

# Quitter
\q
```

### Configurer l'application

1. Copier `.env.example` vers `.env` :
```bash
cp .env.example .env
```

2. Éditer `.env` et définir `DATABASE_URL` :
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/atelier_velo?schema=public"
```

3. Générer le client Prisma et migrer :
```bash
cd apps/web
npx prisma generate
npx prisma migrate dev --name init_postgresql
```

## Option 2 : PostgreSQL Cloud (Production)

### Supabase (Recommandé - Gratuit jusqu'à 500 MB)

1. Créer un compte sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier la `Connection string` (mode "Transaction" recommandé)
4. Dans `.env` :
```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

5. Migrer :
```bash
npx prisma migrate deploy
```

### Neon (Alternative gratuite)

1. Créer un compte sur [neon.tech](https://neon.tech)
2. Créer un projet
3. Copier la connection string
4. Même procédure que Supabase

### Railway / Render / Heroku

Tous offrent des plans PostgreSQL gratuits ou peu coûteux. Suivre leur documentation pour obtenir la `DATABASE_URL`.

## Migration des données existantes

Si vous avez des données dans SQLite à migrer :

### Méthode 1 : Export/Import manuel

```bash
# 1. Exporter les données depuis SQLite
npx prisma db pull --schema=prisma/schema.sqlite.prisma
npx ts-node scripts/export-data.ts

# 2. Importer dans PostgreSQL
npx prisma db push
npx ts-node scripts/import-data.ts
```

### Méthode 2 : Utiliser pgloader (automatique)

```bash
# Installer pgloader
brew install pgloader  # macOS
sudo apt install pgloader  # Linux

# Migrer
pgloader sqlite://./data/app.db postgresql://postgres:password@localhost/atelier_velo
```

## Vérification

Après migration, vérifier que tout fonctionne :

```bash
# Lancer l'app
npm run dev

# Tester les endpoints critiques
curl http://localhost:3000/api/workshop/workorders
curl http://localhost:3000/api/catalog/items
```

## Rollback (si problème)

Pour revenir temporairement à SQLite :

1. Dans `prisma/schema.prisma`, changer :
```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data/app.db"
}
```

2. Regénérer :
```bash
npx prisma generate
```

## Support

En cas de problème :
- Vérifier les logs Prisma : `DEBUG="prisma:*" npm run dev`
- Consulter la doc Prisma : https://www.prisma.io/docs/guides/migrate
- Ouvrir une issue GitHub

---

**Note** : La migration est **non-destructive** si vous gardez votre fichier SQLite. Vous pouvez tester PostgreSQL en parallèle.
