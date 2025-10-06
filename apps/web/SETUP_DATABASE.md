# 🗄️ Configuration Base de Données - Guide Complet

## 🔍 Situation Actuelle

Votre application est configurée pour PostgreSQL, mais :
- ❌ La base de données `atelier_velo` n'existe pas
- ✅ Les migrations Prisma existent (dans `prisma/migrations/`)
- ✅ PostgreSQL est installé et fonctionne

## ✅ Solution : Créer et Initialiser la Base

### Étape 1: Créer la Base de Données

**Dans PowerShell** :

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE atelier_velo;"
```

**Résultat attendu** :
```
CREATE DATABASE
```

---

### Étape 2: Appliquer les Migrations Prisma

```powershell
npx prisma migrate deploy
```

**OU si ça ne fonctionne pas** :

```powershell
npx prisma db push
```

**Résultat attendu** :
```
✔ Generated Prisma Client
✔ Applied migrations:
  - 20250930204708_init
  - 20251001183206_calendar_init
  - 20251001194849_booking_customer_link
  - 20251002210321_catalog_category_enum
  - 20251002230100_normalize_catalog_category
```

---

### Étape 3: Vérifier que les Tables Existent

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d atelier_velo -c "\dt"
```

**Résultat attendu** : Liste de toutes vos tables (WorkOrder, Customer, Invoice, etc.)

---

### Étape 4: Maintenant Exécuter Notre Migration updatedAt

```powershell
.\run-migration.ps1
```

**Entrer** : `atelier_velo` comme nom de base de données

---

## 📝 Commandes Complètes (Copier-Coller)

```powershell
# 1. Créer la base de données
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE atelier_velo;"

# 2. Appliquer les migrations Prisma
npx prisma migrate deploy

# 3. Vérifier les tables
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d atelier_velo -c "\dt"

# 4. Exécuter notre migration updatedAt
.\run-migration.ps1
# Entrer: atelier_velo

# 5. Générer le client Prisma
npx prisma generate

# 6. Redémarrer le serveur
# Ctrl+C puis
npm run dev
```

---

## ⚠️ Si Erreur "migrate deploy" Ne Fonctionne Pas

### Alternative : db push

```powershell
npx prisma db push
```

**Attention** : `db push` synchronise le schéma sans créer de migration. C'est OK pour le développement.

---

## 🐛 Dépannage

### Erreur : "Base de données existe déjà"

C'est OK ! Passez directement à l'étape 2 (migrations Prisma).

### Erreur : "Cannot connect to database"

Vérifiez votre `DATABASE_URL` dans `.env` :
```
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/atelier_velo?schema=public"
```

### Erreur : "Migration failed"

Essayez `db push` à la place :
```powershell
npx prisma db push
```

---

## ✅ Après Configuration

### Remettre la Sécurité PostgreSQL

**Important** : Remettre `scram-sha-256` dans `pg_hba.conf` !

1. Ouvrir : `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`
2. Remplacer tous les `trust` par `scram-sha-256`
3. Sauvegarder
4. Redémarrer PostgreSQL (via `services.msc`)

### Définir un Mot de Passe

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres -c "ALTER USER postgres PASSWORD 'votre_mot_de_passe';"
```

### Mettre à Jour .env

Créer/Modifier `.env` :
```
DATABASE_URL="postgresql://postgres:votre_mot_de_passe@localhost:5432/atelier_velo?schema=public"
```

---

## 🎯 Résumé

1. ✅ Créer base `atelier_velo`
2. ✅ Appliquer migrations Prisma
3. ✅ Exécuter migration `updatedAt`
4. ✅ Générer client Prisma
5. ✅ Remettre sécurité PostgreSQL
6. ✅ Redémarrer serveur

---

**Suivez ces étapes et votre base sera prête !** 🚀
