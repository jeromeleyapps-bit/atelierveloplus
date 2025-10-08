# 📱 Scanner de Code-Barres - Guide Complet

## 🎯 Qu'est-ce que c'est ?

Un scanner de code-barres EAN intégré à l'application qui permet d'ajouter rapidement des articles au catalogue en scannant leur code-barres avec un smartphone.

**Avantages** :
- ⚡ **Rapide** : 30 sec vs 2 min par article
- ✅ **Automatique** : Récupère nom et marque depuis des bases publiques
- 📱 **Mobile** : Fonctionne sur smartphone
- 💰 **Gratuit** : Utilise des APIs publiques

---

## 🚀 Installation

### 1. Installer la dépendance

```powershell
cd apps/web
npm install @zxing/browser@^0.1.5
```

### 2. Vérifier

```powershell
npm list @zxing/browser
# Doit afficher : @zxing/browser@0.1.5
```

### 3. Démarrer l'application

```powershell
npm run dev
```

---

## 📱 Utilisation sur Smartphone

### Démarrer l'application

```powershell
npm run dev:tunnel
```

Le tunnel Cloudflare démarre automatiquement avec l'application.

### URL du scanner

**URL complète à utiliser** :
```
https://rdv.upgradedbikes.com/admin/catalog
```

⚠️ **Attention** : N'utilisez PAS juste `https://rdv.upgradedbikes.com` (redirige vers la page RDV clients).  
Utilisez toujours l'URL complète avec `/admin/catalog`.

💡 **Astuce** : Sauvegardez cette URL complète dans vos favoris smartphone ou sur l'écran d'accueil.

### Scanner un produit

1. **Se connecter** à l'application
2. **Aller dans** Admin > Catalogue
3. **Cliquer** sur le bouton "Scanner" (violet)
4. **Autoriser** l'accès à la caméra (première fois)
5. **Scanner** le code-barres du produit
6. **Vérifier** les informations pré-remplies
7. **Compléter** les prix (HT et TTC)
8. **Enregistrer**

---

## 💡 Comment ça marche

```
1. Scanner le code-barres
   ↓
2. Recherche automatique (en cascade) :
   
   Étape 1 - Bases publiques (rapide) :
   • Open Food Facts (produits alimentaires)
   • Open Product Data (base générale)
   • UPC Item DB (base internationale)
   
   Étape 2 - Confirmation utilisateur (si non trouvé) :
   "Voulez-vous chercher sur les sites spécialisés vélo ?"
   
   Étape 3 - Sites vélo spécialisés (si accepté) :
   • Alltricks
   • Probikeshop
   • Bike24
   • Decathlon
   ↓
3. Formulaire pré-rempli avec :
   • SKU = Code-barres
   • Nom = Nom du produit trouvé
   • Marque = Marque trouvée (si disponible)
   ↓
4. Vous complétez :
   • Prix HT et TTC
   • Catégorie (ajuster si nécessaire)
   ↓
5. Article ajouté au catalogue
```

---

## 🧪 Codes-Barres de Test

Pour tester sans produits vélo :

| Code-barres | Produit | Base de données |
|-------------|---------|-----------------|
| `3017620422003` | Nutella | Open Food Facts |
| `5449000000996` | Coca-Cola | Bases publiques |
| `9002490100070` | Red Bull | Bases publiques |

Puis testez avec vos produits vélo (huiles, casques, lumières, etc.)

---

## ✅ Bonnes Pratiques

### À faire
- ✅ **Vérifier le nom** - Peut être en anglais, franciser si nécessaire
- ✅ **Ajuster la catégorie** - La catégorie devinée peut être incorrecte
- ✅ **Compléter les prix** - Jamais récupérés automatiquement
- ✅ **Bon éclairage** - Crucial pour la détection du code-barres

### À éviter
- ❌ **Ne pas scanner en HTTP** - La caméra ne fonctionnera pas
- ❌ **Ne pas accepter sans vérifier** - Toujours vérifier les données
- ❌ **Ne pas oublier les prix** - Le formulaire ne les pré-remplit jamais

---

## 🔧 Dépannage

### La caméra ne s'ouvre pas

**Cause** : Pas en HTTPS
- ✅ **Solution** : Vérifier que l'URL est bien `https://rdv.upgradedbikes.com`
- ✅ Lancer avec `npm run dev:tunnel` (pas `npm run dev`)

**Cause** : Permissions refusées
- ✅ **Solution** : Autoriser la caméra dans les paramètres du navigateur
  - iOS : Réglages > Safari > Caméra
  - Android : Paramètres > Apps > Chrome > Autorisations

### Le code-barres n'est pas détecté

- ✅ Améliorer l'éclairage
- ✅ Tenir le téléphone stable à 15-20cm
- ✅ Nettoyer l'objectif de la caméra
- ✅ Utiliser la saisie manuelle (bouton dans le scanner)

### Le produit n'est jamais trouvé

**C'est normal** pour :
- Pièces vélo spécialisées (non référencées dans les bases publiques)
- Produits très récents
- Codes-barres internes magasin

**Solution** : Le code-barres est quand même utilisé comme SKU, vous devez saisir le nom manuellement.

### Erreur npm install

```powershell
npm cache clean --force
npm install @zxing/browser@^0.1.5
```

---

## 📊 Produits Adaptés

### ✅ Bien adaptés au scan
- Huiles de chaîne de marque (Finish Line, Muc-Off)
- Casques emballés (Giro, Bell, Specialized)
- Lumières vélo de marque (Lezyne, Knog)
- Produits d'entretien emballés
- Accessoires de grandes marques

### ⚠️ Moins adaptés
- Pièces en vrac sans emballage
- Chambres à air sans emballage
- Pneus (rarement un EAN standard)
- Câbles et gaines au mètre
- Services (main d'œuvre)

→ Pour ces produits, utilisez le bouton "Nouvel article" classique

---

## 🔒 Sécurité et Confidentialité
### Données collectées
- ❌ **Aucune donnée personnelle** collectée
- ❌ **Aucune image** stockée
- ✅ Seul le **code-barres** est envoyé aux APIs publiques

### Sources de données

**APIs publiques** (rapide) :
- **Open Food Facts** - Gratuit, illimité
- **Open Product Data** - Gratuit, illimité
- **UPC Item DB** - Gratuit (100 requêtes/jour)

**Sites vélo spécialisés** (fallback, plus lent) :
- **Alltricks** - Recherche si non trouvé dans les APIs
- **Probikeshop** - Recherche si non trouvé dans les APIs
- **Bike24** - Recherche si non trouvé dans les APIs
- **Decathlon** - Recherche si non trouvé dans les APIs

💡 **Note** : Les sites vélo sont interrogés uniquement si :
1. Le produit n'est pas trouvé dans les bases publiques
2. L'utilisateur accepte la recherche étendue (confirmation demandée)

✅ **Protection contre les abus** : La recherche sur les sites spécialisés nécessite une confirmation explicite de l'utilisateur à chaque fois.

### Accès
- 🔒 **Authentification requise** - Seuls les utilisateurs connectés peuvent scanner
- 🔒 **HTTPS obligatoire** - Pour accès caméra sur smartphone
- 🔒 **Tunnel sécurisé** - Via Cloudflare (chiffrement automatique)

## 📋 Checklist Rapide

### Installation (une fois)
- [ ] Installer `@zxing/browser`
- [ ] Installer `cloudflared`
- [ ] Tester en local

### Avant chaque session de scan
- [ ] Démarrer l'app (`npm run dev:tunnel`)
- [ ] Récupérer l'URL HTTPS
- [ ] Ouvrir sur smartphone
- [ ] Se connecter

### Pour chaque produit
- [ ] Scanner le code-barres
- [ ] Vérifier le nom
- [ ] Ajuster la catégorie
- [ ] Ajouter les prix
- [ ] Enregistrer

---

## 🎓 Workflow Exemple

### Inventaire de 20 produits

**Préparation** (5 min) :
1. Démarrer app et tunnel
2. Ouvrir sur smartphone
3. Se connecter
4. Préparer les produits à scanner

**Scan** (15-30 min) :
1. Pour chaque produit :
   - Scanner le code-barres
   - Si trouvé : vérifier et ajouter prix (~30 sec)
   - Si non trouvé : saisir manuellement (~1-2 min)
   - Enregistrer

**Vérification** (5 min) :
1. Revoir le catalogue
2. Vérifier les catégories
3. Uniformiser les noms si nécessaire

**Total** : ~25-40 minutes pour 20 produits

---

## 🔮 Limitations Connues

1. **HTTPS requis** - Caméra ne fonctionne qu'en HTTPS (ou localhost)
2. **Couverture limitée** - Produits vélo spécialisés rarement trouvés (~30% de succès)
3. **Pas de prix** - APIs publiques ne fournissent jamais de prix
4. **Qualité variable** - Noms parfois en anglais ou incomplets
5. **Rate limits** - UPC Item DB limité à 100 requêtes/jour (mode gratuit)

---

## 📖 Documentation Technique

### Fichiers créés

**Code source** :
- `src/app/api/catalog/barcode/route.ts` - API de lookup
- `src/app/components/BarcodeScanner.tsx` - Composant de scan
- `src/app/admin/catalog/page.tsx` - Intégration (modifié)

**Tests** :
- `tests/api/catalog.barcode.test.ts` - Tests unitaires

**Scripts** :
- `install-barcode-scanner.ps1` - Installation automatique

### Technologies
- `@zxing/browser` ^0.1.5 - Scan de code-barres
- Next.js API Routes - Backend
- React + Material-UI - Frontend
- Cloudflare Tunnel - Accès HTTPS mobile

---

## 💬 Support

### Problème d'installation
→ Voir section **Installation** ci-dessus

### Problème d'utilisation
→ Voir section **Dépannage** ci-dessus

### Accès mobile
→ Voir `SCANNER_ACCES_MOBILE.md`

### Configuration tunnel avancée
→ Voir `CLOUDFLARE_TUNNEL_GUIDE.md`

---

**Version** : 1.0.0  
**Date** : 2025-10-08  

**📱 Bon scan ! 🚴‍♂️**
