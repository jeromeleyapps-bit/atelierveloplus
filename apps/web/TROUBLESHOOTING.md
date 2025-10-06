# Guide de Dépannage - Migration SQLite → PostgreSQL

## 🔧 Problèmes Résolus Automatiquement

### ✅ Requêtes PostgreSQL Corrigées
- Toutes les requêtes `contains` utilisent maintenant `mode: 'insensitive'` pour la recherche insensible à la casse
- PostgreSQL est case-sensitive par défaut, contrairement à SQLite

### ✅ Compatibilité SQLite/PostgreSQL
- Les commandes `PRAGMA foreign_keys` sont maintenant ignorées silencieusement sur PostgreSQL
- Le code détecte automatiquement le type de base de données

## 🚀 Démarrage Rapide

### Étape 1: Vérifier les Prérequis (Windows)
```powershell
.\check-requirements.ps1
```

### Étape 2: Configurer la Base de Données
```powershell
.\setup-db.ps1
```

### Étape 3: Démarrer l'Application
```powershell
npm run dev
```

## 🔍 Diagnostic des Problèmes

### Problème: "prisma_unavailable" lors de la connexion/inscription

**Cause**: Le client Prisma n'est pas généré

**Solution**:
```powershell
cd apps/web
npx prisma generate
```

### Problème: Erreur de connexion à la base de données

**Causes possibles**:
1. DATABASE_URL non définie ou incorrecte
2. IP non autorisée dans Supabase
3. Mauvais port (utiliser 6543 pour pooling)

**Solutions**:

1. Vérifiez votre `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"
```

2. Dans Supabase Dashboard:
   - Settings → Database → Connection Pooling
   - Ajoutez votre IP à la liste autorisée

3. Testez la connexion:
```powershell
npx ts-node scripts/check-db.ts
```

### Problème: Tables n'existent pas

**Cause**: Migrations non appliquées

**Solution**:
```powershell
# Pour production
npx prisma migrate deploy

# Pour développement
npx prisma migrate dev --name init

# Alternative rapide (sans migration)
npx prisma db push
```

### Problème: Erreur "relation does not exist"

**Cause**: Le schéma Prisma n'est pas synchronisé avec la base de données

**Solution**:
```powershell
# Récupérer le schéma actuel de la DB
npx prisma db pull

# Puis régénérer le client
npx prisma generate
```

### Problème: Impossible de créer un compte utilisateur

**Vérifications**:

1. Le client Prisma est généré:
```powershell
Test-Path "node_modules/.prisma/client"
```

2. La DATABASE_URL est définie:
```powershell
Get-Content .env | Select-String "DATABASE_URL"
```

3. Les tables User existent:
```powershell
npx prisma studio
# Vérifiez que le modèle User est visible
```

## 📋 Checklist de Vérification

- [ ] Node.js installé (v18+)
- [ ] npm/npx disponibles
- [ ] Fichier `.env` ou `.env.local` existe
- [ ] `DATABASE_URL` définie dans `.env`
- [ ] `npm install` exécuté
- [ ] `npx prisma generate` exécuté
- [ ] Migrations appliquées (`prisma migrate deploy` ou `db push`)
- [ ] Connexion DB testée (`npx ts-node scripts/check-db.ts`)

## 🔗 Obtenir votre DATABASE_URL Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Settings** → **Database**
4. Sous "Connection string", choisissez:
   - **Transaction mode** (port 6543) pour production/Vercel
   - **Session mode** (port 5432) pour développement local
5. Copiez l'URL et remplacez `[YOUR-PASSWORD]`

### Format pour Production (Vercel):
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1
```

### Format pour Développement:
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
```

## 🛠️ Commandes Utiles

```powershell
# Vérifier le schéma Prisma
npx prisma validate

# Ouvrir l'interface graphique de la DB
npx prisma studio

# Voir les migrations appliquées
npx prisma migrate status

# Réinitialiser complètement la DB (⚠️ supprime les données)
npx prisma migrate reset

# Générer le client après modification du schéma
npx prisma generate

# Formater le schéma Prisma
npx prisma format
```

## 📞 Support

Si les problèmes persistent:
1. Vérifiez les logs de l'application dans la console
2. Vérifiez les logs Supabase dans le Dashboard
3. Consultez la documentation Prisma: https://www.prisma.io/docs
