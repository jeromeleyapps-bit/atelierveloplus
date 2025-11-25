# Analyse des TODOs/FIXMEs - 25 novembre 2024

## 📊 Vue d'ensemble
- **Total** : 11 TODOs identifiés
- **Fichiers concernés** : 8 fichiers
- **Catégories** : Fonctionnalités futures, Optimisations, Améliorations techniques

---

## 🔍 Analyse par TODO

### 1. ⚠️ PRIORITÉ MOYENNE - Lookup EAN externe
**Fichier** : `src/app/api/catalog/scan/route.ts` (2 occurrences)
**Lignes** : 73, 139

**Description** :
```typescript
// TODO: Implémenter lookup EAN via API externe
// TODO: Implémenter avec une API comme Open Food Facts, UPC Database
```

**Impact** : 🟡 MOYEN
- Améliore l'expérience utilisateur lors du scan de produits
- Permet d'obtenir automatiquement les infos produit (nom, marque)

**Complexité** : 🟡 MOYENNE (2-3h)
- Intégration API externe (Open Food Facts ou UPC Database)
- Gestion des erreurs et timeouts
- Cache des résultats

**Recommandation** : 📋 Phase 2 - Sprint 2.2 (Fonctionnalités avancées)

---

### 2. 🟢 PRIORITÉ BASSE - Calcul taille DB réelle
**Fichier** : `src/app/api/admin/stats/route.ts`
**Ligne** : 49

**Description** :
```typescript
const dbSize = "45.2 MB"; // TODO: Implémenter calcul réel avec raw SQL
```

**Impact** : 🟢 FAIBLE
- Valeur hardcodée actuellement
- Affichage admin uniquement (pas d'impact fonctionnel)

**Complexité** : 🟢 FACILE (30min)
- Requête SQL brute Prisma : `PRAGMA page_count * PRAGMA page_size`

**Recommandation** : ✅ À traiter maintenant (quick win)

---

### 3. 🟡 PRIORITÉ MOYENNE - Support attachments emails
**Fichier** : `src/app/api/finance/invoices/[id]/email/route.ts`
**Ligne** : 161

**Description** :
```typescript
// TODO: Ajouter support attachments dans mailer.ts
```

**Impact** : 🟡 MOYEN
- Actuellement contournement pour envoyer PDF factures
- Améliorerait l'architecture

**Complexité** : 🟡 MOYENNE (1-2h)
- Modifier `mailer.ts` pour supporter attachments
- Tester avec différents clients email

**Recommandation** : 📋 Phase 2 - Sprint 2.1 (Refactoring technique)

---

### 4. 🟢 PRIORITÉ BASSE - Filtres vélos
**Fichier** : `src/components/catalog/BikesTab.tsx` (2 occurrences)
**Lignes** : 139, 264

**Description** :
```typescript
// TODO: Ouvrir drawer filtres
// TODO: Autres dialogs (Edit, Details, Delete)
```

**Impact** : 🟢 FAIBLE
- Fonctionnalité UX avancée
- Workaround existant (toast info)

**Complexité** : 🟡 MOYENNE (2-3h)
- Créer composant FilterDrawer
- Implémenter logique filtrage

**Recommandation** : 📋 Phase 2 - Sprint 2.3 (UX améliorations)

---

### 5. 🟢 PRIORITÉ BASSE - OAuth Strava
**Fichier** : `src/app/admin/page.tsx` (2 occurrences)
**Lignes** : 115, 524

**Description** :
```typescript
// TODO: Implémenter OAuth Strava
// TODO: Implémenter avec vraies données depuis ActivityLog
```

**Impact** : 🟢 FAIBLE
- Fonctionnalité bonus (intégration Strava)
- Pas dans le scope MVP

**Complexité** : 🔴 ÉLEVÉE (4-6h)
- OAuth 2.0 flow complet
- Gestion tokens, refresh
- Sync données activités

**Recommandation** : 📋 Phase 3 - Backlog (Nice-to-have)

---

### 6. 🟢 PRIORITÉ BASSE - Bouton save email settings
**Fichier** : `src/app/admin/settings/page.tsx`
**Ligne** : 148

**Description** :
```typescript
// Email: Sauvegarder (TODO: ajouter bouton dans UI)
```

**Impact** : 🟢 FAIBLE
- Fonction existe, manque juste bouton UI
- Workaround : save automatique ou autre bouton

**Complexité** : 🟢 FACILE (15min)
- Ajouter un bouton dans l'UI

**Recommandation** : ✅ À traiter maintenant (quick win)

---

### 7. 🟡 PRIORITÉ MOYENNE - Champ lastExpirationEmailSentAt
**Fichier** : `src/lib/cron-license-expiration.ts`
**Ligne** : 217

**Description** :
```typescript
// TODO: Ajouter champ lastExpirationEmailSentAt dans schema License
```

**Impact** : 🟡 MOYEN
- Éviter doublons emails d'expiration
- Améliore la fiabilité du système

**Complexité** : 🟡 MOYENNE (1h)
- Migration Prisma
- Modifier logique cron
- Tester

**Recommandation** : 📋 Phase 2 - Sprint 2.1 (Fiabilité système)

---

### 8. 🟡 PRIORITÉ MOYENNE - Filtrage backend tickets
**Fichier** : `src/hooks/useTicketsData.ts`
**Ligne** : 39

**Description** :
```typescript
// TODO: Idéalement déplacer vers backend pour meilleures performances
```

**Impact** : 🟡 MOYEN
- Optimisation performance
- Actuellement filtrage côté client fonctionne

**Complexité** : 🟡 MOYENNE (1-2h)
- Modifier API route
- Ajouter paramètres query
- Tester

**Recommandation** : 📋 Phase 2 - Sprint 2.2 (Optimisations performance)

---

## 📊 Résumé par priorité

### ✅ À traiter maintenant (Quick Wins - 45min)
1. **Calcul taille DB réelle** (30min) - Impact faible mais facile
2. **Bouton save email settings** (15min) - Impact faible mais facile

### 📋 Phase 2 - Sprint 2.1 (Refactoring - 3-4h)
3. **Support attachments emails** (1-2h) - Amélioration architecture
4. **Champ lastExpirationEmailSentAt** (1h) - Fiabilité système

### 📋 Phase 2 - Sprint 2.2 (Fonctionnalités - 5-7h)
5. **Lookup EAN externe** (2-3h) - UX amélioration
6. **Filtrage backend tickets** (1-2h) - Performance
7. **Filtres vélos** (2-3h) - UX avancée

### 📋 Phase 3 - Backlog (Nice-to-have - 4-6h)
8. **OAuth Strava** (4-6h) - Fonctionnalité bonus

---

## 🎯 Plan d'action recommandé

### Aujourd'hui (Sprint 1.3)
- [x] Analyser et catégoriser les 11 TODOs ✅
- [ ] Traiter les 2 quick wins (45min)
- [ ] Documenter les autres pour Phase 2

### Sprint 2.1 (Semaine 4-5)
- [ ] Support attachments emails
- [ ] Champ lastExpirationEmailSentAt

### Sprint 2.2 (Semaine 5-6)
- [ ] Lookup EAN externe
- [ ] Filtrage backend tickets
- [ ] Filtres vélos

### Phase 3 (Backlog)
- [ ] OAuth Strava (si demandé par client)

---

## 📝 Notes importantes

1. **Aucun TODO critique** : Tous les TODOs sont des améliorations, pas des bugs
2. **Architecture saine** : Les TODOs sont bien documentés et contextualisés
3. **Priorisation claire** : Impact vs Complexité bien évalué
4. **Quick wins disponibles** : 2 TODOs faciles à traiter immédiatement

---

**Date de création** : 25 novembre 2024  
**Statut** : ✅ Analyse complète - 11 TODOs catégorisés

