# 🚀 Guide Migration Simple - Sans pgAdmin

## ✅ Solution : Script PowerShell Automatique

J'ai créé un script qui fait tout pour vous !

---

## 📋 Étapes Simples

### 1. Ouvrir PowerShell dans le Bon Dossier

**Option A : Depuis VS Code**
- Ouvrir le terminal intégré (Ctrl + `)
- Vous êtes déjà dans le bon dossier !

**Option B : Depuis l'Explorateur Windows**
- Ouvrir le dossier : `c:\Users\j_ley\Atelier-velo+\apps\web`
- Dans la barre d'adresse, taper : `powershell`
- Appuyer sur Entrée

---

### 2. Autoriser l'Exécution de Scripts (Une Seule Fois)

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

Appuyer sur Entrée.

---

### 3. Exécuter le Script de Migration

```powershell
.\run-migration.ps1
```

Appuyer sur Entrée.

---

### 4. Répondre aux Questions

Le script vous demandera :

**Nom de la base de données** :
- Appuyer juste sur Entrée (utilise `atelier_velo` par défaut)

**Utilisateur** :
- Appuyer juste sur Entrée (utilise `postgres` par défaut)

**Mot de passe** :
- Taper votre mot de passe PostgreSQL
- Appuyer sur Entrée

---

### 5. Vérifier le Résultat

Si tout est OK, vous verrez :
```
=== Migration réussie ! ===

Prochaines étapes:
1. Exécuter: npx prisma generate
2. Redémarrer le serveur
```

---

## 🔄 Après la Migration

### Étape 1 : Générer le Client Prisma

```powershell
npx prisma generate
```

**Résultat attendu** :
```
✔ Generated Prisma Client
```

---

### Étape 2 : Redémarrer le Serveur

```powershell
# Arrêter le serveur (Ctrl+C)
# Puis relancer
npm run dev
```

---

### Étape 3 : Tester

1. Aller sur `http://localhost:3000/dashboard`
2. Vérifier le widget "Terminés ce mois"
3. Modifier un ticket (passer en ready)
4. Vérifier que le compteur s'incrémente

---

## 🐛 En Cas de Problème

### Erreur : "psql.exe non trouvé"

Le script cherche PostgreSQL ici : `C:\Program Files\PostgreSQL\18\bin\psql.exe`

Si votre version est différente, modifiez la ligne 8 du script `run-migration.ps1` :
```powershell
$psqlPath = "C:\Program Files\PostgreSQL\[VOTRE_VERSION]\bin\psql.exe"
```

---

### Erreur : "Mot de passe incorrect"

Vérifiez votre mot de passe PostgreSQL.

Pour le réinitialiser :
1. Ouvrir `pg_hba.conf` (dans `C:\Program Files\PostgreSQL\18\data\`)
2. Changer `md5` en `trust` temporairement
3. Redémarrer PostgreSQL
4. Se connecter sans mot de passe
5. Changer le mot de passe : `ALTER USER postgres PASSWORD 'nouveau_mdp';`
6. Remettre `md5` dans `pg_hba.conf`
7. Redémarrer PostgreSQL

---

### Erreur : "Base de données non trouvée"

Vérifier le nom de votre base :
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -l
```

Utiliser le bon nom quand le script demande.

---

## 📝 Commandes Complètes (Copier-Coller)

```powershell
# 1. Autoriser scripts (une seule fois)
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force

# 2. Exécuter migration
.\run-migration.ps1

# 3. Générer client Prisma
npx prisma generate

# 4. Redémarrer serveur
# Ctrl+C puis
npm run dev
```

---

## ✅ Checklist

- [ ] PowerShell ouvert dans `apps/web`
- [ ] Exécution scripts autorisée
- [ ] Script `run-migration.ps1` exécuté avec succès
- [ ] `npx prisma generate` exécuté
- [ ] Serveur redémarré
- [ ] Dashboard testé

---

**C'est beaucoup plus simple que pgAdmin !** 🎉

**Tout est automatisé dans le script** ✅
