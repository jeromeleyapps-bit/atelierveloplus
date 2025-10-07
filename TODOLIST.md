# 📋 TODO LIST - Atelier Vélo+

**Dernière mise à jour** : 2025-10-06  
**Statut** : Application fonctionnelle en local ✅

---

## ✅ TERMINÉ (Session actuelle)

### Fonctionnalités Implémentées
- ✅ Migration PostgreSQL complète
- ✅ Système devis/factures professionnel
- ✅ **Page Caisse Espèces** (entrées/sorties, dépenses pro/perso)
- ✅ Recherche clients par nom/prénom
- ✅ Autocomplete clients dans calendrier
- ✅ Widgets statistiques (6 widgets sur 2 lignes)
- ✅ Widget "Total Caisse" dans statistiques
- ✅ Widget "CA Année" dans statistiques
- ✅ Modification et suppression d'entrées caisse
- ✅ Couleur caisse conditionnelle (rouge si négatif)

### Corrections Techniques
- ✅ Schéma Prisma corrigé (champ `address1`)
- ✅ Erreurs TypeScript corrigées
- ✅ Base de données synchronisée
- ✅ Application locale stable

---

## 🔴 CRITIQUE - À FAIRE AVANT PRODUCTION

### Phase 1 : Sécurité (25 minutes) ⚠️

#### 1.1 Désactiver Reset DB (5 min)
**Problème** : La DB est effacée à chaque inscription en dev

**Action** :
```env
# Ajouter dans apps/web/.env
RESET_DB_ON_REGISTER=false
```

**Fichier** : `src/app/api/auth/register/route.ts` ligne 70

---

#### 1.2 Générer Nouveaux Secrets (5 min) 🔑
**Problème** : Secrets identiques et potentiellement faibles

**Action** :
```bash
# Générer 2 secrets différents
openssl rand -base64 32
openssl rand -base64 32
```

**Mettre à jour .env** :
```env
NEXTAUTH_SECRET=<premier secret généré>
AUTH_SECRET=<second secret généré>
```

---

#### 1.3 Configurer Upstash Redis (15 min) 📊
**Problème** : Rate limiting en mémoire (perdu au redémarrage)

**Étapes** :
1. Créer compte gratuit sur https://upstash.com
2. Créer une base Redis
3. Copier REST URL et TOKEN

**Ajouter dans .env** :
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

---

#### 1.4 Implémenter Protection Middleware (2-3 heures) 🔒
**Fichier** : `src/middleware.ts`

**À implémenter** :
- [ ] Protection routes admin
- [ ] Protection API (sauf auth)
- [ ] Vérification session/JWT

---

## 🟡 IMPORTANT - Intégrations

### Phase 2 : Paiements (1-3 jours) 💳

#### 2.1 Intégration Stripe (1-2 jours)
- [ ] Installation : `npm install stripe @stripe/stripe-js`
- [ ] Configuration .env (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET)
- [ ] Créer `src/lib/payments/stripe.ts`
- [ ] Créer `src/app/api/payments/stripe/webhook/route.ts`
- [ ] Créer `src/app/api/payments/stripe/create-intent/route.ts`
- [ ] UI checkout Stripe Elements
- [ ] Enregistrer paiements dans Invoice

---

#### 2.2 Intégration SumUp (1 jour)
- [ ] Installation : `npm install @sumup/sdk`
- [ ] Configuration .env (SUMUP_API_KEY, SUMUP_MERCHANT_CODE)
- [ ] Créer `src/lib/payments/sumup.ts`
- [ ] Créer `src/app/api/payments/sumup/checkout/route.ts`
- [ ] Callback après paiement
- [ ] UI intégration

---

### Phase 3 : Communications HubSpot (2-3 jours) 📧

#### 3.1 Sync Contacts Bidirectionnel (2 jours)
- [ ] Installation : `npm install @hubspot/api-client`
- [ ] Configuration .env (HUBSPOT_API_KEY, HUBSPOT_PORTAL_ID)
- [ ] Créer `src/lib/integrations/hubspot.ts`
- [ ] Créer `src/app/api/integrations/hubspot/sync/route.ts`
- [ ] Créer `src/app/api/integrations/hubspot/webhook/route.ts`
- [ ] Sync Customer → HubSpot Contact
- [ ] Webhook HubSpot → Update Customer
- [ ] Sync WorkOrder → HubSpot Deal

---

#### 3.2 Envoi Emails via HubSpot (1 jour)
- [ ] Créer `src/lib/email.ts`
- [ ] Templates emails HubSpot
- [ ] Envoi factures via HubSpot
- [ ] Tracking ouvertures
- [ ] Envoi SMS (si activé)

---

### Phase 4 : Conformité Fiscale (3-5 jours) 📜

#### 4.1 Clarification Réglementaire
**Questions à résoudre** :
- [ ] Attestation éditeur vs NF525 ?
- [ ] Obligation selon CA ?
- [ ] Certification requise ?

**Ressources** :
- DGFiP (Direction Générale des Finances Publiques)
- Expert-comptable
- Éditeurs certifiés (ex: LNE)

---

#### 4.2 Option A : Implémentation NF525 (si requis) (3-5 jours)
**Exigences** :
- [ ] Inaltérabilité des données (hash chaîné)
- [ ] Sécurisation des données (signature électronique)
- [ ] Conservation des données
- [ ] Archivage

**Fichiers à créer** :
- [ ] `src/lib/compliance/nf525.ts`
- [ ] `src/app/api/compliance/archive/route.ts`

---

#### 4.3 Option B : Attestation Éditeur (alternative) (1 jour)
**Si attestation éditeur suffit** :
- [ ] Documenter processus facturation
- [ ] Prouver inaltérabilité
- [ ] Fournir attestation signée

---

## 🟢 SOUHAITABLE - Optimisations

### Phase 5 : Performance (1-2 jours) 🚀

#### 5.1 Pagination API (1 jour)
**Endpoints prioritaires** :
- [ ] GET /api/customers
- [ ] GET /api/finance/invoices
- [ ] GET /api/catalog/items
- [ ] GET /api/workorders

**Implémentation** : Cursor-based pagination

---

#### 5.2 Monitoring Production (2 heures)
- [ ] Installation Sentry : `npm install @sentry/nextjs`
- [ ] Configuration .env (SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT)
- [ ] Initialisation Sentry
- [ ] Alertes configurées

---

### Phase 6 : Tests & Documentation (2-4 jours) 📊

#### 6.1 Tests E2E avec Playwright (2-3 jours)
- [ ] Installation : `npm install -D @playwright/test`
- [ ] Tests critiques :
  - [ ] Inscription / Connexion
  - [ ] Création client
  - [ ] Création facture
  - [ ] Paiement Stripe
  - [ ] Envoi email

---

#### 6.2 Documentation API (1 jour)
- [ ] Installation Swagger : `npm install swagger-jsdoc swagger-ui-react`
- [ ] Créer `src/app/api/docs/route.ts`
- [ ] Créer `public/swagger.json`
- [ ] Documenter tous les endpoints

---

## 🎬 Phase 7 : Déploiement Production (1 jour)

### 7.1 Checklist Pré-Déploiement
- [ ] Tous les tests passent
- [ ] Variables env production configurées
- [ ] Secrets régénérés
- [ ] Rate limiting actif (Upstash)
- [ ] Monitoring actif (Sentry)
- [ ] Backup DB configuré
- [ ] DNS configuré
- [ ] SSL/HTTPS actif

---

### 7.2 Déploiement Vercel
**Étapes** :
1. [ ] Push code sur GitHub
2. [ ] Importer projet sur Vercel
3. [ ] Configurer variables env
4. [ ] Déployer
5. [ ] Vérifier domaine custom
6. [ ] Tester en production

---

### 7.3 Post-Déploiement
- [ ] Smoke tests
- [ ] Vérifier logs
- [ ] Tester paiements (mode test)
- [ ] Vérifier emails
- [ ] Monitoring actif
- [ ] Alertes configurées

---

## 📅 Timeline Globale

| Semaine | Phase | Tâches | Durée | Statut |
|---------|-------|--------|-------|--------|
| 1 | Sécurité | Middleware, secrets, Redis | 25 min + 3h | ⏳ |
| 2 | Paiements | Stripe + SumUp | 2-3 jours | ⏳ |
| 3 | HubSpot | Sync + Emails | 2-3 jours | ⏳ |
| 4 | Conformité | NF525 / Attestation | 1-5 jours | ⏳ |
| 5 | Optimisation | Pagination + Monitoring | 1-2 jours | ⏳ |
| 6 | Tests | E2E + Documentation | 2-4 jours | ⏳ |
| 7 | Production | Déploiement + Vérification | 1 jour | ⏳ |

**Durée totale estimée** : 7 semaines (temps plein)

---

## 💰 Coûts Estimés (Mensuel)

### Services Gratuits
- ✅ Vercel (Hobby plan)
- ✅ Supabase (Free tier: 500MB DB)
- ✅ Upstash (Free tier: 10K requests/day)
- ✅ Sentry (Free tier: 5K errors/month)

### Services Payants
- 💳 Stripe: 1.4% + 0.25€ par transaction
- 💳 SumUp: 1.39% par transaction
- 📧 HubSpot: À partir de 45€/mois (Starter)

**Budget mensuel estimé** : 50-100€ (hors transactions)

---

## 🎯 Priorités selon Urgence

### CRITIQUE (Avant Production)
1. ⚠️ Désactiver RESET_DB_ON_REGISTER
2. 🔒 Middleware protection
3. 🔑 Nouveaux secrets
4. 📊 Upstash Redis

### IMPORTANT (Semaine 1-2)
5. 💳 Stripe integration
6. 📧 HubSpot emails
7. 🔍 Sentry monitoring

### SOUHAITABLE (Semaine 3-4)
8. 💳 SumUp integration
9. 📜 Conformité fiscale
10. 📊 Pagination API

### OPTIONNEL (Après Production)
11. 📚 Documentation API
12. 🧪 Tests E2E
13. 🎨 UI/UX improvements

---

## 📞 Support & Ressources

### Documentation Intégrations
- [Stripe Docs](https://stripe.com/docs)
- [SumUp API](https://developer.sumup.com)
- [HubSpot API](https://developers.hubspot.com)
- [Upstash Docs](https://docs.upstash.com)

### Conformité Fiscale
- [DGFiP - Logiciels de caisse](https://www.economie.gouv.fr/dgfip)
- [LNE Certification](https://www.lne.fr)

---

## ✅ Prochaine Action Recommandée

**Commencez par Phase 1 : Sécurité (25 min)**

1. Désactiver RESET_DB_ON_REGISTER
2. Générer nouveaux secrets
3. Configurer Upstash Redis

**Puis suivez l'ordre des phases pour un déploiement progressif et sécurisé.**

---

**Dernière mise à jour** : 2025-10-06  
**Statut global** : 🟢 Application fonctionnelle en local | 🟡 Sécurité à renforcer avant production
