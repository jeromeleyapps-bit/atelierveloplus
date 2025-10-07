# 🔒 Cloudflare Tunnel - Guide Complet

## 🎯 Objectif

Exposer l'application Atelier Vélo+ sur internet de manière sécurisée, sans ouvrir de ports sur votre routeur.

---

## ✅ Avantages Cloudflare Tunnel

- ✅ **Gratuit** et illimité
- ✅ **URL fixe** (votre domaine)
- ✅ **HTTPS automatique** (certificat SSL)
- ✅ **Pas de ports à ouvrir** (sécurité maximale)
- ✅ **Protection DDoS** Cloudflare
- ✅ **Serveur reste local** (contrôle total)

---

## 📋 Prérequis

### **1. Nom de Domaine**

Vous avez besoin d'un nom de domaine. Options :

**Option A : Domaine Existant**
- Si vous avez déjà un domaine (ex: `atelier-velo.fr`)
- Transférez les DNS vers Cloudflare

**Option B : Acheter un Domaine**
- **OVH** : ~10€/an (.fr)
- **Gandi** : ~15€/an (.fr)
- **Cloudflare** : ~10$/an (.com)

**Option C : Sous-domaine Gratuit** (pour tests)
- Utiliser un service comme **FreeDNS** ou **Duck DNS**
- Puis configurer dans Cloudflare

### **2. Compte Cloudflare**

- Créer un compte gratuit : https://dash.cloudflare.com/sign-up
- Ajouter votre domaine
- Changer les DNS chez votre registrar

---

## 🚀 Installation Cloudflare Tunnel

### **Étape 1 : Télécharger cloudflared**

**Windows** :
```powershell
# Télécharger
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "C:\cloudflared\cloudflared.exe"

# Ou télécharger manuellement depuis :
# https://github.com/cloudflare/cloudflared/releases
```

**Créer le dossier** :
```powershell
New-Item -ItemType Directory -Path "C:\cloudflared" -Force
```

---

### **Étape 2 : Authentification**

```powershell
cd C:\cloudflared
.\cloudflared.exe tunnel login
```

**Résultat** :
- Une page web s'ouvre
- Sélectionnez votre domaine
- Cliquez "Authorize"
- ✅ Certificat téléchargé dans `C:\Users\VOTRE_USER\.cloudflared\cert.pem`

---

### **Étape 3 : Créer le Tunnel**

```powershell
.\cloudflared.exe tunnel create atelier-velo
```

**Résultat** :
```
Created tunnel atelier-velo with id abc123-def456-ghi789
```

**Note** : Gardez cet ID, vous en aurez besoin !

---

### **Étape 4 : Configurer le Tunnel**

Créez le fichier `C:\cloudflared\config.yml` :

```yaml
tunnel: abc123-def456-ghi789
credentials-file: C:\Users\VOTRE_USER\.cloudflared\abc123-def456-ghi789.json

ingress:
  # Route principale : page RDV clients
  - hostname: rdv.atelier-velo.fr
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  
  # Route admin (optionnel)
  - hostname: admin.atelier-velo.fr
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  
  # Catch-all (obligatoire)
  - service: http_status:404
```

**Remplacez** :
- `abc123-def456-ghi789` par votre ID de tunnel
- `VOTRE_USER` par votre nom d'utilisateur Windows
- `rdv.atelier-velo.fr` par votre domaine

---

### **Étape 5 : Configurer les DNS**

```powershell
.\cloudflared.exe tunnel route dns atelier-velo rdv.atelier-velo.fr
```

**Si vous avez plusieurs sous-domaines** :
```powershell
.\cloudflared.exe tunnel route dns atelier-velo admin.atelier-velo.fr
```

**Résultat** :
- Un enregistrement DNS CNAME est créé automatiquement
- `rdv.atelier-velo.fr` → `abc123.cfargotunnel.com`

---

### **Étape 6 : Tester le Tunnel**

```powershell
# Terminal 1 : Lancer l'app Next.js
cd C:\Users\j_ley\Atelier-velo+\apps\web
pnpm dev

# Terminal 2 : Lancer le tunnel
cd C:\cloudflared
.\cloudflared.exe tunnel run atelier-velo
```

**Vérification** :
- Ouvrez `https://rdv.atelier-velo.fr/booking-local`
- ✅ La page doit s'afficher !

---

## 🔧 Installation comme Service Windows

Pour que le tunnel démarre automatiquement avec Windows :

### **Étape 1 : Installer le Service**

```powershell
cd C:\cloudflared
.\cloudflared.exe service install
```

### **Étape 2 : Démarrer le Service**

```powershell
# Démarrer
.\cloudflared.exe service start

# Vérifier le statut
Get-Service cloudflared
```

### **Étape 3 : Configuration Automatique**

Le service utilisera automatiquement `C:\cloudflared\config.yml`.

---

## 📁 Structure des Fichiers

```
C:\cloudflared\
├── cloudflared.exe          # Exécutable
├── config.yml               # Configuration du tunnel
└── logs\                    # Logs (créé automatiquement)

C:\Users\VOTRE_USER\.cloudflared\
├── cert.pem                 # Certificat d'authentification
└── abc123-def456.json       # Credentials du tunnel
```

---

## 🎨 Configuration Avancée

### **Plusieurs Applications**

```yaml
tunnel: abc123-def456-ghi789
credentials-file: C:\Users\VOTRE_USER\.cloudflared\abc123.json

ingress:
  # Page RDV clients
  - hostname: rdv.atelier-velo.fr
    service: http://localhost:3000
    path: /booking-local
  
  # App principale (admin)
  - hostname: app.atelier-velo.fr
    service: http://localhost:3000
  
  # API publique
  - hostname: api.atelier-velo.fr
    service: http://localhost:3000
    path: /api
  
  - service: http_status:404
```

### **Restrictions d'Accès**

**Protéger l'admin avec Cloudflare Access** :

1. Aller dans Cloudflare Dashboard
2. Zero Trust → Access → Applications
3. Créer une application
4. Ajouter des règles (email, IP, etc.)

---

## 🔐 Sécurité

### **1. Firewall Cloudflare**

- Activer le WAF (Web Application Firewall)
- Règles de sécurité automatiques
- Protection DDoS

### **2. Rate Limiting**

Créer des règles dans Cloudflare Dashboard :
- `/api/*` : 100 requêtes/minute
- `/booking-local` : 10 requêtes/minute

### **3. Authentification**

Pour les pages admin, utilisez **Cloudflare Access** :
- Authentification par email
- Google OAuth
- GitHub OAuth

---

## 📊 Monitoring

### **Logs du Tunnel**

```powershell
# Voir les logs en temps réel
Get-Content C:\cloudflared\logs\cloudflared.log -Wait

# Ou via le service
Get-EventLog -LogName Application -Source cloudflared -Newest 50
```

### **Dashboard Cloudflare**

- Analytics → Trafic
- Voir les requêtes en temps réel
- Statistiques de bande passante

---

## 🛠️ Commandes Utiles

### **Gestion du Tunnel**

```powershell
# Lister les tunnels
.\cloudflared.exe tunnel list

# Informations sur un tunnel
.\cloudflared.exe tunnel info atelier-velo

# Supprimer un tunnel
.\cloudflared.exe tunnel delete atelier-velo

# Nettoyer les tunnels inactifs
.\cloudflared.exe tunnel cleanup
```

### **Gestion du Service**

```powershell
# Démarrer
Start-Service cloudflared

# Arrêter
Stop-Service cloudflared

# Redémarrer
Restart-Service cloudflared

# Statut
Get-Service cloudflared

# Désinstaller
.\cloudflared.exe service uninstall
```

---

## 🐛 Dépannage

### **Problème 1 : Tunnel ne démarre pas**

```powershell
# Vérifier la config
.\cloudflared.exe tunnel ingress validate

# Tester manuellement
.\cloudflared.exe tunnel run atelier-velo
```

### **Problème 2 : 502 Bad Gateway**

- Vérifier que Next.js tourne sur `localhost:3000`
- Vérifier le firewall Windows
- Vérifier les logs

### **Problème 3 : DNS ne résout pas**

```powershell
# Vérifier les routes DNS
.\cloudflared.exe tunnel route dns list

# Forcer la propagation DNS
nslookup rdv.atelier-velo.fr 1.1.1.1
```

---

## 📱 QR Code pour Clients

Une fois le tunnel configuré :

1. **Générer le QR Code** : https://www.qr-code-generator.com/
2. **URL** : `https://rdv.atelier-velo.fr/booking-local`
3. **Imprimer** et afficher dans l'atelier
4. **Clients scannent** avec leur téléphone

---

## 💰 Coûts

| Service | Coût |
|---------|------|
| **Cloudflare Tunnel** | ✅ Gratuit |
| **Cloudflare DNS** | ✅ Gratuit |
| **Cloudflare SSL** | ✅ Gratuit |
| **Bande passante** | ✅ Illimitée |
| **Nom de domaine** | ~10€/an |

**Total : ~10€/an** (juste le domaine)

---

## ✅ Checklist Déploiement

### **Avant le Déploiement**
- [ ] Domaine acheté et configuré
- [ ] Compte Cloudflare créé
- [ ] DNS transférés vers Cloudflare
- [ ] cloudflared téléchargé

### **Configuration**
- [ ] Tunnel créé
- [ ] config.yml configuré
- [ ] Routes DNS créées
- [ ] Tunnel testé manuellement

### **Production**
- [ ] Service Windows installé
- [ ] Service démarré automatiquement
- [ ] Logs vérifiés
- [ ] URL publique testée

### **Sécurité**
- [ ] WAF activé
- [ ] Rate limiting configuré
- [ ] Cloudflare Access (pour admin)
- [ ] Monitoring activé

---

## 🎉 Résultat Final

**URL Publique** :
```
https://rdv.atelier-velo.fr/booking-local
```

**Les clients peuvent** :
- ✅ Accéder depuis n'importe où
- ✅ Voir les créneaux disponibles
- ✅ Réserver un RDV
- ✅ HTTPS sécurisé

**Vous gardez** :
- ✅ Serveur chez vous
- ✅ Contrôle total
- ✅ Données locales
- ✅ Pas de ports ouverts

---

## 📞 Support

**Documentation officielle** :
- https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/

**Communauté** :
- https://community.cloudflare.com/

**Vidéos tutoriels** :
- https://www.youtube.com/results?search_query=cloudflare+tunnel

---

## 🚀 Prochaines Étapes

1. **Acheter un domaine** (si pas déjà fait)
2. **Créer compte Cloudflare**
3. **Installer cloudflared**
4. **Configurer le tunnel**
5. **Tester l'accès public**
6. **Créer le QR Code**
7. **Partager aux clients** 🎉

**Prêt à démarrer ? Suivez les étapes ci-dessus !** 🔥
