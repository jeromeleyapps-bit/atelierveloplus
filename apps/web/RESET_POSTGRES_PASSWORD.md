# 🔐 Réinitialiser le Mot de Passe PostgreSQL

## 📋 Étapes à Suivre

### Étape 1: Arrêter le Serveur PostgreSQL

**Via Services Windows** :
1. Appuyer sur `Windows + R`
2. Taper : `services.msc`
3. Appuyer sur Entrée
4. Chercher : `postgresql-x64-18` (ou similaire)
5. Clic droit → **Arrêter**

---

### Étape 2: Modifier le Fichier de Configuration

**Ouvrir le fichier `pg_hba.conf`** :

**Chemin** : `C:\Program Files\PostgreSQL\18\data\pg_hba.conf`

1. Ouvrir l'Explorateur Windows
2. Naviguer vers : `C:\Program Files\PostgreSQL\18\data\`
3. Clic droit sur `pg_hba.conf`
4. Sélectionner : **Ouvrir avec** → **Bloc-notes** (en tant qu'administrateur)

**Modifier la ligne** :
```
# Chercher cette ligne (vers la fin du fichier)
host    all             all             127.0.0.1/32            scram-sha-256

# Remplacer par
host    all             all             127.0.0.1/32            trust
```

**Sauvegarder** (Ctrl+S) et **Fermer**

---

### Étape 3: Redémarrer PostgreSQL

**Via Services Windows** :
1. Retourner dans `services.msc`
2. Chercher : `postgresql-x64-18`
3. Clic droit → **Démarrer**

---

### Étape 4: Se Connecter SANS Mot de Passe

**Ouvrir PowerShell** et exécuter :

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres
```

Vous devriez être connecté **sans demander de mot de passe** !

---

### Étape 5: Changer le Mot de Passe

**Dans psql**, taper :

```sql
ALTER USER postgres PASSWORD 'votre_nouveau_mot_de_passe';
```

**Remplacer** `votre_nouveau_mot_de_passe` par un mot de passe de votre choix.

**Exemple** :
```sql
ALTER USER postgres PASSWORD 'admin123';
```

Appuyer sur Entrée.

**Résultat attendu** :
```
ALTER ROLE
```

**Quitter psql** :
```
\q
```

---

### Étape 6: Remettre la Sécurité

**Rouvrir `pg_hba.conf`** :

**Modifier la ligne** :
```
# Remettre comme avant
host    all             all             127.0.0.1/32            scram-sha-256
```

**Sauvegarder** et **Fermer**

---

### Étape 7: Redémarrer PostgreSQL

**Via Services Windows** :
1. `services.msc`
2. `postgresql-x64-18`
3. Clic droit → **Redémarrer**

---

### Étape 8: Tester le Nouveau Mot de Passe

**Dans PowerShell** :

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d atelier_velo
```

**Entrer votre nouveau mot de passe** quand demandé.

Si ça fonctionne → **Mot de passe réinitialisé avec succès !** ✅

---

## 🚀 Après Réinitialisation

### Exécuter la Migration

```powershell
.\run-migration.ps1
```

**Entrer le nouveau mot de passe** quand demandé.

---

## 📝 Résumé des Commandes

```powershell
# 1. Arrêter PostgreSQL (via services.msc)

# 2. Modifier pg_hba.conf
# Remplacer scram-sha-256 par trust

# 3. Redémarrer PostgreSQL (via services.msc)

# 4. Se connecter sans mot de passe
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d postgres

# 5. Changer le mot de passe
ALTER USER postgres PASSWORD 'votre_nouveau_mdp';
\q

# 6. Remettre scram-sha-256 dans pg_hba.conf

# 7. Redémarrer PostgreSQL (via services.msc)

# 8. Tester
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d atelier_velo

# 9. Exécuter migration
.\run-migration.ps1
```

---

## ⚠️ Important

**Notez votre nouveau mot de passe** quelque part pour ne pas l'oublier !

---

## 🐛 En Cas de Problème

### Erreur : "Accès refusé" lors de la modification de pg_hba.conf

**Solution** :
1. Clic droit sur Bloc-notes
2. **Exécuter en tant qu'administrateur**
3. Fichier → Ouvrir → Naviguer vers `pg_hba.conf`

### Erreur : "Service ne démarre pas"

**Solution** :
1. Vérifier que vous avez bien sauvegardé `pg_hba.conf`
2. Vérifier qu'il n'y a pas d'erreur de syntaxe
3. Regarder les logs : `C:\Program Files\PostgreSQL\18\data\log\`

---

**Suivez ces étapes et vous pourrez réinitialiser votre mot de passe !** 🔐
