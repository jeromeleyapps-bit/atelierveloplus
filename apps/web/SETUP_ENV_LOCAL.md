# 🔧 Configuration .env.local pour PostgreSQL Local

## 🔍 Problème

Votre `.env` pointe vers **Supabase** (cloud), pas vers votre PostgreSQL local.

```
Datasource "db": PostgreSQL database "postgres", schema "public" at "aws-1-eu-west-3.pooler.supabase.com:6543"
```

---

## ✅ Solution : Créer .env.local

### Étape 1: Créer le Fichier .env.local

**Dans VS Code** :
1. Clic droit dans le dossier `apps/web`
2. **New File** (Nouveau fichier)
3. Nommer : `.env.local`

**OU dans PowerShell** :
```powershell
New-Item -Path ".env.local" -ItemType File
```

---

### Étape 2: Copier Cette Configuration

**Ouvrir `.env.local`** et coller :

```env
# PostgreSQL Local
DATABASE_URL="postgresql://postgres@localhost:5432/atelier_velo?schema=public"
```

**Sauvegarder** (Ctrl+S)

---

### Étape 3: Vérifier que .env.local est Prioritaire

Next.js charge les fichiers dans cet ordre :
1. `.env.local` ✅ (prioritaire)
2. `.env.development`
3. `.env`

Donc `.env.local` va **écraser** la config Supabase de `.env` !

---

## 🚀 Maintenant Relancer les Commandes

### 1. Créer la Base de Données

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE atelier_velo;"
```

---

### 2. Appliquer les Migrations Prisma

```powershell
npx prisma migrate deploy
```

**Résultat attendu** :
```
Datasource "db": PostgreSQL database "atelier_velo" at "localhost:5432"
✔ Applied migrations:
  - 20250930204708_init
  - ...
```

---

### 3. Exécuter Notre Migration updatedAt

```powershell
.\run-migration.ps1
```

Entrer : `atelier_velo`

---

### 4. Générer le Client Prisma

```powershell
npx prisma generate
```

---

### 5. Redémarrer le Serveur

```powershell
# Ctrl+C puis
npm run dev
```

---

## 📝 Contenu Complet de .env.local

```env
# PostgreSQL Local
DATABASE_URL="postgresql://postgres@localhost:5432/atelier_velo?schema=public"

# Next Auth (si nécessaire)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_ici

# Autres variables d'environnement locales
```

---

## 🔒 Sécurité

**Important** : `.env.local` est déjà dans `.gitignore`, donc il ne sera **pas committé** sur Git.

C'est parfait pour avoir :
- **Supabase** en production (`.env`)
- **PostgreSQL local** en développement (`.env.local`)

---

## ⚠️ Si Vous Voulez Utiliser Supabase

Si vous préférez utiliser Supabase au lieu de PostgreSQL local :

1. **Ne créez PAS** `.env.local`
2. **Corrigez** les identifiants Supabase dans `.env`
3. **Exécutez** les migrations sur Supabase :
   ```powershell
   npx prisma migrate deploy
   ```

---

## 🎯 Résumé

1. ✅ Créer `.env.local` avec `DATABASE_URL` local
2. ✅ Créer base `atelier_velo`
3. ✅ Appliquer migrations Prisma
4. ✅ Exécuter migration `updatedAt`
5. ✅ Générer client Prisma
6. ✅ Redémarrer serveur

---

**Créez `.env.local` maintenant et relancez les commandes !** 🚀
