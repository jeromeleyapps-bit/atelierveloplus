# Corrections - 25 novembre 2024

## 🎯 Problèmes à Corriger

### 1. Icône Application
**Problème** : L'icône de l'application n'est pas celle du raccourci (reste l'icône par défaut d'Electron)
**Fichier icône** : `C:\Users\j_ley\Atelier-velo+\resources\icon.ico`
**Solution** : Copier l'icône dans `c:\atelier\resources\icon.ico` et vérifier la config

### 2. Déconnexion Page Communications
**Problème** : Lors de l'accès à `/communications` depuis les paramètres admin, l'utilisateur est déconnecté
**Solution** : Vérifier le middleware et la gestion d'authentification

### 3. Configuration RDV Clients
**Problème** : Informations individuelles hard-codées dans la page RDV
**Éléments à configurer** :
- Jours d'ouverture
- Horaires
- Option "un jour sur RDV uniquement avec numéro de téléphone" (PRO uniquement)
- Numéro de téléphone récupéré depuis les informations du compte

---

## ✅ Corrections Appliquées

### 1. Icône Application ✅
- [x] Copier l'icône depuis `C:\Users\j_ley\Atelier-velo+\resources\icon.ico` vers `c:\atelier\resources\icon.ico`
- [x] Vérifier que `electron-builder.config.yml` pointe vers `resources/icon.ico`

### 2. Déconnexion Page Communications 🔄
- [ ] Analyser le middleware pour `/communications`
- [ ] Vérifier la gestion d'authentification dans `RequireAuth`
- [ ] Corriger la redirection ou la vérification de session

### 3. Configuration RDV Clients 🔄
- [ ] Créer un modèle Prisma pour la configuration RDV
- [ ] Créer une API pour gérer la configuration
- [ ] Créer une page admin pour configurer les RDV
- [ ] Modifier `src/app/rdv/page.tsx` et `src/app/booking-local/page.tsx` pour utiliser la config
- [ ] Ajouter la vérification de licence PRO pour l'option "un jour sur RDV uniquement"

---

## 📋 Fichiers à Modifier

1. `electron-builder.config.yml` - Vérifier icône
2. `src/middleware.ts` - Corriger authentification `/communications`
3. `prisma/schema.prisma` - Ajouter modèle `AppointmentConfig`
4. `src/app/api/admin/appointment-config/route.ts` - API configuration RDV
5. `src/app/admin/appointment-config/page.tsx` - Page admin configuration
6. `src/app/rdv/page.tsx` - Utiliser config au lieu de hard-coded
7. `src/app/booking-local/page.tsx` - Utiliser config au lieu de hard-coded

---

**Date** : 25 novembre 2024  
**Statut** : En cours

