# 🌐 Accès Internet - Page RDV Clients

## 🎯 Objectif

Permettre aux clients d'accéder à la page de prise de RDV via internet, sans avoir à installer quoi que ce soit.

---

## 💡 Solutions Possibles

### **Solution 1 : Ngrok (Recommandée pour Tests)** ⚡

**Avantages** :
- ✅ Gratuit pour usage basique
- ✅ Installation en 2 minutes
- ✅ URL HTTPS automatique
- ✅ Parfait pour tests et démos

**Inconvénients** :
- ⚠️ URL change à chaque redémarrage (version gratuite)
- ⚠️ Limité en bande passante
- ⚠️ Pas pour production long terme

**Installation** :
```powershell
# 1. Télécharger ngrok
# https://ngrok.com/download

# 2. Installer
# Extraire le fichier ZIP

# 3. S'inscrire (gratuit)
# https://dashboard.ngrok.com/signup

# 4. Configurer le token
ngrok config add-authtoken VOTRE_TOKEN

# 5. Lancer le tunnel
ngrok http 3000
```

**Résultat** :
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**Partager le lien** :
```
https://abc123.ngrok.io/booking-local
```

---

### **Solution 2 : Vercel (Recommandée pour Production)** 🚀

**Avantages** :
- ✅ Gratuit pour petits projets
- ✅ URL fixe et personnalisable
- ✅ HTTPS automatique
- ✅ Déploiement continu (Git)
- ✅ Performance mondiale (CDN)
- ✅ Parfait pour Next.js

**Inconvénients** :
- ⚠️ Nécessite un compte GitHub
- ⚠️ Base de données doit être accessible depuis internet

**Étapes** :

1. **Créer un compte Vercel** : https://vercel.com/signup
2. **Connecter GitHub** : Importer le repo
3. **Configurer les variables d'env** :
   ```
   DATABASE_URL=postgresql://...  (Supabase ou autre)
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
4. **Déployer** : Automatique à chaque push Git

**URL finale** :
```
https://atelier-velo.vercel.app/booking-local
```

---

### **Solution 3 : Cloudflare Tunnel** 🔒

**Avantages** :
- ✅ Gratuit
- ✅ URL fixe
- ✅ Très sécurisé
- ✅ Pas besoin d'ouvrir de ports

**Inconvénients** :
- ⚠️ Configuration plus technique
- ⚠️ Nécessite installation d'un daemon

**Installation** :
```powershell
# 1. Installer cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# 2. S'authentifier
cloudflared tunnel login

# 3. Créer un tunnel
cloudflared tunnel create atelier-velo

# 4. Configurer
cloudflared tunnel route dns atelier-velo rdv.votre-domaine.fr

# 5. Lancer
cloudflared tunnel run atelier-velo
```

---

### **Solution 4 : Serveur VPS (Pour Contrôle Total)** 💪

**Avantages** :
- ✅ Contrôle total
- ✅ URL fixe
- ✅ Pas de limitations

**Inconvénients** :
- ⚠️ Coût mensuel (~5-10€/mois)
- ⚠️ Maintenance serveur
- ⚠️ Configuration technique

**Providers** :
- **Hetzner** : 4€/mois
- **DigitalOcean** : 6$/mois
- **OVH** : 3,50€/mois

---

## 🎯 Recommandation par Cas d'Usage

### **Tests / Démos (Court Terme)**
```
👉 Ngrok
- Gratuit
- Rapide
- URL temporaire OK
```

### **Production (Long Terme)**
```
👉 Vercel
- Gratuit pour petits projets
- URL fixe
- Déploiement automatique
- Performance optimale
```

### **Hébergement Local avec Accès Internet**
```
👉 Cloudflare Tunnel
- Gratuit
- Sécurisé
- Serveur reste chez vous
```

---

## 📋 Guide Rapide : Ngrok (Solution Immédiate)

### **Étape 1 : Installation**

1. **Télécharger** : https://ngrok.com/download
2. **Extraire** le ZIP dans `C:\ngrok`
3. **Créer un compte** : https://dashboard.ngrok.com/signup
4. **Copier le token** d'authentification

### **Étape 2 : Configuration**

```powershell
cd C:\ngrok
.\ngrok config add-authtoken VOTRE_TOKEN_ICI
```

### **Étape 3 : Lancement**

```powershell
# Terminal 1 : Lancer l'app
cd C:\Users\j_ley\Atelier-velo+\apps\web
pnpm dev

# Terminal 2 : Lancer ngrok
cd C:\ngrok
.\ngrok http 3000
```

### **Étape 4 : Partager le Lien**

Ngrok affiche :
```
Forwarding  https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Lien à partager** :
```
https://abc123-def456.ngrok-free.app/booking-local
```

---

## 🔐 Sécurité

### **Ngrok**
- ✅ HTTPS automatique
- ✅ URL aléatoire (difficile à deviner)
- ⚠️ Ajouter un mot de passe (option payante)

### **Vercel**
- ✅ HTTPS automatique
- ✅ Protection DDoS
- ✅ Variables d'env sécurisées

### **Cloudflare Tunnel**
- ✅ HTTPS automatique
- ✅ Protection DDoS Cloudflare
- ✅ Authentification possible

---

## 💰 Coûts

| Solution | Gratuit | Payant |
|----------|---------|--------|
| **Ngrok** | ✅ Oui (URL temporaire) | 8$/mois (URL fixe) |
| **Vercel** | ✅ Oui (100GB/mois) | 20$/mois (Pro) |
| **Cloudflare** | ✅ Oui (illimité) | - |
| **VPS** | ❌ Non | 3-10€/mois |

---

## 🚀 Déploiement Vercel (Détaillé)

### **Prérequis**
- Compte GitHub
- Repo Git du projet
- Base de données accessible depuis internet (Supabase recommandé)

### **Étapes**

1. **Push le code sur GitHub**
```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_USER/atelier-velo.git
git push -u origin main
```

2. **Importer sur Vercel**
- Aller sur https://vercel.com
- Cliquer "New Project"
- Importer depuis GitHub
- Sélectionner le repo

3. **Configurer les variables d'environnement**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
NEXTAUTH_SECRET=...
AUTH_SECRET=...
NEXTAUTH_URL=https://votre-app.vercel.app
AUTH_URL=https://votre-app.vercel.app
```

4. **Déployer**
- Cliquer "Deploy"
- Attendre 2-3 minutes
- ✅ App en ligne !

5. **URL personnalisée** (Optionnel)
- Aller dans Settings → Domains
- Ajouter votre domaine
- Configurer les DNS

---

## 📱 QR Code pour Clients

Une fois l'URL publique obtenue, créez un QR Code :

**Outils gratuits** :
- https://www.qr-code-generator.com/
- https://www.qrcode-monkey.com/

**Utilisation** :
1. Générer le QR Code avec l'URL
2. Imprimer et afficher dans l'atelier
3. Clients scannent avec leur téléphone
4. Accès direct à la prise de RDV

---

## ✅ Checklist Déploiement

### **Avant le Déploiement**
- [ ] Base de données accessible depuis internet
- [ ] Variables d'environnement prêtes
- [ ] Code testé localement
- [ ] Middleware configuré (routes publiques)

### **Après le Déploiement**
- [ ] Tester la page RDV
- [ ] Vérifier les créneaux s'affichent
- [ ] Tester une réservation
- [ ] Créer le QR Code
- [ ] Partager le lien aux clients

---

## 🎉 Résultat Final

**Les clients peuvent** :
- ✅ Accéder à la page depuis n'importe où
- ✅ Voir les créneaux disponibles
- ✅ Réserver un RDV
- ✅ Recevoir une confirmation

**Vous recevez** :
- ✅ Notification de réservation
- ✅ RDV dans le calendrier admin
- ✅ Créneau bloqué automatiquement

---

## 💡 Recommandation Finale

**Pour commencer immédiatement** :
```
👉 Ngrok (5 minutes)
```

**Pour une solution pérenne** :
```
👉 Vercel + Supabase (1 heure)
```

**Les deux sont gratuits et parfaitement adaptés !** 🚀
