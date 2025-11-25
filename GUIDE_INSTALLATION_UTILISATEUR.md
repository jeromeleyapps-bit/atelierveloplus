# 📘 Guide d'Installation et de Configuration - Atelier Vélo+

## 🎯 Vue d'ensemble

Ce guide explique comment installer et configurer **Atelier Vélo+** pour qu'un nouvel utilisateur puisse utiliser l'application de manière autonome avec toutes les fonctionnalités.

---

## 📦 Prérequis Système

### Configuration Minimale
- **Système d'exploitation** : Windows 10/11 (64-bit)
- **RAM** : 4 GB minimum (8 GB recommandé)
- **Espace disque** : 500 MB pour l'application + 1 GB pour les données
- **Connexion Internet** : Requise pour l'installation initiale et les mises à jour

### Logiciels Requis
- **Node.js v20.18.0 LTS** : [Télécharger ici](https://nodejs.org/en/download/)
  - ⚠️ **Important** : Utilisez exactement la version 20.18.0 (pas 22.x)
  - Lors de l'installation, cochez "Automatically install the necessary tools"

---

## 🚀 Installation de l'Application

### Option 1 : Installation via l'Installateur (Recommandé)

#### Étape 1 : Télécharger l'Installateur
1. Téléchargez `Atelier-Velo-Plus-Setup.exe` depuis votre source de distribution
2. Placez-le dans un dossier temporaire (ex: `C:\Temp`)

#### Étape 2 : Exécuter l'Installateur
1. **Clic droit** sur `Atelier-Velo-Plus-Setup.exe`
2. Sélectionnez **"Exécuter en tant qu'administrateur"**
3. Suivez les instructions à l'écran
4. Choisissez le dossier d'installation (recommandé : `C:\AtelierVelo`)
5. Attendez la fin de l'installation (2-3 minutes)

#### Étape 3 : Premier Lancement
1. Double-cliquez sur l'icône **"Atelier Vélo+"** sur le Bureau
2. L'application démarre automatiquement
3. Une fenêtre s'ouvre avec l'interface de l'application

---

### Option 2 : Installation Portable (Sans Installateur)

#### Étape 1 : Décompresser l'Archive
1. Téléchargez `Atelier-Velo-Plus-Portable.zip`
2. Extrayez le contenu dans un dossier (ex: `C:\AtelierVelo`)
3. **Ne modifiez pas** la structure des dossiers

#### Étape 2 : Lancer l'Application
1. Ouvrez le dossier `win-unpacked`
2. Double-cliquez sur `Atelier Vélo+.exe`

---

## 🔧 Configuration Initiale

### 1. Configuration de la Base de Données

L'application utilise **SQLite** (base de données locale) par défaut. Aucune configuration n'est nécessaire.

**Emplacement de la base de données** :
```
C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\data\atelier.db
```

### 2. Configuration de l'Authentification

#### Étape 1 : Générer les Clés Secrètes

**Option A : Utiliser PowerShell (Recommandé)**
1. Ouvrez PowerShell
2. Exécutez :
```powershell
# Générer NEXTAUTH_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Générer AUTH_SECRET
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
3. **Copiez et sauvegardez** ces deux clés (vous en aurez besoin à l'étape suivante)

**Option B : Utiliser un Générateur en Ligne**
1. Allez sur https://generate-secret.vercel.app/32
2. Cliquez sur "Generate" deux fois pour obtenir deux clés différentes
3. **Copiez et sauvegardez** ces deux clés

#### Étape 2 : Configurer le Fichier .env

1. Ouvrez le dossier d'installation :
   - **Installateur** : `C:\AtelierVelo\resources\web`
   - **Portable** : `C:\AtelierVelo\win-unpacked\resources\web`

2. Ouvrez le fichier `.env` avec **Notepad** ou **Notepad++**

3. Modifiez les lignes suivantes avec vos clés générées :
```env
NEXTAUTH_SECRET=VOTRE_PREMIERE_CLE_GENEREE
AUTH_SECRET=VOTRE_DEUXIEME_CLE_GENEREE
NEXTAUTH_URL=http://127.0.0.1:3000
AUTH_URL=http://127.0.0.1:3000
AUTH_TRUST_HOST=true
```

4. **Sauvegardez** le fichier (Ctrl+S)

### 3. Configuration des Informations de l'Atelier

Dans le même fichier `.env`, configurez les informations de votre atelier :

```env
# Informations de base
SHOP_NAME=Nom de Votre Atelier
SHOP_ADDRESS1=123 Rue de Votre Adresse
SHOP_ZIP=75001
SHOP_CITY=Votre Ville
SHOP_PHONE=01 23 45 67 89
SHOP_EMAIL=contact@votre-atelier.fr

# Informations légales (obligatoires pour les factures)
SHOP_SIRET=123 456 789 00012
SHOP_TVA=FR12345678901
SHOP_RCS=Paris B 123 456 789
SHOP_CAPITAL=10 000 €
SHOP_INSURANCE=Nom Assurance Police n° 123456789
```

**⚠️ Important** : Ces informations apparaîtront sur toutes vos factures PDF.

---

## 👤 Création du Premier Compte Administrateur

### Étape 1 : Lancer l'Application
1. Double-cliquez sur l'icône **"Atelier Vélo+"**
2. Attendez que l'application démarre (30-60 secondes)

### Étape 2 : Créer le Compte
1. Sur la page de connexion, cliquez sur **"Créer un compte"**
2. Remplissez le formulaire :
   - **Email** : votre-email@exemple.fr
   - **Prénom** : Votre Prénom
   - **Nom** : Votre Nom
   - **Mot de passe** : Choisissez un mot de passe fort (min. 8 caractères)
   - **Nom du magasin** : Nom de votre atelier
   - **Auto-entrepreneur** : Cochez si vous êtes en régime AE (TVA à 0%)
3. Cliquez sur **"S'inscrire"**

### Étape 3 : Première Connexion
1. Connectez-vous avec votre email et mot de passe
2. Vous arrivez sur le **Dashboard**

---

## 🌐 Configuration Optionnelle : Accès Internet pour les Clients

Si vous souhaitez que vos clients puissent prendre rendez-vous en ligne depuis Internet :

### Option 1 : Cloudflare Tunnel (Gratuit, Recommandé)

#### Étape 1 : Créer un Compte Cloudflare
1. Allez sur https://dash.cloudflare.com/sign-up
2. Créez un compte gratuit avec votre email
3. Vérifiez votre email

#### Étape 2 : Installer Cloudflare Tunnel
1. Téléchargez `cloudflared` : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Installez-le (suivez les instructions pour Windows)

#### Étape 3 : Configurer le Tunnel
1. Ouvrez PowerShell **en tant qu'administrateur**
2. Authentifiez-vous :
```powershell
cloudflared tunnel login
```
3. Une page web s'ouvre, sélectionnez votre compte Cloudflare
4. Créez un tunnel :
```powershell
cloudflared tunnel create atelier-velo
```
5. Notez l'**ID du tunnel** affiché (ex: `abc123-def456-ghi789`)

#### Étape 4 : Configurer le Fichier config.yml
1. Créez le fichier `C:\Users\<VotreNom>\.cloudflared\config.yml`
2. Ajoutez ce contenu :
```yaml
tunnel: abc123-def456-ghi789
credentials-file: C:\Users\<VotreNom>\.cloudflared\abc123-def456-ghi789.json

ingress:
  - hostname: rdv.votre-atelier.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```
3. Remplacez `abc123-def456-ghi789` par votre ID de tunnel
4. Remplacez `rdv.votre-atelier.com` par votre domaine souhaité

#### Étape 5 : Configurer le DNS
1. Dans le dashboard Cloudflare, allez dans **DNS**
2. Ajoutez un enregistrement CNAME :
   - **Type** : CNAME
   - **Name** : rdv
   - **Target** : `abc123-def456-ghi789.cfargotunnel.com`
   - **Proxy status** : Proxied (orange)

#### Étape 6 : Activer le Tunnel dans l'Application
1. Ouvrez le fichier `.env` de l'application
2. Ajoutez cette ligne :
```env
START_TUNNEL=1
```
3. Sauvegardez et redémarrez l'application

**✅ Votre application est maintenant accessible sur Internet à l'adresse** : `https://rdv.votre-atelier.com`

---

### Option 2 : Ngrok (Gratuit avec Limitations)

#### Étape 1 : Créer un Compte Ngrok
1. Allez sur https://ngrok.com/signup
2. Créez un compte gratuit

#### Étape 2 : Installer Ngrok
1. Téléchargez ngrok : https://ngrok.com/download
2. Extrayez `ngrok.exe` dans un dossier (ex: `C:\ngrok`)

#### Étape 3 : Configurer Ngrok
1. Récupérez votre **authtoken** depuis https://dashboard.ngrok.com/get-started/your-authtoken
2. Ouvrez PowerShell et exécutez :
```powershell
C:\ngrok\ngrok.exe authtoken VOTRE_AUTHTOKEN
```

#### Étape 4 : Lancer le Tunnel
1. Avec l'application Atelier Vélo+ en cours d'exécution, lancez :
```powershell
C:\ngrok\ngrok.exe http 3000
```
2. Ngrok affiche une URL (ex: `https://abc123.ngrok.io`)
3. **Partagez cette URL** avec vos clients pour qu'ils prennent rendez-vous

**⚠️ Limitations** :
- L'URL change à chaque redémarrage de ngrok (version gratuite)
- Limite de 40 connexions/minute

---

## 📧 Configuration Optionnelle : Envoi d'Emails

Pour envoyer des factures par email automatiquement :

### Option 1 : Resend (Recommandé pour Production)

#### Étape 1 : Créer un Compte Resend
1. Allez sur https://resend.com/signup
2. Créez un compte gratuit (100 emails/jour gratuits)

#### Étape 2 : Obtenir la Clé API
1. Dans le dashboard Resend, allez dans **API Keys**
2. Cliquez sur **"Create API Key"**
3. Donnez-lui un nom (ex: "Atelier Velo")
4. **Copiez la clé** (commence par `re_`)

#### Étape 3 : Configurer dans l'Application
1. Ouvrez le fichier `.env`
2. Ajoutez :
```env
RESEND_API_KEY=re_votre_cle_api_ici
EMAIL_FROM=noreply@votre-domaine.fr
```
3. Sauvegardez et redémarrez l'application

#### Étape 4 : Vérifier votre Domaine (Optionnel mais Recommandé)
1. Dans Resend, allez dans **Domains**
2. Ajoutez votre domaine (ex: `votre-atelier.fr`)
3. Suivez les instructions pour configurer les enregistrements DNS
4. Attendez la vérification (quelques minutes à quelques heures)

---

### Option 2 : Gmail (Pour Débuter)

#### Étape 1 : Activer l'Accès pour Applications Moins Sécurisées
1. Allez sur https://myaccount.google.com/security
2. Activez la **"Validation en deux étapes"**
3. Créez un **"Mot de passe d'application"** :
   - Allez dans **Sécurité** → **Mots de passe d'application**
   - Sélectionnez **"Autre (nom personnalisé)"**
   - Tapez "Atelier Velo"
   - Cliquez sur **"Générer"**
   - **Copiez le mot de passe** (16 caractères)

#### Étape 2 : Configurer dans l'Application
1. Ouvrez le fichier `.env`
2. Ajoutez :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre_mot_de_passe_application
EMAIL_FROM=votre-email@gmail.com
```
3. Sauvegardez et redémarrez l'application

**⚠️ Limitations** :
- Gmail limite à 500 emails/jour
- Risque de blocage si trop d'emails envoyés rapidement

---

## 🔄 Mises à Jour de l'Application

### Vérifier les Mises à Jour
1. Ouvrez l'application
2. Allez dans **Menu** → **À propos**
3. La version actuelle est affichée

### Installer une Mise à Jour
1. Téléchargez la nouvelle version de l'installateur
2. Fermez l'application en cours
3. Exécutez le nouvel installateur
4. Choisissez **"Mettre à jour"** (vos données seront conservées)

---

## 💾 Sauvegarde et Restauration

### Sauvegarder vos Données

#### Méthode Automatique (Recommandée)
L'application sauvegarde automatiquement la base de données toutes les 24h dans :
```
C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\backups\
```

#### Méthode Manuelle
1. Fermez l'application
2. Copiez le fichier :
```
C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\data\atelier.db
```
3. Collez-le dans un dossier de sauvegarde (ex: Dropbox, OneDrive, clé USB)
4. Renommez-le avec la date (ex: `atelier_2025-01-13.db`)

### Restaurer une Sauvegarde
1. Fermez l'application
2. Remplacez le fichier actuel par votre sauvegarde :
```
C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\data\atelier.db
```
3. Relancez l'application

---

## 🆘 Dépannage

### L'application ne démarre pas

**Symptôme** : Double-clic sur l'icône, rien ne se passe

**Solutions** :
1. Vérifiez que Node.js v20.18.0 est installé :
   ```powershell
   node -v
   ```
   Doit afficher `v20.18.0`

2. Vérifiez les logs :
   ```
   C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\logs\next-server.log
   ```

3. Réinstallez Node.js v20.18.0 :
   - Désinstallez Node.js actuel
   - Téléchargez v20.18.0 depuis https://nodejs.org/
   - Installez-le
   - Redémarrez l'ordinateur

### Page blanche au lancement

**Symptôme** : L'application s'ouvre mais affiche une page blanche

**Solutions** :
1. Attendez 30-60 secondes (le serveur démarre)
2. Vérifiez le fichier `.env` :
   - `NEXTAUTH_SECRET` et `AUTH_SECRET` sont bien renseignés
   - Pas de caractères spéciaux dans les valeurs
3. Consultez les logs (voir ci-dessus)
4. Réinstallez l'application

### Erreur "Cannot connect to database"

**Symptôme** : Message d'erreur au lancement

**Solutions** :
1. Vérifiez que le dossier `data` existe :
   ```
   C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\data\
   ```
2. Si absent, créez-le manuellement
3. Redémarrez l'application

### Les factures ne s'envoient pas par email

**Symptôme** : Erreur lors de l'envoi de facture

**Solutions** :
1. Vérifiez la configuration email dans `.env`
2. Testez la connexion SMTP avec un outil comme Telnet
3. Vérifiez que votre antivirus ne bloque pas le port 587/465
4. Consultez les logs de l'application

---

## 📞 Support et Assistance

### Logs de l'Application
Les logs sont disponibles dans :
```
C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\logs\
```

### Fichiers de Configuration
- **Base de données** : `C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\data\atelier.db`
- **Configuration** : `C:\AtelierVelo\resources\web\.env` (ou `win-unpacked\resources\web\.env`)
- **Logs** : `C:\Users\<VotreNom>\AppData\Roaming\atelier-velo-desktop\logs\`

### Informations Système Utiles
Pour obtenir de l'aide, fournissez :
1. Version de l'application (Menu → À propos)
2. Version de Windows (Win+R → `winver`)
3. Version de Node.js (`node -v` dans PowerShell)
4. Contenu du fichier `next-server.log` (dernières 50 lignes)

---

## ✅ Checklist de Configuration Complète

- [ ] Node.js v20.18.0 installé
- [ ] Application installée (installateur ou portable)
- [ ] Fichier `.env` configuré avec :
  - [ ] `NEXTAUTH_SECRET` et `AUTH_SECRET` générés
  - [ ] Informations de l'atelier (nom, adresse, SIRET, etc.)
- [ ] Premier compte administrateur créé
- [ ] Application testée (connexion, création client, création ticket)
- [ ] **(Optionnel)** Cloudflare Tunnel configuré pour accès Internet
- [ ] **(Optionnel)** Service email configuré (Resend ou Gmail)
- [ ] Sauvegarde automatique vérifiée

---

## 🎯 Prochaines Étapes

Une fois l'installation terminée :

1. **Personnalisez l'application** :
   - Ajoutez votre logo dans `Menu → Paramètres`
   - Configurez vos tarifs horaires
   - Créez votre catalogue de pièces

2. **Formez votre équipe** :
   - Créez des comptes utilisateurs supplémentaires
   - Définissez les rôles et permissions

3. **Commencez à utiliser** :
   - Créez vos premiers clients
   - Enregistrez les vélos
   - Créez des tickets de réparation
   - Générez vos premières factures

---

**Version du Guide** : 1.0  
**Dernière Mise à Jour** : 13 janvier 2025  
**Application Compatible** : Atelier Vélo+ v1.0+
