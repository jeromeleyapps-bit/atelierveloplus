# 🚴 Guide d'Utilisation - Atelier Vélo+

## 🚀 Démarrage Rapide

### Option 1 : Double-clic (Recommandé)
1. Double-cliquez sur `LANCER_ATELIER_VELO.bat`
2. Attendez que l'application démarre (30-60 secondes)
3. Ouvrez votre navigateur sur http://localhost:3000

### Option 2 : PowerShell
1. Ouvrez PowerShell dans le dossier du projet
2. Exécutez : `.\start-atelier-velo.ps1`

### Option 3 : Manuel
```bash
cd apps/web
npm run dev
```

---

## 📱 Accès à l'Application

- **Page d'accueil** : http://localhost:3000
- **Dashboard** : http://localhost:3000/dashboard
- **Connexion** : http://localhost:3000/auth/login

---

## 🔐 Connexion

### Compte par défaut
- **Email** : admin@atelier-velo.fr
- **Mot de passe** : (à créer lors de la première utilisation)

---

## 🛠️ Fonctionnalités Principales

### 1. **Dashboard**
- Vue d'ensemble de l'activité
- Statistiques en temps réel
- Tickets en cours
- Chiffre d'affaires

### 2. **Clients**
- Liste des clients
- Fiche client détaillée
- Historique des interventions
- Vélos enregistrés

### 3. **Tickets (Interventions)**
- Créer un ticket
- Suivi des réparations
- Statuts : Créé → En cours → Terminé → Facturé
- Pièces et main d'œuvre

### 4. **Catalogue**
- Gestion des pièces
- Stock
- Prix
- Fournisseurs

### 5. **Factures**
- Génération automatique
- Édition PDF
- Envoi par email
- Suivi des paiements

### 6. **Calendrier**
- Prise de rendez-vous
- Planning atelier
- Disponibilités

---

## ⚙️ Paramètres

### Mode Sombre 🌙
Cliquez sur l'icône lune/soleil en haut à droite pour basculer entre mode clair et sombre.

### Paramètres Atelier
`Menu → Paramètres`
- Nom de l'atelier
- Coordonnées
- Tarifs horaires
- TVA

---

## 🔧 Maintenance

### Sauvegarder la Base de Données
```bash
pg_dump -U postgres atelier_velo > backup_$(date +%Y%m%d).sql
```

### Restaurer la Base de Données
```bash
psql -U postgres atelier_velo < backup_20250106.sql
```

### Mettre à Jour l'Application
```bash
git pull
cd apps/web
pnpm install
npm run dev
```

---

## 🆘 Problèmes Courants

### L'application ne démarre pas
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez que le port 3000 est libre
3. Vérifiez le fichier `.env.local`

### Erreur de connexion database
1. Vérifiez le mot de passe dans `.env.local`
2. Testez la connexion : `psql -U postgres -d atelier_velo`

### Port 3000 déjà utilisé
Changez le port dans `package.json` :
```json
"dev": "next dev -p 3001"
```

---

## 📞 Support

### Logs
Les logs sont dans la console PowerShell où l'application tourne.

### Base de données
- **Serveur** : localhost:5432
- **Database** : atelier_velo
- **User** : postgres
- **Password** : SoleaCharline20072011

---

## 🔄 Workflow Quotidien

### Matin
1. Double-clic sur `LANCER_ATELIER_VELO.bat`
2. Ouvrir http://localhost:3000/dashboard
3. Consulter les tickets du jour

### Pendant la journée
- Créer des tickets pour les nouvelles interventions
- Mettre à jour les statuts
- Enregistrer les pièces utilisées

### Soir
1. Générer les factures
2. Fermer le navigateur
3. Appuyer sur Ctrl+C dans PowerShell pour arrêter

---

## 📊 Raccourcis Clavier

- `Ctrl + K` : Recherche rapide
- `Ctrl + N` : Nouveau ticket
- `Ctrl + ,` : Paramètres

---

## 🎨 Personnalisation

### Logo
Remplacez `apps/web/public/logo.png` par votre logo (28x28px)

### Couleurs
Modifiez `apps/web/src/theme/theme.ts`

---

**Version** : 1.0.0  
**Dernière mise à jour** : 06/10/2025
