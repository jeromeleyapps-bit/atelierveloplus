# 🎯 SPRINT 1.2 - PLAN D'AUGMENTATION COUVERTURE TESTS

**Date** : 25 novembre 2024  
**Objectif** : Augmenter la couverture de 6.9% → 10%  
**Durée estimée** : 1-2 semaines  
**Status** : 🚀 EN COURS

---

## 📊 ÉTAT ACTUEL

### Couverture globale
- **Statements** : 6.9%
- **Branches** : 6.77%
- **Functions** : 5.04%
- **Lines** : 6.96%

### Tests existants
- **Total tests** : 313
- **Tests passent** : 292 (93.3%)
- **Tests échouent** : 18 (5.7%)
- **Tests ignorés** : 3 (1.0%)

---

## 🎯 OBJECTIF : +3.1% DE COUVERTURE

Pour passer de 6.9% à 10%, nous devons ajouter **~3.1% de couverture supplémentaire**.

### Stratégie
1. **Prioriser les fichiers critiques** avec 0% de couverture
2. **Créer des tests simples** pour les fonctions utilitaires
3. **Tester les routes API manquantes** (impact élevé sur la couverture)

---

## 📋 FICHIERS PRIORITAIRES À TESTER

### PRIORITÉ 1 : Routes API critiques (0% couverture) 🔴

Ces fichiers sont critiques pour l'application et ont 0% de couverture :

#### 1. **Gestion des lignes de factures** (Impact : ÉLEVÉ)
- `src/app/api/finance/invoices/[id]/lines/route.ts` (0% - 83 lignes)
- `src/app/api/finance/invoices/[id]/lines/[lineId]/route.ts` (0% - 134 lignes)
- **Tests à créer** :
  - GET : Récupérer les lignes d'une facture
  - POST : Ajouter une ligne à une facture
  - PUT : Modifier une ligne de facture
  - DELETE : Supprimer une ligne de facture
- **Gain estimé** : +0.5% couverture

#### 2. **Gestion des lignes de bons de travail** (Impact : ÉLEVÉ)
- `src/app/api/workorders/[id]/lines/route.ts` (0% - 111 lignes)
- `src/app/api/workorders/[id]/lines/[lineId]/route.ts` (0% - 72 lignes)
- **Tests à créer** :
  - GET : Récupérer les lignes d'un bon de travail
  - POST : Ajouter une ligne à un bon de travail
  - PUT : Modifier une ligne de bon de travail
  - DELETE : Supprimer une ligne de bon de travail
- **Gain estimé** : +0.4% couverture

#### 3. **Middleware et proxy** (Impact : MOYEN)
- `src/middleware.ts` (0% - 192 lignes)
- `src/proxy.ts` (0% - 182 lignes)
- **Tests à créer** :
  - Tests du middleware d'authentification
  - Tests du proxy de requêtes
- **Gain estimé** : +0.8% couverture

### PRIORITÉ 2 : Utilitaires et helpers (0% couverture) 🟡

#### 4. **Fonctions de formatage** (Impact : MOYEN)
- `src/lib/format.ts` - Corriger les 6 tests en échec
- **Tests à corriger** :
  - formatDate, formatDateTime, formatDateLong, formatTime
  - formatPhone
- **Gain estimé** : +0.2% couverture

#### 5. **Autres utilitaires** (Impact : FAIBLE)
- Identifier les fichiers utilitaires avec 0% de couverture
- Créer des tests unitaires simples
- **Gain estimé** : +0.5% couverture

### PRIORITÉ 3 : Routes API secondaires (0% couverture) 🟢

#### 6. **Routes manquantes** (Impact : MOYEN)
- `src/app/api/account/settings/route.ts` (0% - 249 lignes)
- `src/app/api/account/upload-logo/route.ts` (0% - 115 lignes)
- `src/app/api/admin/backup/route.ts` (0% - 514 lignes)
- **Tests à créer** :
  - Tests des routes de paramètres compte
  - Tests d'upload de logo
  - Tests de backup
- **Gain estimé** : +0.7% couverture

---

## 📅 PLAN D'EXÉCUTION

### Semaine 1 : Routes API critiques (Priorité 1)

**Jour 1-2** : Tests lignes de factures
- [ ] Créer `src/__tests__/api/finance-invoices-id-lines.test.ts`
- [ ] Tests GET, POST pour lignes de factures
- [ ] Gain : +0.3%

**Jour 3-4** : Tests lignes de bons de travail
- [ ] Créer `src/__tests__/api/workorders-id-lines.test.ts`
- [ ] Tests GET, POST pour lignes de bons de travail
- [ ] Gain : +0.2%

**Jour 5** : Tests middleware
- [ ] Créer `src/__tests__/middleware.test.ts`
- [ ] Tests authentification, redirections
- [ ] Gain : +0.4%

**Total Semaine 1** : +0.9% couverture (6.9% → 7.8%)

### Semaine 2 : Utilitaires et routes secondaires (Priorité 2 & 3)

**Jour 1** : Correction tests formatage
- [ ] Corriger les 6 tests de `format.test.ts`
- [ ] Examiner `src/lib/format.ts` pour comprendre les erreurs
- [ ] Gain : +0.2%

**Jour 2-3** : Tests routes secondaires
- [ ] Tests routes account/settings
- [ ] Tests routes account/upload-logo
- [ ] Gain : +0.5%

**Jour 4** : Tests utilitaires manquants
- [ ] Identifier autres utilitaires à tester
- [ ] Créer tests unitaires simples
- [ ] Gain : +0.3%

**Jour 5** : Tests proxy et finalisation
- [ ] Tests proxy.ts
- [ ] Vérification couverture globale
- [ ] Gain : +0.3%

**Total Semaine 2** : +1.3% couverture (7.8% → 9.1%)

### Ajustement final

**Semaine 3 (si nécessaire)** : Tests complémentaires
- [ ] Identifier fichiers manquants pour atteindre 10%
- [ ] Créer tests ciblés
- [ ] Gain : +0.9% (9.1% → 10%)

---

## 🎯 LIVRABLES

### À la fin du Sprint 1.2
- ✅ Couverture ≥ 10% (objectif : 10.0%)
- ✅ Tous les tests passent (0 test en échec)
- ✅ Tests pour routes API critiques (lignes factures, lignes bons de travail)
- ✅ Tests middleware d'authentification
- ✅ Tests routes secondaires (account, backup)
- ✅ Correction des 6 tests de formatage en échec

---

## 📊 SUIVI DE PROGRESSION

### Métriques à suivre
- **Couverture globale** : 6.9% → 10%
- **Nombre de tests** : 313 → ~380 tests
- **Tests en échec** : 18 → 0
- **Fichiers avec 0% couverture** : ~150 → ~130

### Commandes de suivi
```bash
# Vérifier la couverture actuelle
npm run test:coverage

# Lancer les tests
npm test

# Lancer un fichier de test spécifique
npm test -- src/__tests__/api/finance-invoices-id-lines.test.ts
```

---

## 🚀 PROCHAINES ÉTAPES APRÈS SPRINT 1.2

### Sprint 1.3 : Qualité code + Tests E2E
- Corriger les 18 tests en échec restants
- Ajouter tests E2E avec Playwright
- Remplacer console.log par logger
- Activer TypeScript strict

### Phase 2 : Optimisations
- Augmenter couverture à 20%
- Réduire taille build
- Optimiser performances

---

**Créé le** : 25 novembre 2024  
**Mis à jour le** : 25 novembre 2024  
**Status** : 🚀 EN COURS - Semaine 1

