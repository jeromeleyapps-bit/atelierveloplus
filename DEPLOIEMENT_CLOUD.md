# 🚀 Déploiement Cloud SaaS - Atelier Vélo+

## 🎯 Architecture Cloud

```
Internet
    ↓
Vercel (Next.js App)
    ↓
Supabase (PostgreSQL Database)
    ↓
Multi-Tenant (Chaque atelier = 1 tenant)
```

---

## 📋 Étape 1 : Créer un Compte Supabase

### 1.1 Inscription

1. Allez sur https://supabase.com
2. Cliquez sur "Start your project"
3. Connectez-vous avec GitHub (recommandé)

### 1.2 Créer un Nouveau Projet

1. Cliquez sur "New Project"
2. **Organization** : Créez une nouvelle organisation (ex: "Atelier Velo")
3. **Name** : `atelier-velo-prod`
4. **Database Password** : Générez un mot de passe fort (SAUVEGARDEZ-LE !)
5. **Region** : Europe (Frankfurt) - le plus proche de la France
6. **Pricing Plan** : Free (suffisant pour commencer)
7. Cliquez sur "Create new project"

⏱️ **Attente** : 2-3 minutes pour la création

### 1.3 Récupérer la Connection String

Une fois le projet créé :

1. Allez dans **Settings** (icône engrenage en bas à gauche)
2. Cliquez sur **Database**
3. Scrollez jusqu'à "Connection string"
4. Sélectionnez **URI** (pas Pooler)
5. Copiez l'URL qui ressemble à :
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
6. **Remplacez `[YOUR-PASSWORD]`** par le mot de passe que vous avez créé

**SAUVEGARDEZ CETTE URL** - Vous en aurez besoin !

---

## 📋 Étape 2 : Migrer la Base de Données vers Supabase

### 2.1 Exporter votre Base Locale

```powershell
# Dans PowerShell
cd C:\Users\j_ley\Atelier-velo+\apps\web

# Exporter le schéma
$env:PGPASSWORD="SoleaCharline20072011"
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d atelier_velo --schema-only > schema.sql

# Exporter les données (optionnel - si vous voulez garder vos données de test)
& "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -d atelier_velo --data-only > data.sql
```

### 2.2 Appliquer les Migrations Prisma sur Supabase

**Option A : Via Prisma Migrate (Recommandé)**

1. Créez un fichier `.env.production` :
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
   ```

2. Appliquez les migrations :
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

**Option B : Via SQL Direct**

1. Allez dans Supabase Dashboard
2. Cliquez sur **SQL Editor**
3. Collez le contenu de `schema.sql`
4. Cliquez sur "Run"

---

## 📋 Étape 3 : Préparer le Projet pour Vercel

### 3.1 Créer `.env.production`

Créez `apps/web/.env.production` :

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# HubSpot (si vous l'utilisez)
HUBSPOT_ACCESS_TOKEN=your-hubspot-token

# Next.js
NEXT_PUBLIC_APP_URL=https://atelier-velo.vercel.app

# Auth (générez une clé secrète)
NEXTAUTH_SECRET=votre-cle-secrete-tres-longue-et-aleatoire
NEXTAUTH_URL=https://atelier-velo.vercel.app
```

**Générer NEXTAUTH_SECRET** :
```bash
openssl rand -base64 32
```

### 3.2 Créer `vercel.json`

Créez `apps/web/vercel.json` :

```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["fra1"],
  "env": {
    "DATABASE_URL": "@database_url"
  }
}
```

### 3.3 Mettre à jour `.gitignore`

Vérifiez que `.env.production` est dans `.gitignore` :

```gitignore
# Env files
.env
.env.*
!.env.example
```

---

## 📋 Étape 4 : Déployer sur Vercel

### 4.1 Créer un Compte Vercel

1. Allez sur https://vercel.com
2. Cliquez sur "Sign Up"
3. Connectez-vous avec GitHub (même compte que Supabase)

### 4.2 Importer le Projet depuis GitHub

1. Cliquez sur "Add New..." → "Project"
2. Sélectionnez votre repo GitHub : `jeromeleyssard-pixel/atelier-velo-plus`
3. Cliquez sur "Import"

### 4.3 Configurer le Projet

**Root Directory** : `apps/web`

**Build Settings** :
- **Framework Preset** : Next.js
- **Build Command** : `prisma generate && next build`
- **Output Directory** : `.next`
- **Install Command** : `pnpm install`

**Environment Variables** :

Ajoutez ces variables (cliquez sur "Add" pour chaque) :

| Name | Value |
|------|-------|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | Votre clé générée |
| `NEXTAUTH_URL` | `https://atelier-velo.vercel.app` |
| `HUBSPOT_ACCESS_TOKEN` | Votre token HubSpot (si utilisé) |

### 4.4 Déployer

1. Cliquez sur "Deploy"
2. ⏱️ **Attente** : 3-5 minutes

---

## 📋 Étape 5 : Configurer le Domaine (Optionnel)

### Option A : Utiliser le Domaine Vercel

Par défaut : `https://atelier-velo-plus.vercel.app`

### Option B : Domaine Personnalisé

1. Achetez un domaine (ex: `atelier-velo.app` sur Namecheap, OVH, etc.)
2. Dans Vercel, allez dans **Settings** → **Domains**
3. Ajoutez votre domaine
4. Configurez les DNS selon les instructions Vercel

---

## 📋 Étape 6 : Tester l'Application

### 6.1 Accéder à l'Application

Allez sur : `https://atelier-velo-plus.vercel.app`

### 6.2 Créer le Premier Compte

1. Allez sur `/auth/register`
2. Créez un compte admin
3. Connectez-vous

### 6.3 Vérifier les Fonctionnalités

- [ ] Dashboard s'affiche
- [ ] Créer un client
- [ ] Créer un ticket
- [ ] Générer une facture
- [ ] Mode sombre fonctionne

---

## 🔒 Sécurité

### Variables d'Environnement

✅ **Jamais** commiter `.env.production` sur GitHub
✅ Utiliser des mots de passe forts
✅ Activer 2FA sur Supabase et Vercel

### Backup Base de Données

Supabase fait des backups automatiques, mais vous pouvez aussi :

```bash
# Backup manuel
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

---

## 💰 Coûts

### Gratuit jusqu'à :

**Supabase Free Tier** :
- 500 MB de base de données
- 2 GB de bande passante
- 50,000 requêtes/mois

**Vercel Free Tier** :
- 100 GB de bande passante
- Déploiements illimités
- Domaine .vercel.app gratuit

### Quand Payer ?

- **Supabase Pro** : 25$/mois (2 GB DB, 8 GB bande passante)
- **Vercel Pro** : 20$/mois (1 TB bande passante)

**Pour 10-20 ateliers** : Gratuit suffit largement !

---

## 🚀 Mises à Jour

### Déployer une Nouvelle Version

1. Commitez vos changements sur GitHub :
   ```bash
   git add .
   git commit -m "Nouvelle fonctionnalité"
   git push
   ```

2. Vercel déploie automatiquement ! ✅

---

## 🎯 Multi-Tenant

Votre application est déjà configurée pour le multi-tenant !

Chaque atelier :
1. Crée son compte
2. A son propre `shopId`
3. Voit uniquement ses données

**Isolation des données** : Déjà implémentée dans votre code ✅

---

## 📊 Monitoring

### Vercel Analytics

1. Allez dans **Analytics** dans Vercel
2. Voyez les visiteurs, performances, etc.

### Supabase Monitoring

1. Allez dans **Database** → **Monitoring**
2. Voyez les requêtes, performances, etc.

---

## 🆘 Support

### Problèmes Courants

**Erreur "Cannot connect to database"**
- Vérifiez `DATABASE_URL` dans Vercel
- Vérifiez que Supabase est accessible

**Erreur "Prisma Client not generated"**
- Ajoutez `prisma generate` dans le build command

**Page 404**
- Vérifiez que `Root Directory` est bien `apps/web`

---

## ✅ Checklist Finale

- [ ] Compte Supabase créé
- [ ] Base de données migrée
- [ ] Variables d'environnement configurées
- [ ] Projet déployé sur Vercel
- [ ] Application accessible en ligne
- [ ] Premier compte créé
- [ ] Fonctionnalités testées

---

**Temps Total Estimé** : 2-3 heures

**Prochaine Étape** : Inviter d'autres ateliers à créer leur compte !

---

**Questions ?** Consultez :
- Supabase Docs : https://supabase.com/docs
- Vercel Docs : https://vercel.com/docs
- Next.js Docs : https://nextjs.org/docs
