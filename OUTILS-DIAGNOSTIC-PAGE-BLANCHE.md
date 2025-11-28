# 🔧 Outils de Diagnostic - Page Blanche

**Date**: 27 novembre 2024  
**Problème**: Application démarre mais affiche une page blanche après modifications récentes (icône personnalisée, correction déconnexion)

---

## ✅ Outils de Diagnostic Ajoutés

### 1. **DevTools Activés en Production (Temporaire)**
- **Fichier**: `electron/windows/mainWindow.js`
- **Lignes**: 70-75
- **Fonctionnalité**: DevTools s'ouvrent automatiquement après chargement de la page en production
- **Note**: ⚠️ À désactiver après résolution du problème

### 2. **Gestion d'Erreurs JavaScript Côté Electron**
- **Fichier**: `electron/windows/mainWindow.js`
- **Lignes**: 48-70
- **Fonctionnalités**:
  - Capture des erreurs de chargement (`did-fail-load`)
  - Capture des messages console (warn/error)
  - Détection de page non responsive
  - Détection de crash de page
- **Logs**: Toutes les erreurs sont loggées dans `production.log`

### 3. **ErrorBoundary React**
- **Fichier**: `src/components/ErrorBoundary.tsx`
- **Intégration**: `src/app/providers.tsx`
- **Fonctionnalités**:
  - Capture des erreurs React non gérées
  - Affichage d'une interface utilisateur avec détails de l'erreur
  - Boutons pour réessayer, recharger ou accéder à la page de diagnostic
  - Envoi automatique des erreurs au serveur (si route `/api/diagnostics/error` existe)

### 4. **Page de Diagnostic**
- **URL**: `/diagnostic`
- **Fichier**: `src/app/diagnostic/page.tsx`
- **Fonctionnalités**:
  - Collecte automatique des informations système
  - Affichage du contenu de localStorage et sessionStorage
  - Liste des erreurs JavaScript capturées
  - Liste des avertissements
  - Liste des erreurs réseau
  - Bouton pour copier toutes les informations dans le presse-papier

### 5. **Script de Diagnostic Global**
- **Fichier**: `src/app/layout.tsx`
- **Lignes**: 73-103
- **Fonctionnalités**:
  - Capture des erreurs JavaScript au démarrage
  - Capture des promesses rejetées
  - Log du contenu de localStorage au chargement
  - Vérification de la présence de React après 1 seconde

### 6. **Logout Forcé Désactivé**
- **Fichier**: `electron/windows/mainWindow.js`
- **Lignes**: 38-46 (commenté)
- **Raison**: Le logout forcé au démarrage pourrait causer des problèmes de redirection et page blanche
- **Note**: ⚠️ À réactiver après résolution si nécessaire

---

## 🔍 Comment Utiliser les Outils de Diagnostic

### Étape 1: Lancer l'Application
1. Lancer l'application normalement
2. Les DevTools devraient s'ouvrir automatiquement
3. Vérifier la console pour les erreurs JavaScript

### Étape 2: Vérifier les Logs
1. Ouvrir: `C:\Users\j_ley\AppData\Roaming\Atelier Velo+\logs\production.log`
2. Chercher les lignes avec `[WINDOW]`, `[RENDERER]`, `[DIAGNOSTIC]`
3. Noter toutes les erreurs

### Étape 3: Accéder à la Page de Diagnostic
1. Si l'application charge (même page blanche), naviguer vers: `http://localhost:3000/diagnostic`
2. Ou utiliser le raccourci clavier dans DevTools: `Ctrl+Shift+I` puis naviguer
3. Copier toutes les informations affichées

### Étape 4: Vérifier la Console DevTools
1. Onglet **Console**: Vérifier les erreurs JavaScript
2. Onglet **Network**: Vérifier les requêtes qui échouent
3. Onglet **Sources**: Vérifier les erreurs de chargement de fichiers

---

## 🐛 Problèmes Potentiels Identifiés

### 1. **Logout Forcé au Démarrage**
- **Problème**: Le code forçait un logout au démarrage, vidant localStorage
- **Impact**: Peut causer des boucles de redirection
- **Solution**: Désactivé temporairement

### 2. **RequireAuth avec Validation Token**
- **Fichier**: `src/app/components/RequireAuth.tsx`
- **Problème potentiel**: Validation du token côté serveur peut échouer
- **Impact**: Redirection vers login même si token valide
- **Solution**: Vérifier les logs de `/api/auth/verify`

### 3. **Erreurs JavaScript Non Capturées**
- **Problème**: Erreurs JavaScript peuvent causer page blanche sans message
- **Solution**: ErrorBoundary + script de diagnostic global ajoutés

---

## 📋 Checklist de Diagnostic

- [ ] DevTools ouverts automatiquement
- [ ] Console DevTools affiche des erreurs
- [ ] Page de diagnostic accessible (`/diagnostic`)
- [ ] Logs `production.log` contiennent des erreurs
- [ ] ErrorBoundary affiche une erreur (si erreur React)
- [ ] localStorage contient `jwt_token` et `user`
- [ ] Requêtes réseau réussissent (onglet Network)

---

## 🔧 Corrections à Appliquer Après Diagnostic

### Si Erreur JavaScript Identifiée:
1. Noter le message d'erreur exact
2. Noter le fichier et la ligne
3. Corriger l'erreur dans le code source
4. Rebuild l'application

### Si Problème d'Authentification:
1. Vérifier que `/api/auth/verify` fonctionne
2. Vérifier que le token JWT est valide
3. Vérifier que `RequireAuth` ne cause pas de boucle

### Si Problème de Chargement:
1. Vérifier que le serveur Next.js démarre correctement
2. Vérifier les logs `next-server.log`
3. Vérifier que le port 3000 est disponible

---

## 🚨 Actions Immédiates

1. **Lancer l'application** et noter ce qui apparaît dans DevTools
2. **Accéder à `/diagnostic`** et copier toutes les informations
3. **Vérifier les logs** dans `C:\Users\j_ley\AppData\Roaming\Atelier Velo+\logs\`
4. **Partager les résultats** pour analyse approfondie

---

## 📝 Notes Importantes

- ⚠️ **DevTools en production**: À désactiver après résolution
- ⚠️ **Logout forcé désactivé**: À réactiver si nécessaire après résolution
- ✅ **ErrorBoundary**: Reste actif en production (bonne pratique)
- ✅ **Page de diagnostic**: Peut rester active pour debug futur

---

## 🔗 Fichiers Modifiés

1. `electron/windows/mainWindow.js` - DevTools + gestion erreurs
2. `src/app/layout.tsx` - Script diagnostic global
3. `src/app/providers.tsx` - ErrorBoundary intégré
4. `src/components/ErrorBoundary.tsx` - Nouveau composant
5. `src/app/diagnostic/page.tsx` - Nouvelle page

---

**Prochaines étapes**: Lancer l'application, collecter les informations de diagnostic, et analyser les erreurs identifiées.

