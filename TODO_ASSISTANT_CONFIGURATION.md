# 📝 TODO : Développement Assistant de Configuration

## ✅ Validation Obtenue
Date : 13 janvier 2025, 00:33  
Développement validé par l'utilisateur pour mise en œuvre future.

---

## 🎯 Objectif Global

Créer un **assistant de configuration interactif** qui guide l'utilisateur lors du premier lancement de l'application, éliminant le besoin de modifier manuellement des fichiers `.env` ou de créer des comptes sur des services externes.

---

## 📋 Spécifications Complètes

Voir le document détaillé : `ASSISTANT_CONFIGURATION_TECHNIQUE.md`

---

## ✅ Checklist de Développement

### Phase 1 : Core Assistant (2-3 jours) - PRIORITAIRE
- [ ] **Détection du premier lancement**
  - [ ] Créer système de flag `first-launch.json`
  - [ ] Modifier `apps/desktop/main.js` pour détecter le premier lancement
  - [ ] Rediriger vers `/setup/welcome` si premier lancement

- [ ] **Pages Setup Frontend**
  - [ ] Créer dossier `apps/web/src/app/setup/`
  - [ ] Page `setup/welcome/page.tsx` (écran de bienvenue)
  - [ ] Page `setup/secrets/page.tsx` (génération auto des clés)
  - [ ] Page `setup/shop-info/page.tsx` (formulaire infos atelier)
  - [ ] Page `setup/admin-account/page.tsx` (création compte admin)
  - [ ] Page `setup/complete/page.tsx` (finalisation)
  - [ ] Composant `SetupStepper` (barre de progression)
  - [ ] Composant `SetupLayout` (layout commun)

- [ ] **API Setup Backend**
  - [ ] Créer `apps/web/src/app/api/setup/route.ts`
  - [ ] Action `generate-secrets` : Génération `NEXTAUTH_SECRET` + `AUTH_SECRET`
  - [ ] Action `save-shop-info` : Écriture dans `.env`
  - [ ] Action `complete-setup` : Marquage fin configuration
  - [ ] Sécurisation endpoint (accessible uniquement avant premier compte)

- [ ] **Hook React**
  - [ ] Créer `apps/web/src/hooks/useSetup.ts`
  - [ ] Fonction `generateSecrets()`
  - [ ] Fonction `saveShopInfo(shopData)`
  - [ ] Gestion loading/error states

- [ ] **Validation Formulaires**
  - [ ] Validation SIRET (14 chiffres)
  - [ ] Validation TVA (format FRXX...)
  - [ ] Validation email (format)
  - [ ] Validation téléphone (0X XX XX XX XX)
  - [ ] Validation code postal (5 chiffres)

### Phase 2 : Configuration Email (1 jour) - OPTIONNEL
- [ ] **Page setup/email**
  - [ ] Interface choix Resend / SMTP / Skip
  - [ ] Formulaire Resend (clé API)
  - [ ] Formulaire SMTP (serveur, port, user, pass)
  - [ ] Bouton "Tester la connexion"
  - [ ] Affichage résultat test (✅/❌)

- [ ] **API Email**
  - [ ] Action `test-email` dans API setup
  - [ ] Intégration Resend API
  - [ ] Intégration Nodemailer pour SMTP
  - [ ] Envoi email de test

### Phase 3 : Configuration Internet (1 jour) - OPTIONNEL
- [ ] **Page setup/internet**
  - [ ] Interface choix Local / Internet
  - [ ] Tutoriel interactif Cloudflare (étapes guidées)
  - [ ] Liens directs vers Cloudflare signup/download
  - [ ] Champ Tunnel ID
  - [ ] Validation et sauvegarde

- [ ] **API Internet**
  - [ ] Écriture `START_TUNNEL=1` dans `.env`
  - [ ] Instructions config DNS

### Phase 4 : Node.js Embarqué (1 jour) - AMÉLIORATION
- [ ] **Téléchargement Node.js Portable**
  - [ ] Script de téléchargement Node.js v20.18.0 portable
  - [ ] Extraction dans dossier `resources/nodejs`

- [ ] **Intégration Electron Builder**
  - [ ] Modifier `apps/desktop/package.json` (extraResources)
  - [ ] Copier Node.js dans le build

- [ ] **Modification main.js**
  - [ ] Changer `nodePath` vers Node.js embarqué
  - [ ] `path.join(process.resourcesPath, 'nodejs', 'node.exe')`
  - [ ] Fallback vers Node.js système si absent

- [ ] **Tests**
  - [ ] Tester sur machine sans Node.js installé
  - [ ] Vérifier taille de l'installateur
  - [ ] Vérifier performances

### Phase 5 : Tests et Documentation (1 jour) - FINAL
- [ ] **Tests End-to-End**
  - [ ] Test flux complet sur machine vierge
  - [ ] Test skip email
  - [ ] Test skip internet
  - [ ] Test réouverture assistant
  - [ ] Test avec `.env` existant

- [ ] **Documentation**
  - [ ] Mettre à jour `GUIDE_INSTALLATION_UTILISATEUR.md`
  - [ ] Réduire guide à 1 page A4
  - [ ] Créer vidéo de démonstration (2-3 min)
  - [ ] Screenshots de chaque étape

- [ ] **Guide Développeur**
  - [ ] Documenter architecture assistant
  - [ ] Documenter API routes
  - [ ] Documenter composants React

---

## 🎨 Design Guidelines

### Palette de Couleurs
- **Primaire** : Bleu #1976d2
- **Secondaire** : Orange #ff9800
- **Succès** : Vert #4caf50
- **Erreur** : Rouge #f44336

### Composants Material-UI
- `Stepper` pour progression
- `TextField` pour formulaires
- `Button` pour actions
- `Alert` pour messages
- `CircularProgress` pour loading

### Layout
- Largeur maximale : 800px
- Padding : 24px
- Responsive mobile

---

## 📦 Fichiers à Créer

### Frontend
```
apps/web/src/
├── app/
│   └── setup/
│       ├── layout.tsx (Layout commun)
│       ├── welcome/page.tsx
│       ├── secrets/page.tsx
│       ├── shop-info/page.tsx
│       ├── admin-account/page.tsx
│       ├── email/page.tsx
│       ├── internet/page.tsx
│       └── complete/page.tsx
├── components/
│   └── setup/
│       ├── SetupStepper.tsx
│       ├── ShopInfoForm.tsx
│       └── EmailConfigForm.tsx
└── hooks/
    └── useSetup.ts
```

### Backend
```
apps/web/src/
└── app/
    └── api/
        └── setup/
            └── route.ts
```

### Electron
```
apps/desktop/
├── main.js (modifications)
└── resources/
    └── nodejs/ (Node.js portable, à ajouter)
```

---

## 🔧 Commandes Utiles

### Développement
```powershell
# Lancer Next.js en mode dev
cd apps\web
pnpm dev

# Lancer Electron en mode dev
cd apps\desktop
npm run electron:dev
```

### Test de l'Assistant
```powershell
# Supprimer le flag pour retester
Remove-Item "$env:APPDATA\atelier-velo-desktop\first-launch.json"

# Relancer l'app
cd apps\desktop
npm start
```

### Build
```powershell
# Build complet
.\build-app.ps1
```

---

## 📊 Estimation Temps Total

| Phase | Durée | Priorité |
|-------|-------|----------|
| Phase 1 : Core Assistant | 2-3 jours | ⭐⭐⭐ Critique |
| Phase 2 : Email | 1 jour | ⭐⭐ Important |
| Phase 3 : Internet | 1 jour | ⭐ Optionnel |
| Phase 4 : Node.js Embarqué | 1 jour | ⭐⭐ Important |
| Phase 5 : Tests & Doc | 1 jour | ⭐⭐⭐ Critique |
| **TOTAL** | **6-7 jours** | |

---

## 🚀 Bénéfices Attendus

### Pour l'Utilisateur Final
- ✅ Installation en **5 minutes** au lieu de 30-60 minutes
- ✅ **Zéro manipulation** de fichiers texte
- ✅ **Zéro ligne de commande** PowerShell
- ✅ Interface graphique intuitive
- ✅ Validation en temps réel
- ✅ Moins d'erreurs de configuration

### Pour le Support/Maintenance
- ✅ Réduction drastique des demandes de support
- ✅ Configuration standardisée
- ✅ Logs de configuration
- ✅ Diagnostic automatique
- ✅ Possibilité de réexécuter l'assistant

### Pour le Produit
- ✅ Expérience utilisateur professionnelle
- ✅ Différenciation concurrentielle
- ✅ Facilite l'adoption
- ✅ Réduit la barrière à l'entrée
- ✅ Image moderne et soignée

---

## 📝 Notes Importantes

### Prérequis Avant Développement
1. ✅ Application Electron fonctionnelle (en cours de résolution)
2. ✅ Build stable et reproductible
3. ✅ Tests de base fonctionnels

### Ordre de Développement Recommandé
1. **D'abord** : Finaliser app fonctionnelle (build stable)
2. **Ensuite** : Phase 1 (Core Assistant)
3. **Puis** : Phase 4 (Node.js embarqué)
4. **Ensuite** : Phase 2 et 3 (Email/Internet optionnels)
5. **Enfin** : Phase 5 (Tests & Documentation)

### Décisions Techniques à Prendre
- [ ] Utiliser React Hook Form ou formulaires manuels ?
- [ ] Stocker config dans .env ou dans DB SQLite ?
- [ ] Permettre modification config après setup (menu Paramètres) ?
- [ ] Intégrer analytics pour tracking succès setup ?

---

## 📞 Contact et Suivi

**Développeur** : Cascade AI  
**Date de Validation** : 13 janvier 2025  
**Priorité** : Moyenne (après stabilisation app)  
**Statut** : ⏸️ En attente - App fonctionnelle en cours

---

## 🔄 Prochaines Étapes Immédiates

**Avant de commencer le développement de l'assistant** :
1. ✅ Résoudre problème page blanche (exe dist)
2. ✅ Valider que unpacked fonctionne parfaitement
3. ✅ Tester sur machine propre (sans environnement dev)
4. ✅ Vérifier logs et stabilité
5. ✅ Documenter procédure de build stable

**Une fois l'app stable** :
1. Créer une branche Git : `feature/setup-assistant`
2. Commencer Phase 1 : Détection premier lancement
3. Créer structure de dossiers frontend
4. Implémenter première page (Welcome)

---

**Ce fichier sera mis à jour au fur et à mesure du développement.**
