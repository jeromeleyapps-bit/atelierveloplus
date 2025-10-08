# 📱 Scanner de Code-Barres - Accès Mobile

## 🎯 Objectif

Accéder au scanner de code-barres depuis votre smartphone via l'URL HTTPS publique.

---

## ⚡ Solution : Tunnel Cloudflare Existant

Votre application utilise déjà un tunnel Cloudflare configuré !

**Domaine** : `https://rdv.upgradedbikes.com`

⚠️ **Important** : L'URL de base (`https://rdv.upgradedbikes.com`) redirige vers la page RDV clients.  
Pour le scanner, utilisez l'URL complète : `https://rdv.upgradedbikes.com/admin/catalog`

### Avantages
- ✅ **Déjà configuré** - Rien à installer
- ✅ **URL fixe** - Toujours la même
- ✅ **HTTPS automatique** - Requis pour la caméra
- ✅ **Sécurisé** - Tunnel Cloudflare + authentification

---

## 🚀 Utilisation (Simple)

### Démarrer l'application avec tunnel

```powershell
cd C:\Users\j_ley\Atelier-velo+\apps\web
npm run dev:tunnel
```

**C'est tout !** Le tunnel démarre automatiquement.

### URL du scanner

```
https://rdv.upgradedbikes.com/admin/catalog
```

---

## 📱 Utilisation sur Smartphone

### 1. Sauvegarder le lien

**URL directe du scanner** :
```
https://rdv.upgradedbikes.com/admin/catalog
```

Sur votre smartphone :
1. Ouvrir cette URL dans le navigateur
2. Se connecter à l'application
3. Ajouter à l'écran d'accueil (iOS) ou Favoris (Android)

### 2. Scanner un produit

1. Ouvrir le raccourci
2. Aller dans **Admin > Catalogue**
3. Cliquer sur **"Scanner"** (bouton violet)
4. Autoriser l'accès à la caméra (première fois)
5. Scanner le code-barres
6. Vérifier les infos pré-remplies
7. Compléter les prix
8. Enregistrer

---

## 🎯 Workflow Complet

```
1. Sur PC :
   npm run dev:tunnel
   
2. Sur smartphone :
   Ouvrir https://rdv.upgradedbikes.com/admin/catalog
   Se connecter
   Cliquer "Scanner"
   
3. Scanner les produits
   
4. Quand terminé :
   Fermer le terminal (Ctrl+C)
```

---

## 🔒 Sécurité

### L'URL est-elle sécurisée ?

✅ **Oui** :
- HTTPS automatique (chiffrement)
- Authentification requise (login/password)
- Tunnel Cloudflare sécurisé

### Qui peut accéder ?

- ✅ Uniquement les utilisateurs avec compte
- ❌ Personne sans authentification
- ✅ URL publique mais page protégée

---

## 🐛 Dépannage

### La caméra ne s'ouvre pas

- ✅ Vérifier que l'URL est bien `https://rdv.upgradedbikes.com`
- ✅ Autoriser la caméra dans les paramètres du navigateur
- ✅ Utiliser Chrome ou Safari (meilleure compatibilité)

### L'URL ne fonctionne pas

- ✅ Vérifier que `npm run dev:tunnel` est lancé
- ✅ Attendre 10 secondes que le tunnel démarre
- ✅ Vérifier la connexion internet

### Erreur de connexion

- ✅ Vérifier que l'app est démarrée (`npm run dev:tunnel`)
- ✅ Vérifier que le tunnel est actif (logs dans le terminal)

---

## 📋 Checklist Rapide

**Avant de scanner** :
- [ ] App démarrée (`npm run dev:tunnel`)
- [ ] Attendre 10 secondes (tunnel démarre)
- [ ] Ouvrir sur smartphone
- [ ] Se connecter
- [ ] Caméra autorisée

**Pour scanner** :
- [ ] Ouvrir Admin > Catalogue
- [ ] Cliquer "Scanner"
- [ ] Scanner le code-barres
- [ ] Vérifier les infos
- [ ] Ajouter les prix
- [ ] Enregistrer

---

**📱 Bon scan ! 🚴‍♂️**
